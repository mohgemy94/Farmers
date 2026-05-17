import * as ReactNativeWeb from 'react-native-web';

// Define __DEV__ for compatibility with libraries that expect it (like Expo)
if (typeof (globalThis as any).__DEV__ === 'undefined') {
  (globalThis as any).__DEV__ = typeof process !== 'undefined' && process.env ? process.env.NODE_ENV !== 'production' : true;
}

export const TurboModuleRegistry = {
  get: () => null,
  getEnforcing: () => null,
};

export const NativeModules = ReactNativeWeb.NativeModules || {};
export const Platform = ReactNativeWeb.Platform || { OS: 'web' };

export default {
  ...ReactNativeWeb,
  TurboModuleRegistry,
};

// Re-export everything from react-native-web
export * from 'react-native-web';
