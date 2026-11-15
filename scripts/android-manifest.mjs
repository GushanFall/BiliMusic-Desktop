// Used by both editions and unit-tested without an SDK or generated project.
export function editionManifest(xml, large = false) {
  xml = xml.replace(/\s*<uses-feature\b[^>]*android:name="(?:android\.software\.leanback|android\.hardware\.touchscreen)"[^>]*\/>/g, '')
    .replace(/\s*<category\s+android:name="android\.intent\.category\.LEANBACK_LAUNCHER"\s*\/>/g, '')
    .replace(/\s*<uses-permission\b(?=[^>]*android:name="android.permission.SYSTEM_ALERT_WINDOW")(?=[^>]*tools:node="remove")[^>]*\/>/g, '')
  if (!large) return xml
  if (!xml.includes('xmlns:tools=')) xml = xml.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ')
  xml = xml.replace(/\s*<application/, '\n<uses-feature android:name="android.software.leanback" android:required="false" />\n<uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove" />\n<application')
  xml = xml.replace(/<application\b[^>]*>/, tag => tag.replace(/\s+android:banner="[^"]*"/g, '').replace('<application', '<application android:banner="@drawable/tv_banner"'))
  xml = xml.replace(/<activity\b[^>]*>/g, tag => /android:name="[^"]*MainActivity"/.test(tag) ? tag.replace(/\s+android:screenOrientation="[^"]*"/g, '').replace('<activity', '<activity android:screenOrientation="sensorLandscape"') : tag)
  xml = xml.replace(/(<category\s+android:name="android\.intent\.category\.LAUNCHER"\s*\/>)/, '$1\n<category android:name="android.intent.category.LEANBACK_LAUNCHER" />')
  return xml
}
