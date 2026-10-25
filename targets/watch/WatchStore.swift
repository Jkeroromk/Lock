import Combine
import Foundation
import WatchConnectivity
import WatchKit

/// The open workout on the watch. Taps apply locally at once (so the watch works
/// with the phone out of reach) and are sent to the phone, which applies the
/// same reducer and sends back its copy. Taps the phone hasn't confirmed yet are
/// replayed on top of whatever it sends.
@MainActor
final class WatchStore: NSObject, ObservableObject {
  static let shared = WatchStore()

  @Published private(set) var snapshot: WorkoutSnapshot?
  @Published private(set) var labels: [String: String] = [:]
  /// How the last workout ended ("finished" / "discarded"), shown on the idle screen.
  @Published private(set) var ended: String?
  @Published private(set) var now = Date()
  /// The phone app can be reached right now.
  @Published private(set) var reachable = false
  /// A finished workout the user dismissed while the phone still has to save it.
  @Published private(set) var hiddenFinishedId: String?

  let health = WorkoutSessionManager()

  private var pending: [WorkoutAction] = []
  private var started = false
  private var clock: Timer?
  private var restAlarm: Timer?
  private var buzzedFor: Double?
  private let defaults = UserDefaults.standard
  private let encoder = JSONEncoder()
  private let decoder = JSONDecoder()
  private var healthSink: AnyCancellable?

  private enum Key {
    static let snapshot = "lock.snapshot"
    static let pending = "lock.pending"
    static let labels = "lock.labels"
  }

  override init() {
    super.init()
    if let d = defaults.data(forKey: Key.snapshot) { snapshot = try? decoder.decode(WorkoutSnapshot.self, from: d) }
    if let d = defaults.data(forKey: Key.pending) { pending = (try? decoder.decode([WorkoutAction].self, from: d)) ?? [] }
    if let d = defaults.data(forKey: Key.labels) { labels = (try? decoder.decode([String: String].self, from: d)) ?? [:] }
    // Re-render when heart rate changes.
    healthSink = health.objectWillChange.sink { [weak self] _ in self?.objectWillChange.send() }
  }

  func start() {
    guard !started else { return }
    started = true
    if WCSession.isSupported() {
      let s = WCSession.default
      s.delegate = self
      s.activate()
    }
    clock = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
      Task { @MainActor in self?.now = Date() }
    }
    afterChange()
  }

  /// The phone opened the app for a workout it just started.
  func phoneStartedWorkout() {
    start()
    health.start(workoutId: snapshot?.id, startDate: Date())
  }

  /// Hides the "Workout finished" screen; the phone saves it when it can.
  func dismissFinished() {
    hiddenFinishedId = snapshot?.id
  }

  func t(_ key: String) -> String {
    if let v = labels[key], !v.isEmpty { return v }
    return WatchStrings.fallback(key)
  }

  // MARK: - Taps

  func send(_ kind: String, ei: Int? = nil, si: Int? = nil, w: Double? = nil, r: Int? = nil, delta: Int? = nil) {
    guard var s = snapshot else { return }
    let action = WorkoutAction(workoutId: s.id, kind: kind, ei: ei, si: si, w: w, r: r, delta: delta)
    guard let resolved = WorkoutReducer.apply(action, to: &s) else {
      WKInterfaceDevice.current().play(.failure)
      return
    }
    snapshot = s
    pending.append(resolved)
    save()
    transmit(resolved)
    WKInterfaceDevice.current().play(kind == "complete" ? .success : .click)
    afterChange()
  }

  private func transmit(_ action: WorkoutAction) {
    guard let data = try? encoder.encode(action) else { return }
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    if session.isReachable {
      session.sendMessage(["action": data], replyHandler: { reply in
        Task { @MainActor in WatchStore.shared.receive(reply) }
      }, errorHandler: { _ in
        session.transferUserInfo(["action": data])
      })
    } else {
      // Queued by the system; delivered when the phone is back in range.
      session.transferUserInfo(["action": data])
    }
  }

  /// Asks the phone for its copy (when the app comes to the front).
  func refresh() {
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    if session.isReachable {
      session.sendMessage(["hello": true], replyHandler: { reply in
        Task { @MainActor in WatchStore.shared.receive(reply) }
      }, errorHandler: nil)
    } else {
      receive(session.receivedApplicationContext)
    }
  }

  // MARK: - From the phone

  func receive(_ payload: [String: Any]) {
    guard !payload.isEmpty else { return }
    if let l = payload["labels"] as? [String: String], !l.isEmpty { labels = l }
    if let d = payload["snapshot"] as? Data, let phone = try? decoder.decode(WorkoutSnapshot.self, from: d) {
      var merged = phone
      pending = pending.filter { $0.workoutId == phone.id && !phone.applied.contains($0.id) }
      // Replay taps the phone hasn't seen; drop the ones that no longer apply.
      pending = pending.filter { WorkoutReducer.apply($0, to: &merged) != nil }
      snapshot = merged
      ended = nil
    } else if payload["ended"] != nil {
      if snapshot != nil {
        let reason = payload["ended"] as? String ?? ""
        ended = reason.isEmpty ? "finished" : reason
      }
      snapshot = nil
      pending = []
    }
    save()
    afterChange()
  }

  // MARK: - Side effects

  private func afterChange() {
    // Workout session follows the Lock workout.
    if let s = snapshot, !s.finishing {
      health.start(workoutId: s.id, startDate: Date(timeIntervalSince1970: s.startedAt / 1000))
    } else if let s = snapshot, s.finishing {
      health.end(save: true)
    } else if health.running {
      health.end(save: ended != "discarded")
    }
    scheduleRestAlarm()
  }

  private func scheduleRestAlarm() {
    restAlarm?.invalidate()
    restAlarm = nil
    guard let ends = snapshot?.restEndsAt, buzzedFor != ends else { return }
    let delay = ends / 1000 - Date().timeIntervalSince1970
    guard delay > 0 else { return }
    restAlarm = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
      Task { @MainActor in
        guard let self, self.snapshot?.restEndsAt == ends else { return }
        self.buzzedFor = ends
        WKInterfaceDevice.current().play(.notification)
        self.now = Date()
      }
    }
  }

  private func save() {
    if let s = snapshot, let d = try? encoder.encode(s) { defaults.set(d, forKey: Key.snapshot) } else { defaults.removeObject(forKey: Key.snapshot) }
    if let d = try? encoder.encode(pending) { defaults.set(d, forKey: Key.pending) }
    if let d = try? encoder.encode(labels) { defaults.set(d, forKey: Key.labels) }
  }
}

extension WatchStore: WCSessionDelegate {
  nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    guard activationState == .activated else { return }
    let context = session.receivedApplicationContext
    let r = session.isReachable
    Task { @MainActor in
      WatchStore.shared.reachable = r
      WatchStore.shared.receive(context)
      // Resend taps made while the session was down.
      for a in WatchStore.shared.pending { WatchStore.shared.transmit(a) }
      WatchStore.shared.refresh()
    }
  }

  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    let r = session.isReachable
    Task { @MainActor in
      WatchStore.shared.reachable = r
      if r { WatchStore.shared.refresh() }
    }
  }

  nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    Task { @MainActor in WatchStore.shared.receive(applicationContext) }
  }

  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    Task { @MainActor in WatchStore.shared.receive(message) }
  }
}
