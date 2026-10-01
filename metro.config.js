// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// In React Native 0.87+, rn-get-polyfills was moved to @react-native/js-polyfills
config.serializer = {
  ...config.serializer,
  getPolyfills: () => {
    return require('@react-native/js-polyfills')();
  },
};

module.exports = config;
