# 2026-10-01 — 변경 범위 정정: 컬러 블록 복원

## 문제/요청

이전 회색 UI 작업에서 제작 에이전트가 사용자 요청 범위를 넓게 해석하여 숫자 블록까지 흰색/회색으로 변경했다. 사용자는 **게임 블록은 원래대로, 배경과 게임 선택·일시정지·뒤로가기 같은 UI 버튼만 흰색/회색**이라고 정정했다. 이전 회색 블록 후보의 기록과 원본은 삭제하거나 덮어쓰지 않았다. 이번 문서가 최종 범위 기준이다.

## 무엇을 왜 바꿨는가

- 기존 코드에 있던 9색 팔레트, 블록별 랜덤 색상 표시, 흰 숫자, 면색 그라데이션, 베벨/그림자를 복원했다. 눈대중으로 새 색을 고르지 않았다.
- 선택 시 연한 크림 면/주황 링, 정답 링, 튜토리얼 금빛 안내와 오답 블록의 빨간 효과를 복원했다. 산식 숫자 칩도 블록의 원래 색으로 돌아왔다.
- 블록 전용 색상/그림자 토큰을 UI 토큰에서 분리했다. 메뉴·시작·뒤로가기·일시정지·도구·Settings 버튼은 계속 평면 흰색/회색이며, 선택한 블록의 색이 버튼으로 번지지 않는다.
- 화면과 판 프레임/빈칸의 흰색·회색 바탕, 로고 뒤 drop-shadow 제거는 유지한다. 숫자의 크기·굵기·서체 스택, 배치, 랜덤 색 배분 로직, 규칙·저장소·재탭 취소 수정은 변경하지 않았다.

## 변경 전 재현·비교 기준

기준 커밋은 `cae2e49b5af230a95b2f1890daf01b47b321b621`이다. 별도 임시 폴더에 **git archive**로 추출한 뒤 다음 미커밋 소스 snapshot을 겹쳐 실행했다. 현재 작업 소스를 과거 버전으로 교체하지 않았다. 두 기준 모두 순수한 출시 커밋의 화면이 아니라 **당시 작업 후보를 재현한 화면/스타일**이다.

- 전후 캡처의 변경 전: 사용자 정정 직전의 회색 블록 후보. [before-source-overlay.tar.gz](before-source-overlay.tar.gz), SHA-256 `ee57241d754789476ade23c58f15a62c84943c25687ed0d9f906fa8605ab5cad`.
- 컬러 블록 복원 기준: 상위 기록에 보존된 [회색 UI 작업 전 snapshot](../before-source-overlay.tar.gz), SHA-256 `659ea40f44b6f81574c7982525a816e449cc19d88edad5965e08dd862a2e5ab1`. 화면 전체가 아니라 블록/산식 칩 관련 원래 CSS 계산값만 비교한다.
- 변경 후: 이번 정정이 반영된 작업 트리. 커밋·릴리스 버전은 아직 추가하지 않았다. 각 소스/PNG의 SHA-256은 촬영 JSON에 있다.

## 촬영 조건과 전후 화면

실제 재현 촬영일은 **2026-10-01 KST**, 최종 촬영 JSON 시각은 `2026-10-01T01:37:14.027Z`다. Chrome 154.0.8037.58, **390×844 CSS px / DPR 2 / 780×1688 PNG**, 신규 프로필, en-US/Asia-Seoul, 제어 시계 `2026-10-01T00:00:00Z`, 난수 초기값 20261001, 소리/진동 끔. 한 번짜리 애니메이션은 종료, 반복은 시작 위상에 고정했다. 같은 조건에서 실제 App 화면을 캡처했다. 비교용 진도/최고기록은 테스트 fixture다.

