import Foundation
import HealthKit

/// Runs an HKWorkoutSession while a Lock workout is open: keeps Lock on screen
/// when you raise your wrist, reads heart rate and active energy, and saves the
/// strength workout to Apple Health at the end.
@MainActor
final class WorkoutSessionManager: NSObject, ObservableObject {
  @Published private(set) var heartRate: Int = 0
  @Published private(set) var calories: Int = 0
  @Published private(set) var running = false

  /// The Lock workout this session belongs to; nil while it was started by the
  /// phone and the workout hasn't arrived yet.
  private(set) var workoutId: String?

  private let store = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?
  private var saveOnEnd = true
  private var ending = false

  private var shareTypes: Set<HKSampleType> { [HKObjectType.workoutType()] }
  private var readTypes: Set<HKObjectType> {
    [HKQuantityType(.heartRate), HKQuantityType(.activeEnergyBurned)]
  }

  private func authorize() async -> Bool {
    guard HKHealthStore.isHealthDataAvailable() else { return false }
    do {
      try await store.requestAuthorization(toShare: shareTypes, read: readTypes)
      return store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
    } catch {
      return false
    }
  }

  /// Starts a session unless one is running. `workoutId` nil = started by the
  /// phone before the workout details arrived.
  func start(workoutId: String?, startDate: Date) {
    if session != nil {
      if self.workoutId == nil { self.workoutId = workoutId }
      return
    }
    self.workoutId = workoutId
    let config = HKWorkoutConfiguration()
    config.activityType = .traditionalStrengthTraining
    config.locationType = .indoor
    do {
      let s = try HKWorkoutSession(healthStore: store, configuration: config)
      let b = s.associatedWorkoutBuilder()
      b.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
      s.delegate = self
      b.delegate = self
      session = s
      builder = b
      saveOnEnd = true
      ending = false
      // Back-date to when the workout began on the phone (but not into the far past).
      let begin = max(startDate, Date().addingTimeInterval(-3 * 3600))
      s.startActivity(with: begin)
      b.beginCollection(withStart: begin) { _, _ in }
      running = true
    } catch {
      session = nil
      builder = nil
      // Usually missing Health permission: ask, then try once more.
      Task {
        if await self.authorize(), self.session == nil { self.start(workoutId: workoutId, startDate: startDate) }
      }
    }
  }

  /// Ends the session. save = false discards it (workout discarded on the phone).
  func end(save: Bool) {
    guard let s = session, !ending else { return }
    ending = true
    saveOnEnd = save
    s.end()
  }

  private func finish(at date: Date) {
    guard let b = builder else { return reset() }
    let save = saveOnEnd
    b.endCollection(withEnd: date) { [weak self] _, _ in
      if save {
        b.finishWorkout { _, _ in Task { @MainActor in self?.reset() } }
      } else {
        b.discardWorkout()
        Task { @MainActor in self?.reset() }
      }
    }
  }

  private func reset() {
    session = nil
    builder = nil
    workoutId = nil
    ending = false
    running = false
    heartRate = 0
    calories = 0
  }
}

extension WorkoutSessionManager: HKWorkoutSessionDelegate {
  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
                                  from fromState: HKWorkoutSessionState, date: Date) {
    guard toState == .ended else { return }
    Task { @MainActor in self.finish(at: date) }
  }

  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    Task { @MainActor in self.reset() }
  }
}

extension WorkoutSessionManager: HKLiveWorkoutBuilderDelegate {
  nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
    var bpm: Double?
    var kcal: Double?
    if let hr = workoutBuilder.statistics(for: HKQuantityType(.heartRate))?.mostRecentQuantity() {
      bpm = hr.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
    }
    if let e = workoutBuilder.statistics(for: HKQuantityType(.activeEnergyBurned))?.sumQuantity() {
      kcal = e.doubleValue(for: .kilocalorie())
    }
    Task { @MainActor in
      if let bpm { self.heartRate = Int(bpm.rounded()) }
      if let kcal { self.calories = Int(kcal.rounded()) }
    }
  }
}
