# 첫 Android 서명 AAB · 2026-09-28

## 요청과 작업 범위

사용자가 SDK 이용약관의 비용·책임 설명을 확인한 뒤 도구 설치와 새 업로드 키 생성, AAB 제작 진행을 승인했다. Play Console은 본인인증 심사 대기 중이다. 이번 작업은 로컬 빌드·검증까지이며, Play 업로드·공개·Git push는 하지 않았다.

게임 규칙·모드·화면은 변경하지 않았다. 따라서 별도의 전후 연구 스크린샷은 만들지 않았으며 기존 연구 자료를 보존했다.

## 산출물

| 항목 | 값 |
| --- | --- |
| 로컬 배포 파일 | `releases/TAPtoTEN-1.0-code1.aab` (Git 제외) |
| 크기 | 53,974,676 bytes · 약 54.0 MB / 51.5 MiB |
| 표시 버전 / 내부 버전 | `1.0` / `1` |
| 앱 ID | `io.github.junyyyong.makezero` (기존 값 유지) |
| 최소 / 대상 API | 24 / 36 |
| 게임 소스 커밋 | `2515854260cbc2e9a6d2950499238649644d28f0` |
| AAB SHA-256 | `e9b5686da7135fd8396850bcf7fa0140e899921335e180686ec6d558182bfee6` |
| 업로드 공개 인증서 SHA-256 | `2fe1b234c9573342ba92797ce0a3752c197cabda8967814ac26e02a892b4ad80` |

빌드 시 미커밋 변경은 안내 문서·빌드/검증 스크립트·ignore 규칙·Gradle 체크섬이다. 게임 소스는 위 커밋과 동일하다. 키나 비밀번호는 이 문서·검증 JSON·AAB에 포함하지 않았다. 공개 인증서 지문은 비밀 키가 아니다.

## 도구와 안전 조치

- Java: Temurin 21.0.12.1+1, macOS aarch64.
- Android command-line tools 22.0 (`15859902`), SDK Platform 36 revision 2, Build Tools 35.0.0, Platform Tools 37.0.1.
- Gradle 8.14.3 / Android Gradle Plugin 8.13.0, Capacitor 8.5.0, Preferences 8.0.1.
- 다운로드된 Java·SDK 도구·bundletool의 SHA-256을 공식 게시값과 비교했다. Gradle Wrapper에는 공식 배포본 체크섬을 추가했다.
- 프로젝트 전용 `.android-tools/`에 설치해 시스템 Java/SDK 설정을 바꾸지 않았다. 선택적 사용 통계 전송에 동의하지 않았다.
- 업로드 키: RSA 3072, 별칭 `upload`, 유효기간 10,000일. 자동 생성한 무작위 비밀번호는 로그나 명령줄에 출력하지 않았다.
- `android/upload-keystore.jks`와 `android/keystore.properties`는 파일 권한 0600, Git 제외. 외부/암호화 백업은 사용자 진행 필요.
- 빌드 명령은 서명 설정이 없으면 중단한다. 배포용 검증 스크립트는 서명 검증 실패, 앱 ID·대상 API 불일치, 디버그 빌드, 최신 게임 파일 누락/불일치, 비밀 파일 포함 시 중단한다.

공식 다운로드 출처: [Temurin](https://adoptium.net/temurin/releases), [Android SDK](https://developer.android.com/studio), [Gradle 8.14.3 체크섬](https://services.gradle.org/distributions/gradle-8.14.3-all.zip.sha256), [bundletool 1.18.3](https://github.com/google/bundletool/releases/tag/1.18.3).

## 실행한 검증

1. `npm test`: 21개 파일, **217개 테스트 통과**.
2. `npm run android:bundle`: TypeScript·Vite·Capacitor sync 및 Gradle `bundleRelease` 성공. Release lint vital 작업 포함.
3. bundletool 1.18.3 `validate`: AAB 구조 검사 성공.
4. JDK `jarsigner -strict -verify`: 업로드 키 저장소를 신뢰 기준으로 서명 검증 성공, exit 0.
5. Manifest 확인: 앱 ID·버전·대상 API 일치, `debuggable` 활성화 안 됨.
6. `dist/` 게임 파일 **37개**를 AAB 내 파일과 SHA-256으로 비교해 전부 일치. Android가 의도적으로 제외하는 Finder 메타데이터 `.DS_Store`는 검사 대상에서 제외.
7. Preferences 네이티브 플러그인 포함, 외부 `server.url` 없음, 연구·빌드 스크립트·서명 비밀 파일 없음. `.so` 네이티브 라이브러리 없음.
8. 배포 복사본을 bundletool로 universal APK로 변환한 뒤 Android `apksigner` 검증 성공: v2/v3 서명 유효, 업로드 인증서 지문 일치. 해당 APK는 로컬 검증용이며 Play 배포용 앱 서명과는 별개다.

원본 기록: [verification.json](verification.json), [manifest.xml](manifest.xml), [APK 변환 검증](apk-conversion-verification.txt). 검증 스크립트: [verify-aab.mjs](../../../scripts/verify-aab.mjs).

## 남은 경고와 미검증 범위

- Gradle은 flatDir 저장소, 의존 코드의 unchecked 연산, Gradle 9 비호환 deprecated 기능과 SDK XML 버전 차이 경고를 출력했다. 이번 Gradle 8.14.3 빌드는 성공했으며 임의로 라이브러리를 업그레이드하지 않았다.
- jarsigner는 POSIX 메타데이터가 서명 범위 밖이라는 경고 및 JarFile/JarInputStream 읽기 방식의 manifest·서명 인식 차이 경고를 출력했다. 검증 결과는 `jar verified`, strict exit 0이며 원문을 JSON에 보존했다. AAB 구조 검사와 Android APK 변환/서명 검사도 통과했지만 **Google Play 수락 여부를 검증한 것은 아니다**.
- 실제 안드로이드폰 실행, 영상/오디오 재생, 화면/뒤로가기 동작, 앱 삭제 없이 업데이트했을 때 기록 유지: **미검증**.
- 앱 내 개인정보처리방침, 현재 스토어 이미지, 대상 연령/개발자 정보/국가/가격 등은 별도로 준비해야 한다. 이 AAB가 곧바로 정식 출시 심사 완료 상태라는 뜻은 아니다.
- Play 업로드와 서명 등록, 내부/비공개 테스트 및 정식 출시: **미진행**.

다음 단계는 [출시 안내서](../../PLAY_STORE_GUIDE.md)의 내부 테스트 및 실제 기기 확인이다. 새 AAB를 업로드할 때는 versionCode를 증가시키고 같은 앱 ID와 업로드 키를 유지한다.
