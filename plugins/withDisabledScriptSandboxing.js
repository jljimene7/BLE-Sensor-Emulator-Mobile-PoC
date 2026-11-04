const { withXcodeProject } = require('expo/config-plugins');

/** React Native's bundle script writes ip.txt into the app bundle, which Xcode's user script sandbox blocks. */
module.exports = function withDisabledScriptSandboxing(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const configuration of Object.values(configurations)) {
      if (configuration && typeof configuration === 'object' && configuration.buildSettings) {
        configuration.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      }
    }
    return config;
  });
};
