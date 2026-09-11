# 홈 모드 순서와 시작 안내

## 요청과 확인

사용자가 홈의 ENDLESS와 TIMELESS 순서를 바꾸고, 두 모드에도 반투명 검은 시작 안내를 추가하도록 요청했다. LIMITLESS 첫 안내도 두 블록으로 10을 만들라는 내용으로 바꾼다.

요청 초안에는 ENDLESS도 10·20·30을 만들도록 적혀 있었으나, 현재는 10만 인정하는 규칙임을 확인해 질문했다. 사용자는 **규칙 유지, ENDLESS 안내는 10만**으로 선택했다. TIMELESS는 실제로 2–5개가 가능하므로 초안에서 빠진 네 블록도 안내에 포함했다.

## 변경

- 홈 순서: LIMITLESS → TIMELESS → ENDLESS. 작은 설명과 버튼 크기는 유지한다.
- LIMITLESS 첫 안내: `USE 2 BLOCKS / TO MAKE 10`.
- TIMELESS: `USE 2–5 BLOCKS / TO MAKE 10, 20 OR 30. / CLEAR ALL BLOCKS.`
- ENDLESS: `USE 2–5 BLOCKS / TO MAKE 10. / KEEP CLEARING AS / MORE BLOCKS APPEAR.`
- 실제 화면에서는 / 대신 줄바꿈을 사용하고 목표 문단 사이를 띄운다. 두 긴 안내는 모바일에서 6vw(22–34px), 행간 1.35로 표시한다. 기존 LIMITLESS 단계 안내는 크기를 유지한다.
- 기존 반투명 검은 배경과 깜빡이는 Tap to start를 재사용한다. 새 게임 시작 시 안내 중 시계·판 입력·ENDLESS 블록 추가를 멈추고 탭 후 시작한다. 영상 이후 일반 재개 때 두 모드 안내를 반복해서 띄우지는 않는다.
- 숫자 규칙·점수·영상 일정·테스트용 1단계 시작 정책은 변경하지 않았다.

## 전후 재현

이전 커밋 `27b74fd`를 git archive로 별도 임시 폴더에 추출한 **과거 버전 재현 화면**이다. 실제 촬영일은 2026-09-11이며 당시 촬영물이 아니다. 이후는 해당 커밋 기반 이번 작업 소스다. 현재 소스나 기존 연구 원본을 과거 버전으로 덮어쓰지 않았다.

Chrome / 390×844 CSS px / DPR 2 / **780×1688 PNG**. 신규 프로필·같은 고정 시계·게임 난수 초기값을 사용하고 색상 crypto 난수는 고정하지 않는다. 각 모드를 홈에서 새로 시작했다. 이전 ENDLESS·TIMELESS는 START 직후 게임이 실행되는 반면 이후는 탭 대기 상태이므로 비교 시 상태 차이가 있다.

| 화면 | 이전 | 이후 |
|---|---|---|
| 홈 순서 | [PNG](before-menu.png) | [PNG](after-menu.png) |
| LIMITLESS 시작 | [PNG](before-timeAttack-start.png) | [PNG](after-timeAttack-start.png) |
| TIMELESS 시작 | [PNG](before-timeless-start.png) | [PNG](after-timeless-start.png) |
| ENDLESS 시작 | [PNG](before-endless-start.png) | [PNG](after-endless-start.png) |

탭 후 조작: [LIMITLESS](after-timeAttack-playing.png), [TIMELESS](after-timeless-playing.png), [ENDLESS](after-endless-playing.png).

## 검증

- 테스트 143개와 프로덕션 빌드 통과. 첫 단계 안내 기대 문구를 갱신했으며 기존 규칙 테스트는 그대로 통과한다.
- 모바일 Chrome에서 홈 순서, 세 모드 안내, 2초 대기 중 시계·숫자판 유지, 시작 탭의 선택 누출 없음, 탭 후 숫자 선택 가능을 확인했다. ENDLESS는 이후 4초 진행 시 숫자판에 블록이 추가되는 것도 확인했다.
- 브라우저 예외 없음. 실기기 Safari와 사용자 이해도·학습 효과는 검증하지 않았다.
- [verification.json](verification.json)에 촬영 시각·브라우저 버전·PNG SHA-256을 보존한다. [check.mjs](check.mjs)는 게임에 import하지 않는 연구용 스크립트다. 후속 캡처는 새 경로를 사용한다.
