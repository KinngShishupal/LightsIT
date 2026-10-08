// Production builds, signed with the upload key from android/keystore.properties.
//   npm run build:aab   -> Play Store bundle  (dist/LightsIt-<version>-<code>.aab)
//   npm run build:apk   -> installable APK    (dist/LightsIt-<version>-<code>.apk)
// Extra arguments are passed to Gradle, e.g. `npm run build:apk -- --dry-run`.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(ROOT, 'android');
const ARCHS = 'armeabi-v7a,arm64-v8a,x86,x86_64';

const TARGETS = {
  aab: { task: 'bundleRelease', output: 'app/build/outputs/bundle/release/app-release.aab' },
  apk: { task: 'assembleRelease', output: 'app/build/outputs/apk/release/app-release.apk' },
};

const [kind, ...gradleArgs] = process.argv.slice(2);
const target = TARGETS[kind];
if (!target) {
  console.error('Usage: node scripts/release.mjs <aab|apk> [extra gradle args]');
  process.exit(1);
}

// Never ship a debug-signed build by accident.
if (!existsSync(join(ANDROID, 'keystore.properties')) || !existsSync(join(ANDROID, 'app/lightsit-upload.keystore'))) {
  console.error(
    '\n✖ Release signing key not found.\n' +
      '  Expected android/keystore.properties and android/app/lightsit-upload.keystore.\n' +
      '  Restore them from your backup before building for the Play Store.\n',
  );
  process.exit(1);
}

const gradleFile = readFileSync(join(ANDROID, 'app/build.gradle'), 'utf8');
const versionName = gradleFile.match(/versionName\s+"([^"]+)"/)?.[1] ?? '0';
const versionCode = gradleFile.match(/versionCode\s+(\d+)/)?.[1] ?? '0';

console.log(`\n▶ Building ${kind.toUpperCase()} for LightsIt ${versionName} (code ${versionCode}), all ABIs…\n`);
const isWin = process.platform === 'win32';
const gradlew = isWin ? join(ANDROID, 'gradlew.bat') : join(ANDROID, 'gradlew');
const started = Date.now();
const result = spawnSync(
  gradlew,
  [target.task, `-PreactNativeArchitectures=${ARCHS}`, ...gradleArgs],
  { cwd: ANDROID, stdio: 'inherit', shell: isWin },
);
if (result.status !== 0) {
  console.error(`\n✖ Gradle failed (exit ${result.status}).`);
  process.exit(result.status ?? 1);
}
if (gradleArgs.includes('--dry-run') || gradleArgs.includes('-m')) process.exit(0);

const built = join(ANDROID, target.output);
if (!existsSync(built)) {
  console.error(`\n✖ Build finished but ${relative(ROOT, built)} was not found.`);
  process.exit(1);
}
const distDir = join(ROOT, 'dist');
mkdirSync(distDir, { recursive: true });
const dest = join(distDir, `LightsIt-${versionName}-${versionCode}.${kind}`);
copyFileSync(built, dest);

const mb = (statSync(dest).size / 1024 / 1024).toFixed(1);
const mins = ((Date.now() - started) / 60000).toFixed(1);
console.log(`\n✔ ${relative(ROOT, dest)}  (${mb} MB, ${mins} min)`);
console.log(
  kind === 'aab'
    ? '  Upload this file in Play Console → Test and release.'
    : '  Install on a phone with: adb install -r "' + relative(ROOT, dest) + '"',
);
