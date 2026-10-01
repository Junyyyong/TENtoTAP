# TAPtoTEN 1.0.4 · 기존 웹 디자인 유지와 안전영역 보강

## 이번에 사용할 파일

- AAB: `releases/TAPtoTEN-1.0.4-code6.aab` — **54,281,343 bytes** (약 54.3 MB).
- 출시명/버전 이름: **1.0.4**. 버전 코드: **6**.
- 앱 ID: `io.github.junyyyong.makezero`. 최소 API **24**, 대상 API **36**.
- SHA-256: `7892358074e48f2feb13f0117bd9a0051502d69b7afcc5be7e7a467c6fa3ff69`.
- 기존 업로드 키와 앱 ID를 유지했다. 새 아이콘·저장소는 이전 작업대로 포함했다.
- **code5는 채택하지 않은 중간 후보다. code6 파일을 사용한다.** 이전 AAB/기록은 덮어쓰지 않았다.

## 변경과 확인

원래 웹의 기기 기본 서체·폰트 크기·굵기·반응형 규칙을 유지한다. 이미 Noto를 지정한 부분만 Noto를 사용한다. OS별 서체 모양 차이는 남는다.

시스템 바·컷아웃 공간을 메뉴/플레이/안내/결과/일시정지/법적 안내에 반영하고, 등급 문구가 화면 크기나 폰트 로딩 후에도 다시 맞춰지도록 했다. WebView 글자 확대율 100%는 유지하며 휴대전화 전체 배율·돋보기를 변경하지 않는다. 게임 규칙·저장 키·진도/기록 데이터 형식은 바꾸지 않았다.

- 자동 테스트 **223개**, 웹/Android release 빌드 통과.
- 과거 커밋 재현과 현재 화면 **30상태 비교**, **66장 780×1688 PNG**, 48개 플레이 크기/안전영역 조건, 30개 등급 폭 조건 통과. [연구기록](../../research/2026-10-01-web-app-style/README.md).
- bundletool validate와 jarsigner strict 검증 성공. 인증서가 기존 릴리스와 같다.
- 실제 AAB의 45개 웹 자산이 dist와 일치하고, 15개 설치 아이콘 픽셀이 소스와 일치한다. DEX의 textZoom100, Preferences 플러그인, 비공개 키/연구 자료 미포함을 확인했다.
- AAB에서 추출한 웹 파일로 높이 660/700/701/844/932의 메뉴를 재검증했다. macOS에서는 원래 OS 서체인 Apple SD Gothic Neo가 사용됨을 확인했다.
- 음악 탭 안내를 표시한 레이아웃 fixture도 4개 크기 × 안전영역 2조건에서 메뉴·Settings·안내가 화면 안에 들어감을 확인했다. 실제 자동재생 차단을 재현한 시험은 아니다.
- 증거: [verification.json](verification.json), [text-icons-verification.json](text-icons-verification.json), [bundled-style-verification.json](bundled-style-verification.json), [manifest.xml](manifest.xml).
- 추가 음악 안내 검증: [bundled-style-and-music-verification.json](bundled-style-and-music-verification.json).
- native/env 우선순위 6조건: [bundled-inset-precedence-verification.json](bundled-inset-precedence-verification.json). 네이티브 변수가 없는 웹에서는 env를 쓰고, 네이티브가 0 또는 env보다 작은 값을 주어도 해당 값을 우선한다. 기존 파일에서 검사했으며 AAB를 다시 바꾸지 않았다.
- jarsigner의 기존 경고는 JSON에 보존했다. 서명 strict 검증은 성공했다.

기준 커밋 `cae2e49` 위의 작업 트리에서 빌드했다. **Git push, Play 업로드/제출, 실제 Android 업데이트 시험은 하지 않았다.** 모의 안전영역과 macOS Chrome 검증은 실제 Android 폰 검증이 아니다.

## 출시 노트 — 복사해서 사용

```text
<en-US>
- Improved layouts around Android system bars.
- Preserved the original web design, text sizes and font weights.
- Improved fitting of result text on smaller screens.
</en-US>
```

한국어 요약: Android 시스템 바 주변 화면 배치 보강, 기존 웹 크기·굵기 유지, 작은 화면의 결과 문구 잘림 개선.

## 올리기 전후 확인

1. Play Console의 **기존 TAPtoTEN 앱/사용 중인 테스트 트랙**에서 이 AAB를 선택한다. 다른 게임에 올리지 않는다.
2. 업로드 표시가 **6 (1.0.4)**인지 확인하고 출시명을 **1.0.4**로 입력한다. 출시 노트는 위 내용을 사용한다.
3. 기존 **1.0.3 앱을 삭제하지 않고 업데이트**한다. 같은 앱 ID와 키를 계속 사용한다.
4. 진도·최고기록·설정이 유지되는지 확인한다. 앱 삭제/데이터 삭제로 테스트하지 않는다.
5. 일반 글씨/큰 글씨/쉬운 사용 모드, 제스처/3버튼 탐색에서 홈, 2×2/3×3/9×9, 산식, OH MY GOD, 하단 탭, 일시정지, Settings를 확인한다.
6. 기기별 기본 서체의 모양 차이는 허용하되 문구·버튼이 잘리면 기종, Android/WebView 버전, 설정과 같은 게임 화면을 기록해 비교한다.

새 아이콘은 AAB에 포함되어 있다. 스토어 아이콘을 아직 교체하지 않았다면 `store/play-icon-512.png`도 별도로 사용한다. Play Console 자체는 이번에 조작하지 않았다.
