# 개인정보·라이선스 포함 Android AAB · 2026-09-29

## 산출물

- `releases/TAPtoTEN-1.0.1-code2.aab` — **54,000,506 bytes** (약 54 MB), Git 제외.
- `versionName 1.0.1`, `versionCode 2`. 기존 앱 ID `io.github.junyyyong.makezero`와 업로드 키 유지.
- SHA-256: `b2c1c36a4a71c1948b51f415e424f13ee7d8332481f3894b858e55549843affb`.
- 이전 `releases/TAPtoTEN-1.0-code1.aab`와 그 검증 자료는 보존했다. 이번 설정/정책 화면은 **새 파일**에만 포함된다.

## 변경·검증

Settings에서 열리는 영어/한국어 개인정보처리방침과 오픈소스 라이선스 문서를 포함했다. 운영자는 **TapeeTepee openstudio**, 문의 메일은 **wsndydtml@gmail.com**. 규칙·저장 키를 바꾸지 않았다. [연구 기록·화면](../../research/2026-09-29-play-policy/README.md).

`npm test` 217개 통과, 모바일 Chrome 브라우저 UI 검증 통과. `npm run android:bundle`로 TypeScript/Vite·Capacitor sync·Gradle release 및 lint vital 완료. `node scripts/verify-aab.mjs docs/releases/2026-09-29-policy-aab`로 다음을 확인했다.

- bundletool 구조 및 jarsigner strict 서명 검증 통과.
- 최소 API 24, 대상 API 36, 디버그 아님, 기존 앱 ID·버전 값 일치.
- 배포 자산 **45개**가 `dist/`와 모두 SHA-256 일치. 개인정보/라이선스 HTML·CSS·서체·라이선스 원문 포함.
- 외부 Capacitor server.url 없음, Preferences 플러그인 포함, 키·비밀번호·연구/빌드 스크립트 제외.

원본 [verification.json](verification.json), [manifest.xml](manifest.xml). 기존 릴리스와 같은 Gradle flatDir/SDK XML/deprecation 및 jarsigner 메타데이터·읽기 방식 경고가 남아 있으나 검사 exit 0이다. 원문 서명 경고는 JSON에 보존했다. 이 새 AAB에 대해서 APK 변환·실기기 설치·실제 업데이트 시험은 별도로 수행하지 않았다.

**Git push, Vercel 공개 배포, Play 업로드·앱 서명 설정·개발자 선언·심사 제출은 하지 않았다.** 실기기 테스트와 공개 개인정보 URL, 소유자의 [정책 확인 항목](../../PLAY_POLICY_CHECKLIST.md)을 마친 뒤 사용한다. 이 파일의 빌드 성공이 정식 출시 준비 전부의 완료나 심사 통과를 뜻하지 않는다.
