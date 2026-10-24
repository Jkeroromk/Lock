// WorkoutModel.swift
//
// The workout as the Live Activity, the iPhone engine and the Apple Watch see it,
// plus the one reducer they all use to change it. The JS store mirrors the same
// rules in `applyRemote` (store/useWorkoutStore.ts).
//
// Two identical copies exist:
//   modules/lock-workout/ios/WorkoutModel.swift   (iPhone)
//   targets/watch/WorkoutModel.swift              (Apple Watch)
// Edit this one, then run `node scripts/sync-watch-model.mjs`. CI fails if they differ.

import Foundation

public struct WSet: Codable, Equatable {
  /// Weight in the workout's unit (kg or lb). 0 = none / bodyweight only.
  public var w: Double
  /// Reps. 0 = not set yet.
  public var r: Int
  public var done: Bool

  public init(w: Double, r: Int, done: Bool) {
    self.w = w
    self.r = r
    self.done = done
  }
}

public struct WExercise: Codable, Equatable {
  public var id: String
  public var name: String
  /// Bodyweight exercise: the weight is extra load and may stay 0.
  public var bw: Bool
  public var sets: [WSet]
}

public struct WorkoutSnapshot: Codable, Equatable {
  public var id: String
  public var title: String
  /// Epoch ms.
  public var startedAt: Double
  /// "kg" or "lb".
  public var unit: String
  public var current: Int
  public var exercises: [WExercise]
  /// Epoch ms when the rest ends; nil when not resting.
  public var restEndsAt: Double?
  /// Length of the running rest, seconds.
  public var restTotal: Int
  /// Default rest length for the next set, seconds.
  public var restSec: Int
  /// Ids of actions already folded in (newest last, at most 64).
  public var applied: [String]
  /// "Finish workout" was tapped away from the phone; the app saves it next time it runs.
  public var finishing: Bool

  public var totalSets: Int { exercises.reduce(0) { $0 + $1.sets.count } }
  public var doneSets: Int { exercises.reduce(0) { $0 + $1.sets.filter(\.done).count } }
  public var allDone: Bool { totalSets > 0 && doneSets == totalSets }

  /// The set "Complete set" would tick: the first open set of the current
  /// exercise, else of the exercises after it, else of the ones before it.
  public var nextOpen: (ei: Int, si: Int)? {
    guard !exercises.isEmpty else { return nil }
    let start = min(max(current, 0), exercises.count - 1)
    for k in 0..<exercises.count {
      let ei = (start + k) % exercises.count
      if let si = exercises[ei].sets.firstIndex(where: { !$0.done }) { return (ei, si) }
    }
    return nil
  }
}

public struct WFill: Codable, Equatable {
  public var si: Int
  public var w: Double?
  public var r: Int?
}

/// Something done on the Live Activity or the watch.
/// kind: complete | uncomplete | rest | skipRest | select | finish
public struct WorkoutAction: Codable, Equatable {
  public var id: String
  public var workoutId: String
  public var kind: String
  public var ei: Int?
  public var si: Int?
  public var w: Double?
  public var r: Int?
  /// Seconds, for kind == "rest".
  public var delta: Int?
  /// Epoch ms when it happened.
  public var at: Double

  // Filled in by the reducer, so every copy applies exactly the same change.
  public var restEndsAt: Double?
  public var restTotal: Int?
  public var current: Int?
  /// Later open sets of the same exercise that took the new weight / reps.
  public var fill: [WFill]?

  public init(id: String = UUID().uuidString, workoutId: String, kind: String, ei: Int? = nil, si: Int? = nil,
              w: Double? = nil, r: Int? = nil, delta: Int? = nil, at: Double = Date().timeIntervalSince1970 * 1000) {
    self.id = id
    self.workoutId = workoutId
    self.kind = kind
    self.ei = ei
    self.si = si
    self.w = w
    self.r = r
    self.delta = delta
    self.at = at
  }
}

