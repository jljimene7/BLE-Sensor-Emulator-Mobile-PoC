const { withXcodeProject } = require('expo/config-plugins');

/** Keeps Expo's generated React Native script executable when the project path contains spaces. */
module.exports = function withQuotedIosBundleScript(config) {
  return withXcodeProject(config, (config) => {
    const phases = config.modResults.hash.project.objects.PBXShellScriptBuildPhase || {};
    for (const phase of Object.values(phases)) {
      if (!phase || typeof phase !== 'object' || typeof phase.shellScript !== 'string') continue;
      const script = JSON.parse(phase.shellScript);
      // Quote the resolved script path as one command instead of letting the shell split it.
      const quoted = script.replace(
        /^`("\$NODE_BINARY" --print .+react-native-xcode\.sh.+)`$/m,
        '"$($1)"',
      );
      if (quoted !== script) phase.shellScript = JSON.stringify(quoted);
    }
    return config;
  });
};
