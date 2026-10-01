# 2026-10-01 — 블록 재탭 취소와 흰 화면 배경

## 문제/요청

사용자는 선택한 숫자 블록을 다시 눌러도 취소되지 않는 것 같다고 보고했다. 은은한 그라데이션 화면 바탕은 단색 흰색으로 바꾸고, 기존 서체·크기·굵기·배치를 보존하기로 했다. AAB는 다른 수정과 함께 나중에 한 번에 만들도록 요청했다.

## 무엇을 왜 바꿨는가

- `BoardView`는 재탭 시 선택을 삭제했지만, 같은 터치에서 손가락이 조금 움직이면 드래그 경로가 방금 취소한 블록을 다시 추가했다. 변경 전 소스로 3 CSS px 움직임을 전달해 이 현상을 재현했다.
- 취소한 제스처는 손을 뗄 때까지 종료 상태로 둔다. 다른 선택은 유지하고 산식은 즉시 갱신한다. 다음 터치에서 다시 선택하거나 드래그할 수 있다. 취소는 정답/오답 확정이 아니므로 점수·오답 벌점 없이 처리한다.
- 루트와 앱 바탕을 `#FFFFFF`로 설정하고 홈의 노란/베이지 그라데이션, 앱 가장자리 색 번짐, 게임 상단 보라색 그라데이션을 제거했다. 모드 시작·Settings도 흰 앱 바탕을 공유한다. 브라우저 `theme-color`도 흰색이다.
- 로고·커버 이미지와 주황 스튜디오 오프닝, 블록 색, 카드/버튼의 기존 따뜻한 면색·입체 그림자는 보존했다. 배경 변경을 이유로 글씨 크기·굵기·서체를 다시 정하지 않았다. 기존 OS 서체 스택과 명시된 Noto 사용 위치를 유지한다.
- 안전영역, 확대율 고정, 아이콘, 저장소 등 앞서 진행한 변경을 그대로 보존했다. 다른 게임 저장소는 수정하지 않았다.

## 재현 조건과 원본

변경 전은 `cae2e49b5af230a95b2f1890daf01b47b321b621`을 **별도 임시 폴더에 git archive**로 추출한 뒤, 이번 수정 직전의 `src/`, `index.html`, `vite.config.ts`를 복사해 실행한 재현 화면이다. 이전 작업의 안전영역/등급 변경이 아직 미커밋 상태였기 때문에, **순수한 해당 커밋의 출시 화면이라고 주장하지 않는다.** 이 선행 변경은 전후 양쪽에 동일하게 포함된다. 현재 작업 소스를 과거 버전으로 교체하지 않았다.

직전 소스는 [before-source-overlay.tar.gz](before-source-overlay.tar.gz)에 보존했다. SHA-256: `009a1613c5cbc2196ccaeabfa6344eca0f000b9649c2643725c38c45328ac57c`.

- 실제 재현 촬영일: **2026-10-01 KST**, 확정 JSON 시각 `2026-10-01T00:43:08.440Z`.
- Chrome **154.0.8037.58**, 새 프로필, locale en-US, Asia/Seoul, CSS **390×844**, DPR **2**, 원본 PNG **780×1688**.
- 제어 시계 `2026-10-01T00:00:00Z`, 난수 초기값 20261001, 음악/효과음/진동 끔. 진도와 비교용 최고기록은 고정 fixture다.
- 전후 모두 일회 애니메이션은 종료 상태, 반복 애니메이션은 시작 위상에 고정했다. 촬영 도구만 제어하며 게임의 반짝임/애니메이션 코드는 바꾸지 않았다.
- 확정 원본: [check-2/verification.json](check-2/verification.json). **11상태 × 전후 = 22장**의 SHA-256, 주요 소스 해시, 실제 측정값과 입력 검증 결과를 포함한다.

