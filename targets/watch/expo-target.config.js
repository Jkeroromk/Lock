/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'watch',
  name: 'LockWatch',
  displayName: 'Lock',
  bundleIdentifier: '.watchkitapp',
  // Apple Watch Ultra (1st gen) and later run watchOS 10+.
  deploymentTarget: '10.0',
  icon: '../../assets/icons/icon-open-lock.png',
  frameworks: ['HealthKit', 'WatchConnectivity', 'SwiftUI'],
  colors: {
    $accent: '#FFD43B',
  },
  entitlements: {
    'com.apple.developer.healthkit': true,
  },
});
