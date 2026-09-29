#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "$script_dir/.." && pwd)"
cd "$project_dir"

# Optional project-local tools; never replace a developer's configured SDK/JDK.
if [[ -z "${JAVA_HOME:-}" && -x "$project_dir/.android-tools/jdk/Contents/Home/bin/java" ]]; then
  export JAVA_HOME="$project_dir/.android-tools/jdk/Contents/Home"
fi
if [[ -z "${ANDROID_HOME:-}" && -d "$project_dir/.android-tools/sdk/platforms" ]]; then
  export ANDROID_HOME="$project_dir/.android-tools/sdk"
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# A successful unsigned bundle would not be ready for Google Play.
if [[ ! -f android/keystore.properties ]]; then
  printf '%s\n' 'Release signing is missing: android/keystore.properties' 'See docs/PLAY_STORE_GUIDE.md. Never commit the keystore or passwords.' >&2
  exit 1
fi
if ! java -version >/dev/null 2>&1; then
  printf '%s\n' 'Java 21 is required. Configure JAVA_HOME before building.' >&2
  exit 1
fi

export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$project_dir/.android-tools/gradle-cache}"
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-$project_dir/.android-tools/android-user}"
npm run cap:sync
cd android
./gradlew --no-daemon bundleRelease
printf '\n%s\n' "AAB: $project_dir/android/app/build/outputs/bundle/release/app-release.aab"
