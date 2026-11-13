const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 配置 Metro 以正确处理 TypeScript 源文件
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'ts', 'tsx'];

// 3D models (the 3D coach on the buddy tab) are bundled as assets
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'glb'];

// 确保 Metro 可以解析 node_modules 中的 TypeScript 文件
config.resolver.unstable_enablePackageExports = true;

// Clerk's clerk-react package references react-dom; provide a stub for React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-dom': require.resolve('react-dom'),
};

const finalConfig = withNativeWind(config, { input: './global.css' });

// App Store screenshot builds (EXPO_PUBLIC_SCREENSHOT_MODE=1, see
// .github/workflows/screenshots.yml): swap a few modules for the demo-account
// versions in screenshot/. Normal builds never include anything from there.
if (process.env.EXPO_PUBLIC_SCREENSHOT_MODE === '1') {
  const path = require('path');
  const at = (p) => path.join(__dirname, p);
  const swaps = {
    [at('lib/screenshotMode.ts')]: at('screenshot/index.tsx'),
    [at('services/health.ts')]: at('screenshot/health.ts'),
    [at('services/notifications.ts')]: at('screenshot/notifications.ts'),
    [at('lib/revenuecat.ts')]: at('screenshot/revenuecat.ts'),
  };
  const shotDir = at('screenshot') + path.sep;
  const upstream = finalConfig.resolver.resolveRequest;
  finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
    // The demo versions may import the real modules they wrap.
    const fromShot = (context.originModulePath || '').startsWith(shotDir);
    if (!fromShot && (moduleName === '@clerk/clerk-expo' || moduleName === '@clerk/clerk-expo/resource-cache')) {
      return { type: 'sourceFile', filePath: at('screenshot/clerk.tsx') };
    }
    const res = upstream ? upstream(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
    if (!fromShot && res && res.type === 'sourceFile' && swaps[res.filePath]) {
      return { type: 'sourceFile', filePath: swaps[res.filePath] };
    }
    return res;
  };
}

module.exports = finalConfig;


