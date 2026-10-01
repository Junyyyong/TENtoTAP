# TAPtoTEN 1.0.5 · 고정 비율 화면·중립 UI·원형 탐색 버튼

## 이번에 사용할 파일

- AAB: `releases/TAPtoTEN-1.0.5-code7.aab` — **54,283,230 bytes** (약 54.3 MB).
- 출시명/표시 버전: **1.0.5**, 내부 버전 코드: **7**.
- 앱 ID: `io.github.junyyyong.makezero`. 최소 API **24**, 대상 API **36**.
- SHA-256: `f2195eace82e692f70fafb4dae6a9368f7aa4797c3c27c655d771b334f9042eb`.
- 기존 업로드 키와 앱 ID를 유지한다. TAPtoTALK/TAPtoTEST의 파일이 아니다.
- 이전 AAB와 연구 원본은 모두 보존했다. 이번 제출에는 code5/code6가 아니라 **code7**을 사용한다.

## 포함한 변경

- Android에서 기존 390×844 디자인 전체를 사용 가능한 화면 안에 같은 배율로 맞춘다. OS 밀도나 별도 돋보기를 바꾸지 않고, 글자 확대율은 기존 100%를 유지한다. 실제 WebView에 남은 시스템바·컷아웃 겹침만 한 번 제외한다. 웹의 기존 반응형 배치는 유지한다.
- 흰 배경·연회색 기본 박스, 그림자 없는 로고. 메인 게임명·Settings·제목·START·기록·게이지·스위치는 원래 컬러와 강조 효과를 유지한다.
- 뒤로가기·일시정지는 기존 크기·위치를 유지한 회색 원형이다.
- OH MY GOD부터 NOT BAD까지 기존 금색·주황 그림자·짙은 테두리를 유지한다. 영상·음악·블록 팔레트와 게임 규칙은 바꾸지 않는다.
- 블록 재탭 시 손가락의 작은 움직임으로 다시 선택되는 문제를 수정한다. 다른 블록 선택·드래그는 유지한다.
- 제공된 TAPtoTEN 설치 아이콘, 정책/라이선스 안내, 앱 전용 Preferences 저장소를 포함한다. 진도·최고기록·설정의 저장 키/형식은 그대로다.

[전체 화면 비교](../../research/2026-10-01-ui-accents/navigation-review/index.html) · [고정 비율 연구기록](../../research/2026-10-01-proportional-frame/README.md) · [선택 취소 연구기록](../../research/2026-10-01-white-background-toggle/README.md)

## 검증과 한계

- 자동 테스트 **25개 파일 / 240개 테스트** 통과. TypeScript/Vite와 Android release bundle 빌드 성공.
- [번들/서명 검증](verification.json): bundletool validate, jarsigner strict 성공. 최신 dist의 **45개 파일**과 AAB 자산의 바이트/해시가 일치한다. release는 debuggable=false다. 연구 자료·키·비밀번호·빌드 도구는 포함하지 않는다.
- [설치 아이콘/컴파일 확인](text-icons-verification.json): **15개 아이콘 픽셀**이 소스와 일치한다. 기존 code3/code6와 같은 앱 ID/업로드 인증서, DEX의 textZoom100 및 fontScale 처리, 변경하지 않은 규칙/저장 소스를 확인했다.
- [추출한 AAB 웹 화면 검증](bundled-style-and-music-verification.json): 메뉴 높이 **5조건**, 음악 안내 **8조건**, 안전영역 우선순위 **6조건** 통과. macOS의 기존 시스템 서체를 확인했다. 음악 안내는 레이아웃 fixture이며 실제 자동재생 차단을 재현한 시험은 아니다.
- [추출한 AAB Android 분기 검사](bundled-frame-final.json): **프레임 9조건·화면 11상태·터치 8조건** 통과. 변조하지 않은 배포 JS/CSS에서 CapacitorCustomPlatform으로 Android를 모의한다. Preferences는 검사 프로필의 웹 구현을 사용한다. 프레임 비율·안전영역·화면 크기 변경, 각 게임의 원형 버튼과 색상, 작은 화면의 실제 브라우저 터치 취소/일시정지/재개/뒤로가기를 검사한다. 네이티브 Preferences나 실기기 OS 동작을 검증한 것은 아니다.
- 실제 MainActivity를 실행한 Java test double: 시작/복귀/fontScale 변경, 5가지 밀도의 전체/이미 제외됨/부분 겹침, 측면/cutout, 재로드·중복·null/0/destroyed 보호 검사 통과. Android/WebView 렌더링 검사가 아니다.
- 화면 디자인 검증은 앞선 연구에 보존한 17상태/34장과 전후 1,469개 요소 대조를 사용한다. 이번 AAB의 웹 자산은 승인한 해당 소스를 새 production build로 묶었다.

