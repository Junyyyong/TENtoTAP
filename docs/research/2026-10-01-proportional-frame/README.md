# Android 표시 크기 변경과 고정 비율 화면

2026-10-01 · TAPtoTEN · **코드 수정·검증만 수행. AAB 생성, 버전 변경, Git commit/push 없음.**

## 문제와 요구

사용자는 갤럭시의 ‘화면 크게/작게’ 설정에 따라 설치 앱의 그림·글자·블록·버튼과 간격이 각기 달라지는 것을 방지해 달라고 요청했다. 게임 내부 배율 설정을 추가하거나 휴대폰 OS 설정을 강제 변경하라는 요청이 아니다. 기존 디자인 전체를 사용 가능한 화면 안에 같은 배율로 맞추고, 다른 종횡비에는 여백을 허용하되 화면 잘림·찌그러짐은 방지한다.

기존 TAPtoTEN은 viewport의 vw/vh와 높이 520·580·620·660·700px의 media query를 사용했다. Android 표시 밀도가 달라지면 같은 물리 화면에서도 논리 viewport와 배치 분기가 바뀔 수 있다. WebView의 시스템바 처리도 웹 브라우저와 다르다. 이는 사용자 관찰·소스 분석에 근거한 설명이며, 이번에 실제 갤럭시 설정을 조작해 재현한 결과는 아니다. [Android 화면 밀도](https://developer.android.com/training/multiscreen/screendensities), [시스템바·잘림 영역 안전영역](https://developer.android.com/develop/ui/views/layout/insets)

## 참고와 기준

TAPtoTEST의 로컬 폴더 `/Users/scdi/Documents/ChatGPT/TaptoPick`를 **읽기 참고만** 했다. 다음 파일을 확인했으며 해당 프로젝트는 수정하지 않았다.

| 파일 | 참고 시 SHA-256 |
| --- | --- |
| `src/ui/nativeFrame.ts` | `71237479cbaf80a038ea6103c46a113bf3037bcdc002a1096577f98e822573cd` |
| `src/ui/pickLayout.ts` | `3862aef6b4d76a0f80d7abc38fe99a76557e1aa32c89112d714d09509f793a59` |
| `docs/research/2026-10-01-proportional-frame/README.md` | `b8b6cd70fdaf68d280f855a2c1f0db22818bc6a4f3a70866be4084709904c4b0` |

TAPtoTEN의 기존 연구 화면도 **390×844 CSS px**다. 전환 직전에 승인된 흰 배경·연회색 UI 박스·기존 컬러 숫자 블록 디자인을 이 기준에 그대로 보존했다. 과거의 그라데이션 UI로 되돌리거나 크기·굵기를 눈대중으로 조정하지 않았다.

## 무엇을 왜 바꿨는가

### 화면 전체를 한 번만 맞추기

- Android에서만 `#app`을 390×844 논리 화면으로 배치한다. 가로·세로에 같은 `scale`을 적용하고 중앙에 놓는다.
- 배율은 `min(사용 가능한 폭 / 390, 사용 가능한 높이 / 844)`이다. 가로·세로를 따로 늘리지 않으며 종횡비 차이는 여백으로 남는다.
- 기존 CSS의 px·서체·굵기·행간은 유지한다. vw/vh를 Android에서는 기준 화면의 3.9px/8.44px 단위로 해석하고, 웹에서는 기존 vw/vh로 해석한다.
- 웹의 높이별 media query와 우선순위는 유지했다. 해당 분기만 Android 기준 화면에서는 적용하지 않아, 항상 기존 844px 구성으로 렌더링한다. TAPtoTEST의 전체 화면 맞춤 원리를 사용하되, 웹의 기존 배치 분기를 보존하기 위해 TEN에서는 container query로 전면 교체하지 않았다.
- 시작·복귀·viewport resize·native 안전영역 변경 때 자동으로 다시 계산한다. 게임 안에 조절 버튼이나 설정은 없다. OS density/fontScale을 덮어쓰지 않고 기존 WebView `textZoom(100)` 정책을 유지한다. OS의 별도 화면 돋보기 기능을 강제로 해제하지도 않는다.

### 안전영역은 실제 겹침만, 한 번

`MainActivity`는 `systemBars | displayCutout`과 WebView의 실제 위치·크기를 비교한다. 상태 막대·탐색 막대·노치 중 **아직 WebView에 겹치는 부분**만 CSS 좌표로 전달한다. 네이티브 레이아웃이 이미 제외한 부분은 0이다. Capacitor의 insets listener를 교체하지 않고 관찰한다.

native 측정값이 있으면 0도 우선한다. 측정값이 아직 없을 때만 기존 Capacitor CSS 변수 또는 `env()`를 사용하며 서로 더하지 않는다. 바깥에서 안전영역을 제외한 뒤 기준 화면 내부의 `--app-safe-*`는 모두 0으로 둬 이중 여백을 막는다. 기존 웹의 안전영역 처리는 유지했다.

### 터치와 별도 팝업

- 버튼 hit testing과 `elementFromPoint()`는 실제 화면의 client 좌표를 그대로 사용한다. 터치 좌표를 다시 나눠서 이중 보정하지 않는다.
- 빠른 드래그의 중간 샘플 간격만 실제 그려진 블록 크기에 맞춘다.
- 이미 논리 좌표를 반환하는 보드 `clientWidth/clientHeight`는 그대로 쓴다. 점수 팝업·완성 그림처럼 DOMRect를 CSS 위치로 되돌리는 부분만 배율로 나눈다. 결과 등급 글자 측정도 같은 좌표계로 맞춘다.
- 정책 문서 `<dialog>`는 `#app` 밖의 top layer에서 열리므로 별도로 같은 배율·기준 위치를 적용했다. Chromium이 기존 390px 화면에서 적용하는 dialog 최대 폭 제한도 보존했다.
- 저장 오류의 Retry는 inert 처리된 게임 밖에 그대로 두되, 같은 기준 화면의 별도 호스트에 배치했다. 저장 방식이나 재시도 동작은 변경하지 않았다.

게임 규칙·튜토리얼 구성·등급/영상 선택·음악·이미지·폰트 파일·저장 키/형식·앱 ID·서명 키는 바꾸지 않았다. 소스/자산 71개 해시의 일치를 확인했다. 변경 전 이미 존재하던 아이콘·서체·재탭 취소·연회색 UI 작업도 보존했다.

## 검증 결과

최종 [전체 검증 결과](final-verified/verification.json)는 **통과**, 브라우저 오류 0개다. 검사 도구는 게임에서 import하지 않는다.

- Vitest **24개 파일 / 236개 테스트** 통과. 새 전체 화면 기하 검사 13개 포함.
- TypeScript/Vite production build 통과.
- 실제 Android SDK/Java의 `:app:compileDebugJavaWithJavac` 통과. Java 소스 컴파일만 수행했으며 AAB/APK는 만들지 않았다. 기존 Gradle flatDir·SDK XML·deprecated 경고는 남아 있다.
- Java test double 검사 통과: 글자 배율 시작/복귀/설정 변경, 5가지 밀도에서 전체 겹침·이미 제외됨·부분 겹침, 측면 및 큰 cutout, 페이지 재로드, 중복 전송 방지, null/0 크기/destroyed 상태. **실제 Android 렌더링 검사는 아니다.**
- 웹 **9가지 크기**: 320×568, 390×520/580/620/660/700/701/844, 412×915. 메인·세 모드 START/게임/일시정지·Settings의 CSS 및 배치를 변경 전후 비교해 동일함을 확인했다. 활성 타이머 글자는 자동 클릭 대기 중 다른 숫자가 될 수 있어, 그 글리프의 폭/x만 비교에서 제외했다. 글자 크기·굵기·서체·높이와 주변 박스는 비교했다.
- Android 레이아웃 분기를 호출한 **5가지 모의 밀도**에서 세 모드 START/게임/일시정지/결과·메인·Settings·정책 팝업을 390×844 웹 기준의 좌표·서체·크기·굵기·색상과 비교했다.
- 페이지 재로드 없이 4가지 화면/안전영역 조합을 변경했다. 320×568, 412×915, 측면 cutout 포함 390×844, 가로형 800×600에서 같은 보드 숫자·기록과 기준 배치를 유지했다. 가로형은 계산 검사이며 Android 세로 고정 정책을 바꾼 것이 아니다.
- 실제 좌표를 전달하는 브라우저 touch dispatch로 세 모드 선택·재탭 취소 15조건, 별도 작은/기준/큰 화면에서 한 이벤트로 여러 블록을 가로지르는 드래그·점수 팝업·완성 그림 위치·blocking 저장 재시도 3조건을 통과했다.
- 6종 등급 글자의 기준 화면 폭, 촬영한 Android 모의 29상태의 버튼·그림·보드 경계도 확인했다.
- 추가 [안전영역 검증](insets-verified/verification.json) **12조건** 통과: 실제 Chromium `env()` 모의, Capacitor 변수, native 측정값의 부재/0/부분 겹침/같은 값, ResizeObserver 유무, 음악 안내 공간. root 스타일 측정의 무한 피드백 루프도 없었다.

물리 1080×2340을 유지한 밀도 모의에서 시스템바는 위 72px·아래 144px로 가정했다. 이는 특정 갤럭시 설정 단계의 실제 수치가 아니다.

| 모의 밀도(DPR) | 논리 viewport | 그려진 기준 화면의 논리 높이 |
| --- | --- | --- |
| 2 | 540×1170 | 1062 |
| 2.4 | 450×975 | 885 |
| 3 | 360×780 | 708 |
| 3.6 | 300×650 | 590 |
| 4 | 270×585 | 531 |

각 조건의 높이에 DPR을 곱하면 동일한 물리 높이 2124px다. 같은 물리 화면에서 전체 구성의 상대 크기·간격을 유지했다. 상세 좌표와 소수점 오차는 JSON에 남겼다.

## 전후 화면

최종 원본은 모두 **390×844 CSS px / DPR 2 / 780×1688 PNG**이며 별도 이미지 리사이즈/압축은 하지 않았다. 전후 모두 같은 Chrome 154.0.8037.58, locale en-US, Asia/Seoul, 제어 시계 `2026-10-01T00:00:00Z`, 난수 seed 20261001, 음악/효과음 끔 조건이다. 비교용 시스템바 겹침은 위 24px·아래 48px로 모의했다. 실제 OS 막대나 탐색 버튼의 사진이 아니다.

| 화면 | 수정 전 재현 | 수정 후 Android 모의 |
| --- | --- | --- |
| 메인 | [전](final-verified/before-home.png) | [후](final-verified/after-home.png) |
| LIMITLESS START | [전](final-verified/before-limitless-start.png) | [후](final-verified/after-limitless-start.png) |
| TIMELESS START | [전](final-verified/before-timeless-start.png) | [후](final-verified/after-timeless-start.png) |
| ENDLESS START | [전](final-verified/before-endless-start.png) | [후](final-verified/after-endless-start.png) |
| LIMITLESS 본게임 | [전](final-verified/before-limitless-game.png) | [후](final-verified/after-limitless-game.png) |
| TIMELESS 게임 | [전](final-verified/before-timeless-game.png) | [후](final-verified/after-timeless-game.png) |
| ENDLESS 게임 | [전](final-verified/before-endless-game.png) | [후](final-verified/after-endless-game.png) |
| 일시정지 | [전](final-verified/before-limitless-pause.png) | [후](final-verified/after-limitless-pause.png) |
| LIMITLESS 결과 | [전](final-verified/before-limitless-result.png) | [후](final-verified/after-limitless-result.png) |
| TIMELESS 결과 | [전](final-verified/before-timeless-result.png) | [후](final-verified/after-timeless-result.png) |
| ENDLESS 결과 | [전](final-verified/before-endless-result.png) | [후](final-verified/after-endless-result.png) |
| 2블록 안내 | [전](final-verified/before-lesson-1-announcement.png) | [후](final-verified/after-lesson-1-announcement.png) |
| 3블록 안내 | [전](final-verified/before-lesson-6-announcement.png) | [후](final-verified/after-lesson-6-announcement.png) |
| 4블록 안내 | [전](final-verified/before-lesson-14-announcement.png) | [후](final-verified/after-lesson-14-announcement.png) |
| 5블록 안내 | [전](final-verified/before-lesson-23-announcement.png) | [후](final-verified/after-lesson-23-announcement.png) |
| 전체 비우기 | [전](final-verified/before-lesson-30-game.png) | [후](final-verified/after-lesson-30-game.png) |
| 긴 등급 문구 | [전](final-verified/before-long-grade.png) | [후](final-verified/after-long-grade.png) |
| Settings | [전](final-verified/before-settings.png) | [후](final-verified/after-settings.png) |
| 개인정보처리방침 | [전](final-verified/before-privacy.png) | [후](final-verified/after-privacy.png) |

총 29상태×전후 **58장**. 표에 생략한 세 모드 시작 안내·각 모드 일시정지·튜토리얼 게임/30단계 안내도 같은 폴더에 있다. 원본 해시는 [manifest 겸 측정 결과](final-verified/verification.json)의 `captures` 목록에 기록했다.

결과 화면은 실제 Overlay, 등급 화면은 실제 Cheer를 호출한 **레이아웃 fixture**다. 점수·진도는 비교용 제어 데이터이고 사용자 플레이로 획득한 결과가 아니다. 등급 캡처는 영상 디코딩을 검증하지 않는 정지 레이아웃으로, 영상 요소의 공간은 유지하되 그림을 감췄다. 정상/오답 동작과 전체 규칙은 별도 테스트로 검증했다.

## 소스 재현과 실패 기록

- 기준 커밋: `cae2e49b5af230a95b2f1890daf01b47b321b621`.
- 촬영일: **2026-10-01**. 과거 커밋 당시 촬영본이 아니라, 전환 직전 코드를 별도 임시 폴더에서 재현한 화면이다.
- `git archive`로 기준 커밋을 임시 폴더에 추출하고, 변경 전에 보존한 승인된 미커밋 `src/index.html/vite.config.ts`를 overlay했다. 현재 작업 소스를 과거 버전으로 checkout/교체하지 않았다. 미커밋 디자인이 포함돼 순수 커밋 화면 또는 배포 AAB 재현이라고 부르지 않는다.
- [변경 전 source overlay](before-source-overlay.tar.gz)의 SHA-256: `b368f0e4fb33875d9889bfd8f74d4152d5e27084b2734eaa18c4d7ac210277cf`. 당시 Java 소스도 `MainActivity.before.java`로 포함했다.
- 현재 설치된 의존성을 재사용했다. 당시 전체 실행 환경의 완전 복원은 아니다. 변경 전후 실행 소스 해시 및 변하지 않은 규칙·저장소·자산 해시는 최종 JSON에 있다.
- `check-1/`: 활성 타이머 숫자의 글리프 폭을 비교한 검사 문제로 중단. `check-2/`: 숨겨진 다른 화면의 제목 선택자 문제로 중단. 두 경우 게임 코드 결함으로 판단하지 않았다.
- `check-3/`: top-layer 정책 창의 기존 Chromium 최대 폭을 반영하지 못한 실제 배치 차이를 발견해 수정했다.
- `final/`: 화면·밀도·live 변경은 통과했지만 점수 팝업의 애니메이션을 끈 fixture에서 중앙 정렬 transform까지 없앤 검사 문제로 중단했다. 정지 위상을 명시한 [fixture 집중 재검사](fixture-check/verification.json)는 통과했다.
- **확정 결과는 `final-verified/`와 `insets-verified/`만 사용한다.** 중간 실패 자료/PNG를 덮어쓰거나 삭제하지 않았다. 초기 `long-grade` 파일은 GOOD TRY였으며 최종에는 UNBELIEVABLE로 수정했다.

재현: `PLAYWRIGHT_MODULE`을 설치된 Playwright 경로로 지정하고, 반드시 새 `CAPTURE_OUT` 폴더를 사용한다.

```sh
CAPTURE_OUT=docs/research/2026-10-01-proportional-frame/new-check node docs/research/2026-10-01-proportional-frame/check.mjs
CAPTURE_OUT=docs/research/2026-10-01-proportional-frame/new-insets node docs/research/2026-10-01-proportional-frame/insets-check.mjs
node tests/native/text-zoom-contract.mjs
```

## 실제 기기에서 아직 확인할 것

**adb 연결 기기는 0대여서 실제 갤럭시/Android System WebView 검증은 하지 못했다.** 위 결과는 브라우저 모의·수학/Java 계약 검사·Android 소스 컴파일이며 실제 설치 앱 사진이나 OS 설정 테스트로 대체할 수 없다.

추후 사용자가 AAB 생성을 요청한 뒤, 기존 앱을 삭제하지 않고 업데이트해 다음을 확인해야 한다.

1. 갤럭시 화면 크게/작게 최소·기본·최대, 글자 크기 기본·최대에서 같은 화면 구성과 기록 유지.
2. 앱을 켠 상태로 설정을 바꾸고 복귀해 기준 화면 재계산·터치 일치 확인.
3. 제스처/3버튼 탐색, 상태 막대 및 노치가 있는 기기에서 여백이 한 번만 적용되는지 확인.
4. 메인·START·세 게임·튜토리얼 안내·일시정지·실제 결과 영상·Settings/정책 문서 확인.

기존 AAB는 이번 소스를 포함하지 않는다. 이 기록은 개발 검증 근거이며 학습 효과나 사용자 실험 결과가 아니다.
