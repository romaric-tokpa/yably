/**
 * Vérifie ANDROID_HOME / chemin SDK par défaut macOS avant `expo start --android`.
 */
const fs = require('fs');
const path = require('path');

const home = process.env.HOME ?? '';
const defaultSdk = path.join(home, 'Library/Android/sdk');
const androidHome = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? '';
const sdkRoot = androidHome !== '' && fs.existsSync(androidHome) ? androidHome : defaultSdk;

const adb = path.join(sdkRoot, 'platform-tools', 'adb');

if (!fs.existsSync(adb)) {
  console.error(`
[pharmacie-garde] SDK Android introuvable (${sdkRoot}).

1. Installe Android Studio : https://developer.android.com/studio
2. Android Studio → Settings → Languages & Frameworks → Android SDK
   → note le « Android SDK Location » (souvent ~/Library/Android/sdk)
3. Ajoute dans ~/.zshrc puis exécute : source ~/.zshrc

   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools"

4. Redémarre le terminal, lance un émulateur (Device Manager) ou branche un téléphone en USB
   avec « Débogage USB » activé, puis : npm run android

Doc Expo : https://docs.expo.dev/workflow/android-studio-emulator/
`);
  process.exit(1);
}

process.exit(0);
