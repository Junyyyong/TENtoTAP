# 2026-10-01 — 기록된 웹 디자인 보존과 Android 안전영역

## 문제와 사용자 결정

Android 설치판에서 메뉴 글씨가 웹보다 굵고 커 보이고, 등급 문구·하단 안내가 잘리는 화면이 보고되었다. 사용자는 메뉴뿐 아니라 시작 안내, 게임, 점수, 일시정지, 결과, Settings를 기존 연구 스크린샷의 비율·크기와 비교하도록 요청했다. 눈대중으로 새 크기나 굵기를 정하는 변경은 원하지 않았다.

폰트 정책의 최종 선택은 **기존 기기 기본 서체 유지**다. 원래 OS 서체 스택과 각 요소에 지정된 크기·굵기를 유지한다. 이미 `TAP Sans KR` 또는 `TAP Serif KR`를 명시한 요소는 동봉된 Noto를 그대로 사용한다. 모든 UI를 Noto로 바꾸지 않는다. 따라서 Android와 Apple 기기의 글자 모양은 같다고 보장하지 않는다.

사용자의 두 기기 캡처는 화면 해상도·사용 가능한 웹 영역·OS 서체가 같지 않다. 사진만으로 특정 휴대전화의 쉬운 사용 모드나 배율을 원인으로 확정하지 않았다. 실제 CSS와 패키징을 확인한 뒤 안전영역 처리를 보강했다.

## 기준과 변경

- 원래 메뉴 값: 제목 **21px/800**, 설명 **13px/700**. 높이 700 CSS px 이하에서는 기존 반응형 규칙인 **19px/800**, **12px/700**을 유지한다. 로고·버튼도 원래 규칙을 유지한다.
- 가장 최근의 [홈 기준 화면](../2026-09-30-android-text-icons/final/after-title.png), [설정 기준](../2026-09-29-play-policy/after-settings.png), [본게임 기준](../2026-09-23-release-resume/after-completed-resume.png)을 참고했다. 버전 사이에 게임 내용이 바뀐 부분을 레이아웃 회귀로 판단하지 않았다.
- `safeArea.css`: Capacitor가 제공하는 `--safe-area-inset-*`를 우선 사용하고, 없으면 브라우저 `env()` 값을 사용한다. 두 값을 더하지 않아 네이티브에서 이미 확보한 영역을 이중으로 빼지 않는다.
- 메뉴·시작 안내·플레이·일시정지·결과·법적 안내가 실제 상하단 시스템 영역을 피하도록 한다. 스튜디오/커버 아트워크는 화면 전체를 채운다. 음악 안내가 표시될 때만 기존 44px 슬롯과 2px 오프셋을 확보한다.
- 등급 문구는 창 크기, 폰트 로딩, 실제 오버레이 크기가 바뀌면 다시 폭을 확인한다. 등장 애니메이션의 임시 확대/축소값을 측정하지 않도록 했다. 기본 서체·굵기·애니메이션 자체는 유지한다.
- 앞서 적용한 WebView `textZoom=100`, 새 아이콘, 앱 전용 저장소는 유지한다. 휴대전화 전체 화면 배율이나 돋보기 기능은 변경하지 않는다.
- 게임 규칙과 저장 소스는 기준 커밋과 동일하다. 앱 ID와 업로드 인증서도 유지한다.

## 재현 조건과 원본

변경 전은 `cae2e49b5af230a95b2f1890daf01b47b321b621`을 **별도 임시 폴더에 git archive**로 추출해 실행한 과거 버전 재현 화면이다. 현재 소스를 과거 버전으로 교체하지 않았다. 현재 설치된 의존성을 재사용했으므로 당시 전체 도구 환경까지 재현한 것은 아니다.

변경 후는 같은 커밋 위의 이번 작업 트리다. 아직 이번 작업 커밋은 없으며 주요 소스 해시를 JSON에 기록했다. 촬영일 **2026-10-01 KST** (JSON UTC 시각 `2026-09-30T15:57:47.946Z`).

- macOS Chrome **154.0.8037.58**, CSS **390×844**, DPR **2**, 원본 PNG **780×1688**.
- 새 브라우저 프로필, locale en-US, Asia/Seoul, 제어 시계 `2026-10-01T00:00:00Z`, 난수 초기값 20261001, 음악·효과음 끔.
- 전후 30개 상태 60장, 변경 후 시스템 영역 모의 입력 6장: **66장**.
- 확정 비교 자료: [reference-4/verification.json](reference-4/verification.json). 모든 PNG의 SHA-256, 주요 소스 해시, 실제 측정값과 한계를 포함한다.
- 재현 스크립트: [reference-check.mjs](reference-check.mjs). `CAPTURE_OUT`은 항상 새로운 경로로 지정한다. 게임에서 import하지 않으며 배포 자산에 포함되지 않는다.

