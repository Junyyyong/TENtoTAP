# TAPtoTEN 1.0.3 · 글자 확대율 고정과 설치 아이콘

## 제출 파일

- AAB: `releases/TAPtoTEN-1.0.3-code4.aab` (54,280,876 bytes). 이 Mac에 보관하며 Git에는 포함하지 않는다.
- 버전 이름 **1.0.3**, 버전 코드 **4**.
- 앱 ID **io.github.junyyyong.makezero** — 기존 앱과 동일하다.
- SHA-256: `77a4b2f3d904a2a7f4dae38a2c2d4a684033b228cf015ce298a422639046c2c3`.
- 최소 API **24**, 대상 API **36** 유지.
- 스토어 아이콘: `store/play-icon-512.png` (512×512 PNG). 설치 아이콘은 이미 AAB에 포함되어 있다.
- 기존 업로드 서명 인증서를 그대로 사용했다. 기존 code1~3 파일은 보존했다.

## 바뀐 내용

1. Android WebView의 글자 확대율을 **100%**로 고정한다. 앱 시작, 복귀, configuration 변경 직후와 다음 UI 작업에서 다시 적용한다.
2. `fontScale` 변경은 Activity가 직접 처리한다. 글씨 크기를 바꾸고 돌아왔다는 이유만으로 게임을 새로 생성하지 않도록 한다.
3. CSS `text-size-adjust: 100%`로 모바일 브라우저의 자동 글자 확대를 보완한다.
4. 사용자가 제공한 `ICON-TAPtoTEN.png`를 설치 아이콘으로 사용한다. 원본을 다시 그리거나 잘라내지 않고, adaptive 108dp 레이어 중앙의 60dp 영역에 배치했다. 흰 배경, 5개 density, legacy/round 아이콘도 생성했다.

이는 앱의 텍스트 확대 정책이다. 휴대전화의 **전체 화면 확대·돋보기·화면 배율(density)** 을 강제로 끄거나 변경하지 않는다. 큰 글씨 접근성을 앱 내부에서 제한하는 사용자 선택이며, 모든 앱에 보편적으로 권장되는 접근성 정책이라는 뜻은 아니다. 앱 내부 정책/라이선스 문서도 동일 WebView 확대율을 사용하며 원래의 스크롤 기능은 유지한다.

게임 규칙, 저장 키, Preferences 구현, 점수·진도 데이터 형식과 서명 키는 변경하지 않았다. 코드 비교상 유지되지만 실제 설치 업데이트 시험은 별도로 필요하다.

## 검증

- 기존 자동 테스트 **219개 / 22개 파일 통과**.
- TypeScript 및 Vite 빌드, Capacitor sync, Gradle release 빌드·lintVital 통과.
- 실제 MainActivity Java를 테스트 더블과 컴파일하여 시작·복귀·설정 변경(1.0/1.3/1.8/2.0), 지연 재적용, null/종료 보호와 OS Configuration 불변을 확인했다. **실제 WebView 검증은 아니다.**
- bundletool validate, jarsigner strict 검증 성공. 앱 ID·업로드 인증서가 code3과 동일함을 확인했다.
- AAB의 45개 웹 자산이 dist와 일치한다. 15개 설치 아이콘 PNG는 번들에서 추출·디코드하여 소스와 표시 픽셀이 일치한다.
- 컴파일된 DEX에서 MainActivity의 라이프사이클 메서드, `setTextZoom`, 100 상수를 확인했다. manifest의 fontScale 처리도 포함되어 있다.
- 기본 글자 크기에서 메뉴·OH MY GOD 문구 크기를 변경하지 않았음을 전후 브라우저에서 확인했다. 780×1688 PNG 8장과 한계는 [연구기록](../../research/2026-09-30-android-text-icons/README.md)에 있다.
- 기존 Gradle flatDir/SDK XML/deprecation 및 jarsigner 경고는 남아 있으며 검증 JSON에 원문을 보관했다.

