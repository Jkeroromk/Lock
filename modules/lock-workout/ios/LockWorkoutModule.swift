import ExpoModulesCore

public class LockWorkoutModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LockWorkout")

    Events("onAction")

    OnCreate {
      WorkoutEngine.shared.activate()
      WorkoutEngine.shared.onAction = { [weak self] in
        self?.sendEvent("onAction", [:])
      }
    }

    OnDestroy {
      WorkoutEngine.shared.onAction = nil
    }

    /// snapshot: JSON of WorkoutSnapshot, or nil when no workout is open.
    /// labels: JSON object of UI strings. ack: highest action seq JS has applied.
    /// reason: "finished" | "discarded" when snapshot is nil.
    Function("sync") { (snapshot: String?, labels: String, ack: Int, reason: String) in
      WorkoutEngine.shared.sync(snapshotJSON: snapshot, labelsJSON: labels, ack: ack, reason: reason)
    }

    /// JSON array of { seq, action } not yet acknowledged.
    Function("getPending") { () -> String in
      WorkoutEngine.shared.pendingJSON()
    }

    Function("isWatchAppInstalled") { () -> Bool in
      WorkoutEngine.shared.isWatchAppInstalled
    }
  }
}