초기 번들 프레임 검사 두 결과(`bundled-frame-verification.json`, `bundled-frame-verified.json`)는 각각 투명 body와 투명 Settings 자체의 색을 흰색으로 단정한 **검사 조건 오류**로 보존한다. 실제 흰 바탕을 소유하는 `#app`과 그 위 화면의 흰색/투명 면 및 그라데이션 부재를 따로 확인하도록 검사 도구만 고쳤다. 게임 파일/AAB를 이 때문에 수정하지 않았다. 최종 결과는 `bundled-frame-final.json`이다. 아이콘 검사는 최초 로컬 sharp 모듈 경로가 없어서 시작하지 못했으며, 프로젝트 의존성을 바꾸지 않고 임시 도구 설치 후 통과했다.

기준 커밋 `cae2e49` 위의 승인된 작업 트리를 빌드했다. 검증 JSON에 당시 sourceCommit/workingTreeStatus를 보존하며, 이후 Git commit은 이 소스·아이콘·검증 기록을 포함한다. Gradle flatDir·SDK XML·deprecated, jarsigner 경고 원문은 검증/빌드 출력에 남아 있고 strict 서명 검증은 통과했다.

**Play 업로드·심사 제출, 실제 Galaxy/WebView 실행, 삭제 없는 앱 업데이트/데이터 유지 시험은 하지 않았다.** 모의검사와 실기기 검증은 구분한다. 실제 기기에서 최종 확인 후 사용 중인 테스트 트랙에 배포한다.

## 출시명

```text
1.0.5
```

## 출시노트 — en-US에 복사

```text
<en-US>
- Improved Android screen scaling and safe-area handling.
- Updated to a clean white and light-gray interface.
- Added circular back and pause buttons while keeping colorful game accents.
- Fixed deselecting blocks by tapping them again.
</en-US>
```

한국어 요약: Android 화면 비율/안전영역 개선, 흰색·연회색 UI, 원형 뒤로가기/일시정지와 컬러 강조 유지, 블록 재탭 선택 취소 수정.

## Play Console에서 할 일

1. 기존 **TAPtoTEN**의 사용 중인 테스트 트랙 → 새 버전 만들기에서 위 AAB를 올린다.
2. **7 (1.0.5)** 표시를 확인하고 출시명 **1.0.5**와 위 출시노트를 입력한다.
3. 오류가 없으면 해당 트랙의 변경사항을 검토/제출한다. 이 작업은 Git push만으로 자동 진행되지 않는다.
4. 기존 앱을 **삭제하지 않고 업데이트**해 진도·기록·설정이 유지되는지 확인한다.
5. 갤럭시 일반/큰 글씨와 화면 크게/작게, 실행 중 설정 변경, 제스처/3버튼 탐색에서 홈·START·세 게임·튜토리얼·일시정지·실제 영상/결과·Settings를 확인한다.

AAB/키는 Git에서 제외하며, 웹 코드는 Git push와 연결된 기존 배포 방식으로 반영된다. 설치 앱은 이 새 AAB의 테스트/업데이트 배포가 필요하다.
