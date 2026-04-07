/**
 * Avec SDK + adb : `expo start --android` (émulateur / USB).
 * Sans SDK : `expo start` pour ouvrir le projet dans Expo Go via QR (téléphone).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const home = process.env.HOME ?? '';
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(home, 'Library/Android/sdk');
const adb = path.join(sdk, 'platform-tools', 'adb');
const hasAdb = fs.existsSync(adb);

if (!hasAdb) {
  console.log(`
[pharmacie-garde] Aucun SDK Android sur ce Mac — mode Expo Go (ton téléphone).

  • Ouvre Expo Go et scanne le QR affiché (téléphone et Mac sur le même Wi‑Fi).
  • Ne touche pas à la touche « a » dans le terminal : sans SDK, ça lance adb et provoque une erreur.
  • Si le scan ne marche pas : Ctrl+C puis npm run start:tunnel
  • Cache Metro corrompu (« Unable to deserialize ») : npm run start:clear
  • Émulateur Android : Android Studio installé → npm run android:emulator

`);
}

const args = hasAdb ? ['expo', 'start', '--android'] : ['expo', 'start', '--go'];
/* Sans SDK : stdin ignoré pour que le CLI Expo n’intercepte pas la touche « a » (adb) ; Metro reste en mode normal (pas CI). */
const stdio = hasAdb ? 'inherit' : ['ignore', 'inherit', 'inherit'];
const result = spawnSync('npx', args, {
  cwd: root,
  stdio,
  shell: true,
  env: process.env,
});
process.exit(result.status === null ? 1 : result.status);
