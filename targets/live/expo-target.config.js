/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'LockLive',
  displayName: 'Lock',
  bundleIdentifier: '.liveactivity',
  // Interactive Live Activity buttons and the watch Smart Stack layout need iOS 18.
  deploymentTarget: '18.0',
  frameworks: ['ActivityKit', 'AppIntents', 'SwiftUI', 'WidgetKit'],
  colors: {
    $accent: '#FFD43B',
    $widgetBackground: '#0A0A0A',
  },
});
