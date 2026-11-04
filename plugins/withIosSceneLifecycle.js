const fs = require('fs');
const path = require('path');
const { withInfoPlist, withDangerousMod } = require('expo/config-plugins');

/**
 * iOS 27 aborts apps that do not adopt the UIScene life cycle. Expo's EXExpoAppSceneDelegate
 * creates the window and starts React Native, so the AppDelegate must only create the factory.
 */
module.exports = function withIosSceneLifecycle(config) {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  return withDangerousMod(config, [
    'ios',
    (config) => {
      const file = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName,
        'AppDelegate.swift',
      );
      let source = fs.readFileSync(file, 'utf8');

      source = source.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
      source = source.replace(
        /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?launchOptions: launchOptions\)\n#endif\n\n?/,
        '',
      );

      fs.writeFileSync(file, source);
      return config;
    },
  ]);
};