public enum WorkoutReducer {
  /// Applies `action` to `s`. Returns the action with the resolved fields set,
  /// or nil when it doesn't apply (other workout, nothing left to tick, …).
  /// Applying an action whose id is already in `s.applied` is a no-op.
  @discardableResult
  public static func apply(_ action: WorkoutAction, to s: inout WorkoutSnapshot) -> WorkoutAction? {
    guard action.workoutId == s.id, !s.applied.contains(action.id) else { return nil }
    var a = action

    switch a.kind {
    case "complete":
      // A named set must still be open (someone may have ticked it elsewhere);
      // without one, tick the next open set.
      var target: (ei: Int, si: Int)?
      if let ei = a.ei, let si = a.si {
        guard s.exercises.indices.contains(ei), s.exercises[ei].sets.indices.contains(si),
              !s.exercises[ei].sets[si].done else { return nil }
        target = (ei, si)
      } else {
        target = s.nextOpen
      }
      guard let (ei, si) = target else { return nil }
      let old = s.exercises[ei].sets[si]
      let w = max(0, a.w ?? old.w)
      let r = min(999, max(0, a.r ?? old.r))
      guard r >= 1 else { return nil }

      // A changed weight / rep count carries over to the later open sets that
      // still had the old value.
      var fill: [WFill] = []
      if w != old.w || r != old.r {
        for k in (si + 1)..<max(si + 1, s.exercises[ei].sets.count) {
          let later = s.exercises[ei].sets[k]
          if later.done { continue }
          var f = WFill(si: k, w: nil, r: nil)
          if w != old.w && later.w == old.w { f.w = w; s.exercises[ei].sets[k].w = w }
          if r != old.r && later.r == old.r { f.r = r; s.exercises[ei].sets[k].r = r }
          if f.w != nil || f.r != nil { fill.append(f) }
        }
      }
      s.exercises[ei].sets[si] = WSet(w: w, r: r, done: true)

      if s.allDone {
        s.restEndsAt = nil
      } else {
        s.restEndsAt = a.at + Double(s.restSec) * 1000
        s.restTotal = s.restSec
      }
      // Finished this exercise: move on to the next one with open sets.
      s.current = ei
      if !s.exercises[ei].sets.contains(where: { !$0.done }), let next = s.nextOpen {
        s.current = next.ei
      }
      a.ei = ei
      a.si = si
      a.w = w
      a.r = r
      a.fill = fill.isEmpty ? nil : fill

    case "uncomplete":
      guard let ei = a.ei, let si = a.si, s.exercises.indices.contains(ei), s.exercises[ei].sets.indices.contains(si),
            s.exercises[ei].sets[si].done else { return nil }
      s.exercises[ei].sets[si].done = false
      s.restEndsAt = nil
      s.current = ei

    case "rest":
      guard let ends = s.restEndsAt, let delta = a.delta else { return nil }
      let remaining = max(0, ends - a.at) + Double(delta) * 1000
      let total = min(600, max(15, s.restTotal + delta))
      s.restTotal = total
      s.restSec = total
      s.restEndsAt = remaining > 0 ? a.at + remaining : nil

    case "skipRest":
      guard s.restEndsAt != nil else { return nil }
      s.restEndsAt = nil

    case "select":
      guard let ei = a.ei, s.exercises.indices.contains(ei) else { return nil }
      s.current = ei

    case "finish":
      s.finishing = true
      s.restEndsAt = nil

    default:
      return nil
    }

    a.restEndsAt = s.restEndsAt
    a.restTotal = s.restTotal
    a.current = s.current
    s.applied.append(a.id)
    if s.applied.count > 64 { s.applied.removeFirst(s.applied.count - 64) }
    return a
  }
}

public enum WorkoutFormat {
  /// 60 → "60", 62.5 → "62.5", 22.25 → "22.25".
  public static func weight(_ w: Double) -> String {
    let v = (w * 100).rounded() / 100
    if v == v.rounded() { return String(Int(v)) }
    var s = String(format: "%.2f", v)
    while s.hasSuffix("0") { s.removeLast() }
    if s.hasSuffix(".") { s.removeLast() }
    return s
  }

  /// Replaces {key} placeholders.
  public static func fill(_ template: String, _ values: [String: String]) -> String {
    var out = template
    for (k, v) in values { out = out.replacingOccurrences(of: "{\(k)}", with: v) }
    return out
  }
}
