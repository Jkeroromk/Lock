import HealthKit
import SwiftUI
import WatchKit

@main
struct LockWatchApp: App {
  @WKApplicationDelegateAdaptor(LockWatchDelegate.self) private var delegate
  @ObservedObject private var store = WatchStore.shared
  @Environment(\.scenePhase) private var phase

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(store)
        .onAppear { store.start() }
    }
    .onChange(of: phase) { _, p in
      if p == .active { store.refresh() }
    }
  }
}

final class LockWatchDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    Task { @MainActor in WatchStore.shared.start() }
  }

  /// The phone launched us with `startWatchApp` because a workout began there.
  func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
    Task { @MainActor in WatchStore.shared.phoneStartedWorkout() }
  }
}
