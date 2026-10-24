import ExpoModulesCore

/// Starts the engine at launch, before React Native is up, so a watch message or
/// a Live Activity button that launched the app in the background is handled.
public class LockWorkoutAppDelegate: ExpoAppDelegateSubscriber {
  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    WorkoutEngine.shared.activate()
    return true
  }
}
