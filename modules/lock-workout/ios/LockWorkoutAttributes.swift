import Foundation
#if canImport(ActivityKit)
import ActivityKit

// MUST stay identical to targets/live/LockWorkoutAttributes.swift: ActivityKit
// matches the app's and the widget's types by name and shape.
@available(iOS 16.1, *)
public struct LockWorkoutAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var exercise: String
    /// 1-based index of the set "Complete set" ticks; 0 when everything is done.
    public var setIndex: Int
    public var setCount: Int
    /// Formatted weight in `unit`; "" for none.
    public var weight: String
    public var reps: Int
    public var done: Int
    public var total: Int
    public var restStart: Date?
    public var restEnd: Date?
    /// Name of the exercise after this one; "" when none.
    public var next: String
    public var allDone: Bool
    public var finishing: Bool

    public init(exercise: String, setIndex: Int, setCount: Int, weight: String, reps: Int, done: Int, total: Int,
                restStart: Date?, restEnd: Date?, next: String, allDone: Bool, finishing: Bool) {
      self.exercise = exercise
      self.setIndex = setIndex
      self.setCount = setCount
      self.weight = weight
      self.reps = reps
      self.done = done
      self.total = total
      self.restStart = restStart
      self.restEnd = restEnd
      self.next = next
      self.allDone = allDone
      self.finishing = finishing
    }
  }

  public var workoutId: String
  public var title: String
  public var unit: String
  public var startedAt: Date
  /// UI strings in the app's language (see `live` in the i18n files).
  public var labels: [String: String]

  public init(workoutId: String, title: String, unit: String, startedAt: Date, labels: [String: String]) {
    self.workoutId = workoutId
    self.title = title
    self.unit = unit
    self.startedAt = startedAt
    self.labels = labels
  }
}
#endif
