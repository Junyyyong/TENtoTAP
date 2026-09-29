# TAPtoTEN 1.0.2 · 문의 이메일 정정

작성·검증: 2026-09-29. 사용자가 실제 문의 주소를 **wnsdydtml@gmail.com**으로 정정하고 수정·push·새 AAB 제작을 요청했다.

## 제출 파일

- `releases/TAPtoTEN-1.0.2-code3.aab` — **54,000,514 bytes** (약 54 MB), Git 제외. 이 Mac의 프로젝트 폴더 안에 보관한다.
- `versionName 1.0.2`, `versionCode 3`.
- 앱 ID `io.github.junyyyong.makezero`, 업로드 키는 기존과 동일. 키나 새 앱을 생성하지 않았다.
- SHA-256: `7194f40feae417e698eab819d8f4f8ea543be5aa70860aa29036bf23f7a0bc1f`.
- 기존 code1·code2 AAB 및 그 검증 기록은 보존한다. 새 업로드에는 **code3**을 사용한다.

## 변경과 검증

- `public/privacy.html`의 영문/한글 문의 및 개인정보 요청 주소 총 네 곳을 정정했다. 정보 처리 방식·게임 규칙·디자인·진도 저장 방식은 변경하지 않았다.
- `npm test`: **22개 파일, 219개 테스트 통과**. 두 언어의 모든 연락처를 확인하는 회귀 테스트 2개를 추가했다.
- `npm run android:bundle`: TypeScript/Vite, Capacitor sync, Gradle release 및 lint vital 완료. 최초 제한 환경에서는 Gradle 로컬 소켓 권한 오류로 시작하지 못했고, 승인된 실행에서 성공했다.
- `node scripts/verify-aab.mjs docs/releases/2026-09-29-contact-aab`: bundletool 구조 검증, jarsigner strict 서명 검증, **45개 배포 자산의 SHA-256 일치** 확인.
- code2 검증 결과와 비교: 앱 ID 및 업로드 인증서 동일. `AndroidManifest.xml`은 `versionCode`·`versionName`만 변경. 배포 자산 45개 중 **privacy.html만 변경**되어 게임 JavaScript·스타일·미디어·저장 로직은 이전 릴리스와 동일하다.
- 대상 API 36 / 최소 API 24, 디버그 아님, 외부 Capacitor 서버 주소 없음, Preferences 플러그인 유지, 키·개인 설정·연구/빌드 스크립트는 번들에서 제외.
- 기존 flatDir, SDK XML, Gradle deprecation 및 jarsigner 경고는 남아 있으나 검증 exit 0. 서명 경고 원문은 JSON에 포함한다.

원본: [verification.json](verification.json), [manifest.xml](manifest.xml). JSON의 sourceCommit은 빌드 시점의 기준 커밋 `96d2862`이고 이메일·버전 변경은 workingTreeStatus에 기록된 상태로 빌드했다. 최종 Git 변경은 이 릴리스 기록을 추가한 커밋으로 확인할 수 있다.

연락처만 정정한 소규모 작업이므로 별도 게임 화면 재촬영은 하지 않았다. 기존 연구 스크린샷과 과거 기록의 주소는 당시 상태를 증명하는 원본으로 보존한다. 이 기록에 실기기 설치·업데이트 시험이나 Google 심사 통과를 주장하지 않는다.

## Play Console에서 소유자가 할 일

현재 사용자가 보여준 상태는 **비공개 테스트 Alpha의 code2가 검토 전송 전**이다. 아래는 그 상태를 기준으로 한다. 계정·앱·스토어 이미지·테스터 목록을 새로 만들지 않는다.

1. **비공개 테스트 → Alpha → 기존 버전 수정**으로 이동한다. 수정이 잠겨 있으면 임의로 전체 앱/등록정보를 삭제하지 말고 현재 상태를 확인한다.
2. 이번 출시의 App Bundle 목록에서 code2를 제거/제외하고 `TAPtoTEN-1.0.2-code3.aab`를 **업로드**한다. 이는 해당 출시의 포함 파일을 바꾸는 작업이며 기존 내부 테스트나 업로드 기록을 없애는 작업이 아니다.
3. `3 (1.0.2)`가 포함되었는지 확인하고 출시명을 `1.0.2`로 정한다. 기존 출시 노트는 유지하거나 아래 문구로 바꾼다.
4. 스토어 **자세한 설명** 맨 아래 문의 주소를 `wnsdydtml@gmail.com`으로 수정한다. 스토어 연락처와 테스터 의견 수신 주소가 이미 이 주소라면 그대로 둔다.
5. 개인정보처리방침 URL은 **https://taptoten.vercel.app/privacy.html 그대로**다. 새 웹 배포에서 정정 주소가 보이는지 확인한다.
6. 다음 → 미리보기 및 확인 → 저장 후 게시 개요에서 **code3 / 1.0.2**와 변경사항을 검토한다. 검토 전송 전 빨간 오류와 선언 내용의 일치를 확인한다. 심사 제출은 소유자가 진행한다.

이미 내부 테스트에 code2를 설치한 기기의 업데이트도 시험하려면, **내부 테스트에 새 버전을 만들고 라이브러리에서 같은 code3을 추가**한다. 같은 AAB를 트랙마다 새 번호로 다시 빌드할 필요는 없다. 기존 앱을 삭제하지 않고 업데이트한 뒤 기록이 유지되는지 확인한다.

참고: [Google 공식 버전 준비·출시 안내](https://support.google.com/googleplay/android-developer/answer/9859348?hl=ko), [업데이트 안내](https://support.google.com/googleplay/android-developer/answer/9859350?hl=ko).

### 붙여 넣을 출시 노트

```text
<en-US>
TAPtoTEN test release.
- Three game modes: LIMITLESS, TIMELESS and ENDLESS.
- Tutorial progress and personal records saved on your device.
- Music, sound effects and character videos.
- Corrected the privacy and support contact email.
</en-US>
```

**이 작업에서 Play Console 업로드·심사 제출·공개 출시는 수행하지 않았다.** AAB 파일과 서명 비밀 자료는 Git에 올리지 않는다.