| 상태 | 변경 전 재현 | 변경 후 |
| --- | --- | --- |
| 홈 | [before-home](check-2/before-home.png) | [after-home](check-2/after-home.png) |
| Settings | [before-settings](check-2/before-settings.png) | [after-settings](check-2/after-settings.png) |
| 1단계 2×2 | [before-lesson-1-game](check-2/before-lesson-1-game.png) | [after-lesson-1-game](check-2/after-lesson-1-game.png) |
| 6단계 3×3 | [before-lesson-6-game](check-2/before-lesson-6-game.png) | [after-lesson-6-game](check-2/after-lesson-6-game.png) |
| LIMITLESS 시작 | [before-limitless-intro](check-2/before-limitless-intro.png) | [after-limitless-intro](check-2/after-limitless-intro.png) |
| LIMITLESS 본게임 | [before-limitless-game](check-2/before-limitless-game.png) | [after-limitless-game](check-2/after-limitless-game.png) |
| 재탭 중 작은 움직임 후 | [before-cancel-motion](check-2/before-cancel-motion.png) | [after-cancel-motion](check-2/after-cancel-motion.png) |
| TIMELESS 시작 | [before-timeless-intro](check-2/before-timeless-intro.png) | [after-timeless-intro](check-2/after-timeless-intro.png) |
| TIMELESS 게임 | [before-timeless-game](check-2/before-timeless-game.png) | [after-timeless-game](check-2/after-timeless-game.png) |
| ENDLESS 시작 | [before-endless-intro](check-2/before-endless-intro.png) | [after-endless-intro](check-2/after-endless-intro.png) |
| ENDLESS 게임 | [before-endless-game](check-2/before-endless-game.png) | [after-endless-game](check-2/after-endless-game.png) |

## 결과와 검증

- 유닛 테스트 **223개/23파일**, 타입 검사 포함 프로덕션 빌드 통과.
- LIMITLESS 2·3·4·5블록 학습/본게임, TIMELESS, ENDLESS의 7가지 입력 fixture × 터치/마우스 = **14조건**에서 변경 전 재선택 문제를 재현하고 변경 후 취소 유지를 확인했다. 실제 pointermove 전달도 확인했다.
- 3개 이상 학습과 본게임 조건에서는 다른 선택을 남기며 한 블록만 취소하고, 산식이 남은 숫자/합계로 즉시 갱신된다. 마지막 선택 취소는 `SUM = ?`로 돌아간다. 취소 후 재선택, 새로운 드래그로 `1+2+7=10`, 실제 오답 `9+3=12` 처리도 확인했다. 변경 후 검사 묶음은 총 **16개**다.
- 실제 App 화면에서도 1·6단계와 세 모드 본게임의 **5조건**을 전후 검증했다. 취소 시 표시된 시간/점수가 바뀌지 않고 오답 표시·`−1`도 생기지 않았다. 이 검증은 제어 시계 하에서 수행했다.
- 11개 비교 상태의 추적 요소에서 `font-size`, `font-weight`, `font-family`, `line-height`가 일치했다. 동일한 선택 상태인 10개 화면의 위치·폭·높이 차이는 0.1 CSS px 미만이다. 취소 비교 화면은 선택/산식 변화로 일부 박스 크기가 의도적으로 달라지므로 배치 동일성 검사에서 제외했다.
- 홈·시작·게임·Settings의 배경 이미지가 `none`이고, 루트/앱 바탕은 흰색임을 실제 computed style로 확인했다. 원본 홈·게임 PNG도 육안 확인했다. 브라우저 실행 오류 0개.

## 한계와 보존한 시도

- 실제 Android/WebView에서 손가락으로 확인하는 시험은 아직 필요하다. Chrome 터치 검증을 실기기 시험으로 대신 주장하지 않는다.
- `check-1/`은 반복 반짝임의 위상을 고정하지 않아 1단계 타일 y좌표가 약 0.28 CSS px 달랐던 첫 촬영이다. 입력 검사는 통과했으나 엄격한 배치 비교에서 중단했다. 도구의 촬영 조건을 고친 `check-2/`를 확정 자료로 사용하며 첫 원본은 덮어쓰지 않았다.
- AAB·릴리스 버전은 이번 작업에서 만들거나 변경하지 않았다. 기존 배포 파일에는 이번 수정이 들어 있지 않다. Git push도 수행하지 않았다.
- 연구/검증 도구와 보존 소스는 게임에서 import하지 않으며 배포 런타임에 포함하지 않는다. 학습 효과나 사용자 만족도 실험의 결과가 아니다.

## 다시 검증하기

프로젝트 루트에서 Playwright/Chrome 환경을 준비한 뒤 새 경로를 지정한다. [check.mjs](check.mjs)는 보존 커밋과 직전 소스 overlay를 별도 임시 폴더에서 재구성하고, [입력 회귀 검사](../../../tests/browser/selection-toggle.mjs)를 함께 실행한다. 현재 설치된 의존성을 재사용하며 과거의 전체 도구 환경까지 재현하지 않는다.

```sh
CAPTURE_OUT=docs/research/2026-10-01-white-background-toggle/recheck-new node docs/research/2026-10-01-white-background-toggle/check.mjs
```

환경에 따라 `PLAYWRIGHT_MODULE`과 `CHROME_PATH`를 지정할 수 있다. `BEFORE_SOURCE`는 이미 보존된 직전 소스의 별도 임시 폴더를 직접 지정할 때만 사용한다. 기존 촬영 폴더는 덮어쓰지 않는다.
