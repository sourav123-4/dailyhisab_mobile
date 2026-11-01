// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ai-proxy/*', 'android/*', 'ios/*', 'scratch/*'],
  },
  {
    rules: {
      // React Compiler correctness rules. The compiler is not enabled in this app, and
      // patterns like `useRef(new Animated.Value(0)).current` are correct without it.
      // Promote these to 'error' before turning on `experiments.reactCompiler`.
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // React Native <Text> renders quotes and apostrophes literally; escaping is a DOM concern.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
