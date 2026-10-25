// WorkoutEngine.swift
//
// Keeps the open workout on the native side so it can change while React
// Native isn't running: the Live Activity buttons (App Intents run in the app's
// process, often launched in the background) and the Apple Watch both go
// through `perform`. Every change is queued for JS, which applies it to the
// workout store and acknowledges it on its next `sync`.

import Foundation
import UIKit
import UserNotifications
import WatchConnectivity
#if canImport(ActivityKit)
import ActivityKit
#endif
#if canImport(HealthKit)
import HealthKit
#endif

struct PendingAction: Codable {
  var seq: Int
  var action: WorkoutAction
}

public final class WorkoutEngine: NSObject {
  public static let shared = WorkoutEngine()

  private let defaults = UserDefaults.standard
  private let encoder = JSONEncoder()
  private let decoder = JSONDecoder()
  private let lock = NSLock()

  private var snapshot: WorkoutSnapshot?
  private var labels: [String: String] = [:]
  private var pending: [PendingAction] = []
  private var seq = 0
  private var endReason = ""
  private var watchStartedFor = ""
  private var session: WCSession?
  private var activated = false
  private var finishTask: UIBackgroundTaskIdentifier = .invalid
  #if canImport(HealthKit)
  private lazy var healthStore = HKHealthStore()
  #endif

  /// Set by the Expo module: tells JS there are actions to pull.
  var onAction: (() -> Void)?

  private enum Key {
    static let snapshot = "lockWorkout.snapshot"
    static let labels = "lockWorkout.labels"
    static let pending = "lockWorkout.pending"
    static let seq = "lockWorkout.seq"
    static let watchStartedFor = "lockWorkout.watchStartedFor"
  }

  private override init() {
    super.init()
    if let d = defaults.data(forKey: Key.snapshot) { snapshot = try? decoder.decode(WorkoutSnapshot.self, from: d) }
    if let d = defaults.data(forKey: Key.labels) { labels = (try? decoder.decode([String: String].self, from: d)) ?? [:] }
    if let d = defaults.data(forKey: Key.pending) { pending = (try? decoder.decode([PendingAction].self, from: d)) ?? [] }
    seq = defaults.integer(forKey: Key.seq)
    watchStartedFor = defaults.string(forKey: Key.watchStartedFor) ?? ""
  }

  /// Called at launch (AppDelegate subscriber) and when the module loads.
  public func activate() {
    onMain {
      guard !self.activated else { return }
      self.activated = true
      if WCSession.isSupported() {
        let s = WCSession.default
        s.delegate = self
        s.activate()
        self.session = s
      }
    }
  }

  // MARK: - From JS