원본: [verification.json](verification.json), [text-icons-verification.json](text-icons-verification.json), [manifest.xml](manifest.xml).

빌드 기준 커밋은 `cae2e49`이며 이번 변경은 작업 트리에서 빌드되었다. 빌드 당시 변경 목록은 verification.json에, 주요 소스 해시는 연구 검증 기록에 있다. **이번 작업에서 Git push·Play 업로드·심사 제출·실기기 설치 시험은 하지 않았다.**

## Play Console에서 업데이트하기

1. **기존 TAPtoTEN 앱**을 선택한다. 새 앱을 만들거나 패키지·키를 바꾸지 않는다.
2. 기존 테스터들이 사용하는 **비공개 테스트 → Alpha → 트랙 관리 → 새 버전 만들기**로 간다. 미완료 버전 때문에 버튼이 잠겼다면 현재 초안/심사 상태를 먼저 확인하고 임의로 기존 제출을 삭제하지 않는다.
3. **TAPtoTEN-1.0.3-code4.aab**를 업로드한다. 버전 **4 (1.0.3)**인지 확인하고 출시명은 **1.0.3**으로 입력한다.
4. 아래 en-US 출시 노트를 붙여 넣고, 다음 → 오류 확인 → 저장 → 게시 개요에서 검토를 위해 제출한다. 이미 해당 코드가 업로드되어 있으면 다시 올리는 대신 라이브러리에서 선택한다.
5. **기본 스토어 등록정보 → 그래픽 → 앱 아이콘**도 `store/play-icon-512.png`로 교체한다. AAB 안 설치 아이콘과 스토어 아이콘은 별개다. 이미 같은 그림이면 다시 바꿀 필요 없다.
6. 승인·배포 뒤 테스터는 같은 Google 계정/테스트 참여 상태에서 Play 스토어의 **업데이트**를 누른다. **앱 삭제·데이터 삭제는 하지 않는다.**

세 게임을 각각 해당 앱의 트랙에서 처리한다. TAPtoTEN 파일을 TALK/TEST 앱에 업로드하지 않는다. 테스터 목록이나 기존 앱을 새로 만들 필요는 없다. Console 상태는 이번 작업에서 직접 조회하지 않았으므로 버튼 명칭/진행 가능 여부는 실제 화면을 따른다.

### 출시 노트 (복사)

```text
<en-US>
- Updated the app icon with the new TAPtoTEN artwork.
- Kept in-app text at a consistent size when the device font size changes.
- Existing progress, records and settings are retained.
</en-US>
```

한국어 설명: 새 아이콘 적용, 휴대전화 글자 크기 설정에 따른 앱 글자 확대 방지, 기존 진도·기록·설정 유지.

### 업데이트 후 꼭 확인

- 기존 버전에서 진도·최고기록을 확인한 뒤 **삭제 없이** 새 버전으로 업데이트하고 다시 비교한다.
- 일반 글씨/큰 글씨/쉬운 사용 모드에서 게임을 시작하고, 실행 중 설정을 바꾼 다음 앱으로 돌아온다.
- 메뉴, 숫자, 등급 문구가 커져 잘리지 않는지 확인한다. 시스템 화면 확대는 별도 기능이므로 화면 크기 자체는 달라질 수 있다.
- 홈 화면/앱 목록 아이콘, 스토어 아이콘을 각각 확인한다. 런처가 이전 아이콘을 캐시하면 먼저 앱/런처 재시작 또는 휴대전화 재시작을 시도하며, 게임 데이터를 지우지 않는다.

공식 참고: [버전 준비·출시](https://support.google.com/googleplay/android-developer/answer/9859348?hl=ko), [앱 업데이트](https://support.google.com/googleplay/android-developer/answer/9859350?hl=ko), [WebView textZoom](https://developer.android.com/reference/android/webkit/WebSettings#setTextZoom(int)).
