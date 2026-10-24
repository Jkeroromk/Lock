// Buttons on the workout Live Activity. This file is compiled into both the
// widget (so the buttons can reference the intents) and the app (where the
// system actually runs LiveActivityIntents, launching the app in the background
// if needed). Only the app can import the LockWorkout engine.

import AppIntents
import Foundation
#if canImport(LockWorkout)
import LockWorkout
#endif

@available(iOS 17.0, *)
struct CompleteSetIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Complete set"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Workout")
  var workoutId: String

  init() {}
  init(workoutId: String) { self.workoutId = workoutId }

  func perform() async throws -> some IntentResult {
    #if canImport(LockWorkout)
    await WorkoutEngine.shared.perform(kind: "complete", workoutId: workoutId)
    #endif
    return .result()
  }
}

@available(iOS 17.0, *)
struct SkipRestIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Skip rest"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Workout")
  var workoutId: String

  init() {}
  init(workoutId: String) { self.workoutId = workoutId }

  func perform() async throws -> some IntentResult {
    #if canImport(LockWorkout)
    await WorkoutEngine.shared.perform(kind: "skipRest", workoutId: workoutId)
    #endif
    return .result()
  }
}

@available(iOS 17.0, *)
struct AddRestIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Add rest time"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Workout")
  var workoutId: String

  @Parameter(title: "Seconds")
  var seconds: Int

  init() {}
  init(workoutId: String, seconds: Int) {
    self.workoutId = workoutId
    self.seconds = seconds
  }

  func perform() async throws -> some IntentResult {
    #if canImport(LockWorkout)
    await WorkoutEngine.shared.perform(kind: "rest", workoutId: workoutId, delta: seconds)
    #endif
    return .result()
  }
}
