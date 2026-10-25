Pod::Spec.new do |s|
  s.name           = 'LockWorkout'
  s.version        = '1.0.0'
  s.summary        = 'Workout engine for the Lock Live Activity and Apple Watch app'
  s.description    = 'Keeps the open workout natively and syncs it with the Live Activity and the watch.'
  s.author         = 'Lock'
  s.homepage       = 'https://lock.jkeroro.com'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'WatchConnectivity', 'UserNotifications', 'HealthKit'
  s.weak_frameworks = 'ActivityKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
