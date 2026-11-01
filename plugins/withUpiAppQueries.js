const { withAndroidManifest } = require('expo/config-plugins');

// Android 11+ hides other apps unless they are declared here. Without this the app can neither
// open PhonePe/GPay/Paytm directly nor resolve `upi://pay` links.
const UPI_PACKAGES = [
  'com.phonepe.app',
  'com.google.android.apps.nbu.paisa.user',
  'net.one97.paytm',
  'com.dreamplug.androidapp',
  'in.org.npci.upiapp',
];

module.exports = function withUpiAppQueries(config) {
  return withAndroidManifest(config, mod => {
    const manifest = mod.modResults.manifest;
    const queries = (manifest.queries ??= [{}])[0];
    const packages = (queries.package ??= []);
    UPI_PACKAGES.forEach(name => {
      if (!packages.some(p => p.$['android:name'] === name)) packages.push({ $: { 'android:name': name } });
    });
    const intents = (queries.intent ??= []);
    const hasUpi = intents.some(i => i.data?.some(d => d.$['android:scheme'] === 'upi'));
    if (!hasUpi) {
      intents.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': 'upi' } }],
      });
    }
    return mod;
  });
};
