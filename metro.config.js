const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// 配置 Metro 以正确处理 TypeScript 源文件
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'ts', 'tsx'];

// 确保 Metro 可以解析 node_modules 中的 TypeScript 文件
config.resolver.unstable_enablePackageExports = true;

// Clerk's clerk-react package references react-dom; provide a stub for React Native
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-dom': require.resolve('react-dom'),
};

module.exports = withNativeWind(config, { input: './global.css' });