  /// The workout as JS sees it (nil = none open), plus the highest action seq
  /// JS has applied. Unacknowledged actions are replayed on top.
  func sync(snapshotJSON: String?, labelsJSON: String, ack: Int, reason: String) {
    let incoming = snapshotJSON.flatMap { try? decoder.decode(WorkoutSnapshot.self, from: Data($0.utf8)) }
    let newLabels = try? decoder.decode([String: String].self, from: Data(labelsJSON.utf8))
    onMain {
      if let newLabels, !newLabels.isEmpty { self.labels = newLabels }
      self.lock.lock()
      self.pending.removeAll { $0.seq <= ack }
      let replay = self.pending
      self.lock.unlock()

      if var s = incoming {
        if let cur = self.snapshot, cur.id == s.id {
          let replayIds = Set(replay.map(\.action.id))
          s.applied = cur.applied.filter { !replayIds.contains($0) }
          s.finishing = s.finishing || cur.finishing
        }
        for p in replay { WorkoutReducer.apply(p.action, to: &s) }
        self.snapshot = s
        self.startWatchAppIfNeeded(for: s)
      } else {
        if self.snapshot != nil { self.endReason = reason.isEmpty ? "discarded" : reason }
        self.snapshot = nil
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["lock-save"])
        center.removeDeliveredNotifications(withIdentifiers: ["lock-save"])
        self.lock.lock()
        self.pending.removeAll()
        self.lock.unlock()
      }
      self.save()
      self.publish()
      if self.snapshot == nil {
        // Give the watch update a moment to go out before iOS may suspend us.
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { self.endFinishTask() }
      }
    }
  }

  func pendingJSON() -> String {
    lock.lock()
    defer { lock.unlock() }
    guard let d = try? encoder.encode(pending) else { return "[]" }
    return String(decoding: d, as: UTF8.self)
  }

  var isWatchAppInstalled: Bool {
    guard let s = session, s.activationState == .activated else { return false }
    return s.isPaired && s.isWatchAppInstalled
  }

  // MARK: - From the Live Activity and the watch

  /// For the Live Activity intents: applies the action and waits until the
  /// Live Activity shows it, since the app may be suspended right after.
  @MainActor
  public func perform(kind: String, workoutId: String, delta: Int? = nil) async {
    perform(WorkoutAction(workoutId: workoutId, kind: kind, delta: delta))
    #if canImport(ActivityKit)
    if #available(iOS 16.2, *), let s = snapshot,
       let a = Activity<LockWorkoutAttributes>.activities.first(where: { $0.attributes.workoutId == s.id }) {
      let stale = s.restEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) }
      await a.update(ActivityContent(state: contentState(s), staleDate: stale))
    }
    #endif
  }

  public func perform(_ action: WorkoutAction) {
    onMain {
      guard var s = self.snapshot else {
        self.pushToWatch()
        return
      }
      guard let resolved = WorkoutReducer.apply(action, to: &s) else {
        // Already applied or no longer applies: resend so the sender catches up.
        self.pushToWatch()
        return
      }
      self.snapshot = s
      self.lock.lock()
      self.seq += 1
      self.pending.append(PendingAction(seq: self.seq, action: resolved))
      self.lock.unlock()
      self.save()
      self.publish()
      if resolved.kind == "finish" { self.finishRequested() }
      self.onAction?()
    }
  }

  /// "Finish workout" on the watch: saving happens in JS (network + sign-in), so
  /// ask iOS for background time to let it run, and if it hasn't been saved
  /// shortly, remind the user to open the app.
  private func finishRequested() {
    if finishTask == .invalid {
      finishTask = UIApplication.shared.beginBackgroundTask(withName: "lock.finishWorkout") { [weak self] in
        self?.endFinishTask()
      }
    }
    let content = UNMutableNotificationContent()
    content.title = label("finishedOnWatch", "Workout finished on your watch")
    content.body = label("openToSave", "Open Lock to save")
    content.sound = .default
    let request = UNNotificationRequest(
      identifier: "lock-save", content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: 25, repeats: false))
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }

  private func endFinishTask() {
    guard finishTask != .invalid else { return }
    UIApplication.shared.endBackgroundTask(finishTask)
    finishTask = .invalid
  }

  // MARK: - Fan out

  private func publish() {
    updateLiveActivity()
    pushToWatch()
    scheduleRestNotification()
  }

  private func save() {
    if let s = snapshot, let d = try? encoder.encode(s) { defaults.set(d, forKey: Key.snapshot) } else { defaults.removeObject(forKey: Key.snapshot) }
    if let d = try? encoder.encode(labels) { defaults.set(d, forKey: Key.labels) }
    lock.lock()
    let p = pending
    let n = seq
    lock.unlock()
    if let d = try? encoder.encode(p) { defaults.set(d, forKey: Key.pending) }
    defaults.set(n, forKey: Key.seq)
    defaults.set(watchStartedFor, forKey: Key.watchStartedFor)
  }

  private func label(_ key: String, _ fallback: String) -> String {
    labels[key].flatMap { $0.isEmpty ? nil : $0 } ?? fallback
  }

  // MARK: Live Activity

  #if canImport(ActivityKit)
  @available(iOS 16.2, *)
  private func contentState(_ s: WorkoutSnapshot) -> LockWorkoutAttributes.ContentState {
    let target = s.nextOpen
    let ei = target?.ei ?? min(max(s.current, 0), max(0, s.exercises.count - 1))
    let ex = s.exercises.indices.contains(ei) ? s.exercises[ei] : nil
    let set = target.flatMap { t in ex?.sets.indices.contains(t.si) == true ? ex?.sets[t.si] : nil }
    var next = ""
    if s.exercises.count > 1 {
      for k in 1..<s.exercises.count {
        let j = (ei + k) % s.exercises.count
        if s.exercises[j].sets.contains(where: { !$0.done }) { next = s.exercises[j].name; break }
      }
    }
    let restEnd = s.restEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    return LockWorkoutAttributes.ContentState(
      exercise: ex?.name ?? s.title,
      setIndex: target.map { $0.si + 1 } ?? 0,
      setCount: ex?.sets.count ?? 0,
      weight: (set?.w ?? 0) > 0 ? WorkoutFormat.weight(set!.w) : "",
      reps: set?.r ?? 0,
      done: s.doneSets,
      total: s.totalSets,
      restStart: restEnd.map { $0.addingTimeInterval(-Double(max(1, s.restTotal))) },
      restEnd: restEnd,
      next: next,
      allDone: s.allDone,
      finishing: s.finishing
    )
  }
  #endif

  private func updateLiveActivity() {
    #if canImport(ActivityKit)
    guard #available(iOS 16.2, *) else { return }
    let activities = Activity<LockWorkoutAttributes>.activities
    guard let s = snapshot else {
      for a in activities { Task { await a.end(nil, dismissalPolicy: .immediate) } }
      return
    }
    let state = contentState(s)
    let stale = s.restEndsAt.map { Date(timeIntervalSince1970: $0 / 1000) }
    let content = ActivityContent(state: state, staleDate: stale)
    for a in activities where a.attributes.workoutId != s.id {
      Task { await a.end(nil, dismissalPolicy: .immediate) }
    }
    if let a = activities.first(where: { $0.attributes.workoutId == s.id }) {
      Task { await a.update(content) }
    } else if ActivityAuthorizationInfo().areActivitiesEnabled {
      let attrs = LockWorkoutAttributes(
        workoutId: s.id, title: s.title, unit: s.unit,
        startedAt: Date(timeIntervalSince1970: s.startedAt / 1000), labels: labels)
      // Starting needs the app in the foreground; if that fails, the next sync retries.
      _ = try? Activity.request(attributes: attrs, content: content, pushType: nil)
    }
    #endif
  }

  // MARK: Rest notification

  private func scheduleRestNotification() {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: ["lock-rest"])
    guard let s = snapshot, let ends = s.restEndsAt else {
      center.removeDeliveredNotifications(withIdentifiers: ["lock-rest"])
      return
    }
    let delay = ends / 1000 - Date().timeIntervalSince1970
    guard delay > 1 else { return }
    // The watch app buzzes by itself while it's open.
    if let w = session, w.activationState == .activated, w.isReachable { return }

    let content = UNMutableNotificationContent()
    content.title = label("restOver", "Rest's up")
    if let t = s.nextOpen {
      let ex = s.exercises[t.ei]
      let set = ex.sets[t.si]
      var parts = [ex.name, WorkoutFormat.fill(label("setOf", "Set {i}/{n}"), ["i": "\(t.si + 1)", "n": "\(ex.sets.count)"])]
      if set.w > 0 { parts.append("\(WorkoutFormat.weight(set.w)) \(s.unit) × \(set.r)") } else if set.r > 0 { parts.append("× \(set.r)") }
      content.body = parts.joined(separator: " · ")
    }
    content.sound = .default
    content.threadIdentifier = "lock-rest"
    let request = UNNotificationRequest(
      identifier: "lock-rest", content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false))
    center.add(request, withCompletionHandler: nil)
  }

  // MARK: Watch

  private func watchPayload() -> [String: Any] {
    var payload: [String: Any] = ["v": 1, "labels": labels, "sent": Date().timeIntervalSince1970]
    if let s = snapshot, let d = try? encoder.encode(s) {
      payload["snapshot"] = d
    } else {
      payload["ended"] = endReason
    }
    return payload
  }

  private func pushToWatch() {
    guard let w = session, w.activationState == .activated, w.isPaired, w.isWatchAppInstalled else { return }
    let payload = watchPayload()
    try? w.updateApplicationContext(payload)
    if w.isReachable { w.sendMessage(payload, replyHandler: nil, errorHandler: nil) }
  }

  /// Opens Lock on the watch when a workout starts on the phone, so the watch
  /// app can run a workout session (heart rate, stays on screen).
  private func startWatchAppIfNeeded(for s: WorkoutSnapshot) {
    guard watchStartedFor != s.id else { return }
    watchStartedFor = s.id
    // Don't pop the watch app for a workout that was started long ago.
    guard Date().timeIntervalSince1970 * 1000 - s.startedAt < 10 * 60 * 1000 else { return }
    guard let w = session, w.activationState == .activated, w.isPaired, w.isWatchAppInstalled else { return }
    #if canImport(HealthKit)
    guard HKHealthStore.isHealthDataAvailable() else { return }
    let config = HKWorkoutConfiguration()
    config.activityType = .traditionalStrengthTraining
    config.locationType = .indoor
    healthStore.startWatchApp(with: config) { _, _ in }
    #endif
  }

  private func handleIncoming(_ message: [String: Any]) {
    if let d = message["action"] as? Data, let action = try? decoder.decode(WorkoutAction.self, from: d) {
      perform(action)
    } else if let list = message["actions"] as? [Data] {
      for d in list {
        if let action = try? decoder.decode(WorkoutAction.self, from: d) { perform(action) }
      }
    } else {
      onMain { self.pushToWatch() }
    }
  }

  private func onMain(_ work: @escaping () -> Void) {
    if Thread.isMainThread { work() } else { DispatchQueue.main.async(execute: work) }
  }
}

extension WorkoutEngine: WCSessionDelegate {
  public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    onMain {
      if activationState == .activated { self.pushToWatch() }
    }
  }

  public func sessionDidBecomeInactive(_ session: WCSession) {}

  public func sessionDidDeactivate(_ session: WCSession) {
    // The user switched watches: reactivate for the new one.
    session.activate()
  }

  public func sessionWatchStateDidChange(_ session: WCSession) {
    onMain { self.pushToWatch() }
  }

  public func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handleIncoming(message)
  }

  public func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    handleIncoming(message)
    onMain { replyHandler(self.watchPayload()) }
  }

  public func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    handleIncoming(userInfo)
  }
}