| 상태 | 변경 전 재현 | 변경 후 |
| --- | --- | --- |
| 홈 | [before-home](reference-4/before-home.png) | [after-home](reference-4/after-home.png) |
| 설정 | [before-settings](reference-4/before-settings.png) | [after-settings](reference-4/after-settings.png) |
| 개인정보 | [before-privacy](reference-4/before-privacy.png) | [after-privacy](reference-4/after-privacy.png) |
| 1단계 시작 안내 | [before-lesson-1](reference-4/before-lesson-1.png) | [after-lesson-1](reference-4/after-lesson-1.png) |
| 1단계 2×2 | [before-stage-1](reference-4/before-stage-1.png) | [after-stage-1](reference-4/after-stage-1.png) |
| 6단계 3×3 | [before-stage-6](reference-4/before-stage-6.png) | [after-stage-6](reference-4/after-stage-6.png) |
| LIMITLESS 본게임 | [before-timeAttack-game](reference-4/before-timeAttack-game.png) | [after-timeAttack-game](reference-4/after-timeAttack-game.png) |
| TIMELESS | [before-timeless-game](reference-4/before-timeless-game.png) | [after-timeless-game](reference-4/after-timeless-game.png) |
| ENDLESS | [before-endless-game](reference-4/before-endless-game.png) | [after-endless-game](reference-4/after-endless-game.png) |
| 일시정지 | [before-timeAttack-pause](reference-4/before-timeAttack-pause.png) | [after-timeAttack-pause](reference-4/after-timeAttack-pause.png) |
| 실제 시간 종료 결과 | [before-timeout-result](reference-4/before-timeout-result.png) | [after-timeout-result](reference-4/after-timeout-result.png) |
| 등급 폭 검사용 fixture | [before-grade-fixture](reference-4/before-grade-fixture.png) | [after-grade-fixture](reference-4/after-grade-fixture.png) |

그 밖의 14·23·30단계 안내/보드, 모드별 시작/안내/일시정지, 라이선스, 종료 카드는 같은 폴더에 있다. 모의 상단24px·하단48px 적용 결과는 [게임](reference-4/after-inset-game.png), [등급](reference-4/after-inset-grade.png), [개인정보](reference-4/after-inset-privacy.png)에서 확인할 수 있다. 이는 실제 휴대전화의 시스템 바를 캡처한 것이 아니다.

## 검증 결과

- 기준 안전영역0에서 30개 상태의 추적 요소: `font-size`, `font-weight`, `font-family`, `line-height`가 원래 값과 일치. 위치/너비/높이 차이는 1.1 CSS px 미만. 화면 전체의 픽셀 동일성을 주장하지 않는다.
- 320×568부터430×932까지 8개 viewport × 안전영역2조건 ×3모드 = **48조건**에서 HUD·보드·산식이 가용 화면 안에 들어간다. 같은 조건에서 홈 메뉴와 Settings 위치도 확인했다.
- 5개 폭 ×6개 등급 = **30조건**에서 등급 글자와 하단 탭 안내가 가용 화면 안에 들어간다.
- 브라우저 오류0개. 단위 테스트 **223개/23파일**, 프로덕션 빌드, Java textZoom 라이프사이클 테스트 더블 통과.
- 서명 AAB **1.0.4/code6**의 45개 웹 자산이 dist와 바이트 단위 일치. 15개 아이콘, 기존 인증서·ID, 컴파일된 textZoom100을 검증했다. AAB에서 추출한 실제 웹 자산도5개 높이에서 기존 메뉴 크기·굵기를 유지한다. [릴리스 검증](../../releases/2026-10-01-reference-layout-aab/README.md).
- 음악 탭 안내를 수동으로 표시한 레이아웃 fixture도 4개 크기 × 안전영역 2조건에서 메뉴·Settings·안내가 화면 안에 들어간다. 이는 실제 브라우저 자동재생 차단을 재현한 시험은 아니다.
- AAB 웹 자산의 native/env 우선순위도 6조건에서 검증했다. env만 제공할 때, native만 제공할 때, 둘 다 같은 값일 때 외에 **env가 양수이고 native가 0인 경우**, env보다 native가 작은 경우를 포함한다. 네이티브에서 이미 확보한 여백을 다시 적용하지 않는 정책이다. [원본](../../releases/2026-10-01-reference-layout-aab/bundled-inset-precedence-verification.json).

## 보존한 시행착오와 미검증 사항

- `attempt-1/`, `final/`, `check.mjs`는 **사용자가 원하지 않은 Noto 일괄 적용·18/600 등의 후보**에 대한 과거 시도다. `final`이라는 폴더명에도 불구하고 이번 승인 기준이 아니다. 원본을 덮어쓰지 않았다.
- AAB **1.0.4/code5**와 `docs/releases/2026-10-01-web-app-style-aab/`도 같은 폐기 후보의 기록이다. 배포하지 않는다. 새 기준 후보는 **code6**이다.
- `reference-1/`: Chrome 샌드박스 실행 거절로 촬영 전 실패.
- `reference-2/`: 연구 스크립트의 개인정보 링크 선택자 오류로 중단. 실제 선택자로 수정했다.
- `reference-3/`: 전후30상태 비교 후 viewport matrix에서 브라우저 resize 이벤트 전에 측정해 중단. 실제 이벤트 대기 후 `reference-4/`에서 재검증했다. 이 실패를 앱 결함으로 확정하지 않았다.
- 진도/기록 fixture와 직접 호출한 등급 fixture는 화면 비교용이다. 사용자가 실제 획득한 결과가 아니다. 미디어 프레임·난수 색상은 픽셀 비교 대상이 아니다.
- **실제 Android 폰/WebView의 렌더링, 쉬운 사용 모드, 시스템 굵은 글씨, Play를 통한 업데이트와 데이터 유지 시험은 아직 필요하다.** 브라우저·정적 AAB 검증을 실기기 검증으로 대신 주장하지 않는다.
- 연구용 자료는 개발 과정 근거이며 학습 효과·사용성 개선에 대한 사용자 실험 결과가 아니다.