| 화면 | 변경 전 회색 후보 재현 | 변경 후 |
| --- | --- | --- |
| 홈 | [before](check-3/before-home.png) | [after](check-3/after-home.png) |
| Settings | [before](check-3/before-settings.png) | [after](check-3/after-settings.png) |
| 1단계 | [before](check-3/before-lesson-1-game.png) | [after](check-3/after-lesson-1-game.png) |
| 6단계 | [before](check-3/before-lesson-6-game.png) | [after](check-3/after-lesson-6-game.png) |
| 14단계 | [before](check-3/before-lesson-14-game.png) | [after](check-3/after-lesson-14-game.png) |
| 23단계 | [before](check-3/before-lesson-23-game.png) | [after](check-3/after-lesson-23-game.png) |
| LIMITLESS | [before](check-3/before-limitless-game.png) | [after](check-3/after-limitless-game.png) |
| 블록 선택·산식 | [before](check-3/before-limitless-selected.png) | [after](check-3/after-limitless-selected.png) |
| 오답 산식 | [before](check-3/before-limitless-wrong.png) | [after](check-3/after-limitless-wrong.png) |
| 일시정지 | [before](check-3/before-pause.png) | [after](check-3/after-pause.png) |
| TIMELESS | [before](check-3/before-timeless-game.png) | [after](check-3/after-timeless-game.png) |
| ENDLESS | [before](check-3/before-endless-game.png) | [after](check-3/after-endless-game.png) |

## 검증·결과

최종 결과는 [check-3/verification.json](check-3/verification.json)에 기록했으며 **전체 통과**했다. 촬영된 최종 소스 해시도 현재 파일과 일치한다. 검증 스크립트는 [check.mjs](check.mjs)이며 게임 런타임에 import하지 않는다.

- 223개/23파일 단위 테스트 및 타입 검사 포함 프로덕션 빌드 통과.
- 12상태의 전후 PNG 24장. 675개 가시 요소(화면 간 반복·블록 포함)의 위치/크기·서체/글자 크기/굵기/행간이 일치했다. 기록한 배치 차이는 0 CSS px다.
- 원래 9색 블록·선택·정답 링·튜토리얼 목표·오답 블록·산식 칩의 22개 CSS fixture에서 면색/색상/테두리/그림자/outline 계산값이 원래 소스와 정확히 일치했다. fixture 자체를 게임 화면인 것처럼 캡처하지 않았다.
- UI 표면은 직전 회색 후보와 일치했다. 단색·무채색·메뉴/주 버튼/아이콘 버튼 그림자 없음·로고 filter 없음 검사도 통과했다.
- 전후 각각 16묶음 터치/마우스 입력 회귀 검사와 실제 App 7조건(1·6·14·23단계, 세 모드)의 재탭 취소/산식/벌점 없음 검사 통과. 오답 `9+3=12` 결과 유지도 확인했다.
- 홈·본게임·블록 선택 원본을 육안 확인했다. 브라우저 앱 오류 0개이며 `boardView.ts` 전후 해시가 같아 직전 취소 수정이 보존됐다.

## 한계·시행착오

- `check-1`은 반복되는 메뉴 이름 요소를 id/class만으로 찾아 첫 번째 요소와 잘못 비교하여 중단했다. 앱의 크기 문제는 아니었고 검증 도구를 DOM 순서별 비교로 정정했다. `check-2`에서 전체 검사가 통과했다. 이후 산식 색을 설명하는 CSS 주석만 정리하고 최종 소스를 `check-3`으로 다시 촬영/검증했다. 기존 결과는 보존했다.
- Chrome/macOS 검증이며 실제 Android 폰의 렌더링·터치는 별도 확인이 필요하다. 학습 효과나 사용자 선호도 실험 결과가 아니다.
- 현재 의존성을 재사용한 재현이며 당시 전체 실행 환경 복제는 아니다. 이번 정정에서는 다른 게임 저장소, AAB, 앱 버전, 커밋/push를 변경하지 않았다. AAB는 사용자의 요청대로 추후 한 번에 만든다.

재검증은 프로젝트 루트에서 새 `CAPTURE_OUT`으로 실행한다. `PLAYWRIGHT_MODULE`/`CHROME_PATH`를 지정할 수 있다. `BEFORE_SOURCE`와 `COLOR_REFERENCE`를 생략하면 보존 overlay와 git archive로 임시 소스를 재구성한다. 확정 출력은 덮어쓰지 않는다.
