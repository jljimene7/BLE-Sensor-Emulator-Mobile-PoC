Pod::Spec.new do |s|
  s.name = 'SensorBleServer'
  s.version = '1.0.0'
  s.summary = 'Controls sensor BLE peripheral and GATT server.'
  s.description = 'Local Expo module implementing the Conifer sensor BLE protocol.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Conifer Technologies'
  s.homepage = 'https://github.com/jljimene7/automated-stage-control'
  s.source = { :git => 'https://github.com/jljimene7/automated-stage-control.git' }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreBluetooth'
  s.source_files = '*.{h,m,mm,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
