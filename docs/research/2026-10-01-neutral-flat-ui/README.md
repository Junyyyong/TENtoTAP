# 2026-10-01 — 흰색·회색의 평면 UI

> **후속 범위 정정:** 아래는 숫자 블록까지 회색으로 해석했던 작업 후보의 보존 기록이다. 사용자는 배경/일반 UI 버튼만 회색으로 요청했다고 정정했으며, 게임 블록은 원래 컬러로 복원했다. 최종 기준과 추가 전후 화면은 [컬러 블록 복원](color-blocks-correction/README.md)을 참고한다. 기존 자료는 덮어쓰지 않았다.

## 문제/요청

직전 변경은 화면 바탕만 흰색으로 바꾸고 컬러 블록, 버튼 그라데이션과 로고 뒤 그림자를 보존했다. 사용자는 첨부한 회색 계열 게임 화면을 참고해 **블록과 다른 버튼도 흰색/회색으로 구분하고, 그라데이션과 로고 뒤 그림자는 없애 달라**고 요청했다. 참고 화면의 게임 규칙이나 화면 배치를 복제하는 요청으로 해석하지 않았다.

## 무엇을 왜 바꿨는가

- 화면 바탕은 흰색을 유지한다. 숫자 블록은 흰 단색, 선택 블록/빈 칸은 서로 다른 회색 면색, 숫자는 진한 회색으로 표시한다. 무지개 색상과 블록의 베벨/입체 그림자를 제거했다.
- 내부 블록 ID와 색상 ID 생성 로직은 그대로지만, 이번 테마에서 모든 색상 ID가 같은 흰 면색을 사용한다. 숫자별 색 구분이나 랜덤 색 구분이 보이지 않는다. 산식 숫자 칩은 선택 블록처럼 회색 바탕/진한 숫자로 표시한다.
- 홈 메뉴, 뒤로/일시정지, 시작/재시작, 도구, Settings와 스위치 등을 단색 흰색·회색으로 바꿨다. 주 버튼은 밝은 회색, 보조 버튼은 흰색, 테두리는 회색이다. 눌린 상태도 단색 회색이다. 스위치는 회색 대비와 손잡이 위치로 켜짐/꺼짐을 구분한다.
- `brand-mark`의 drop-shadow를 제거했다. 원래 로고 그림 자체의 색/윤곽은 그대로다. 커버 이미지, 런처 아이콘, 캐릭터 영상, 주황 스튜디오 오프닝 자산은 변경하지 않았다. 모드 안내의 시계/무한대 그림은 화면에서만 grayscale 필터로 회색 처리한다.
- 튜토리얼 목표의 은은한 반짝임은 회색 링으로 유지한다. 오답의 흔들림과 산식 결과를 유지하고, 오답 산식 테두리는 회색 점선으로 구분한다. 시간 벌점 표시도 진한 회색으로 바뀌며 동작/표시 시간은 그대로다.
- **서체 스택·크기·굵기·배치·반응형 규칙은 수정하지 않았다.** 직전의 재탭 취소 수정과 안전영역/저장 기능도 그대로다. 이번 게임 실행 소스 변경은 CSS뿐이다. 다른 게임 저장소는 변경하지 않았다.

## 과거 화면 재현과 촬영 조건

변경 전은 기준 커밋 `cae2e49b5af230a95b2f1890daf01b47b321b621`을 **별도 임시 폴더에 git archive**로 추출한 뒤, 이번 작업 직전에 복사한 `src/`, `index.html`, `vite.config.ts`를 겹쳐 실행한 화면이다. 선행 안전영역/등급/흰 배경/선택 취소 작업이 미커밋 상태였으므로 **순수한 기준 커밋의 출시판이라고 주장하지 않는다.** 현재 작업 소스를 과거 버전으로 바꾸지 않았다.

변경 직전 소스를 [before-source-overlay.tar.gz](before-source-overlay.tar.gz)에 보존했다. SHA-256: `659ea40f44b6f81574c7982525a816e449cc19d88edad5965e08dd862a2e5ab1`. 변경 후는 같은 작업 트리의 이번 CSS 수정 상태이며 아직 별도 커밋/릴리스 버전은 없다.

- 재현 촬영일 **2026-10-01 KST**, 확정 촬영 JSON 시각 `2026-10-01T01:01:52.704Z`.
- Chrome **154.0.8037.58**, CSS **390×844**, DPR **2**, PNG **780×1688**.
- 새 브라우저 프로필, en-US, Asia/Seoul, 제어 시계 `2026-10-01T00:00:00Z`, 난수 초기값 20261001. 비교용 진도/최고기록은 fixture이며 실제 획득 기록이 아니다.
- 음악/효과음/진동은 기본 끔. Settings 켜짐 화면에서만 음악 스위치를 켠 뒤 다시 껐다.
- 일회 애니메이션은 종료, 반복 애니메이션은 시작 위상에 고정했다. 촬영 도구의 제어이며 게임 애니메이션 코드를 끄는 변경은 아니다.
- 확정 자료는 [check-2/verification.json](check-2/verification.json). **15상태 전후 30장**의 SHA-256, 소스 해시, 실제 스타일/배치 측정, 입력 검증과 한계를 기록했다.

| 비교 상태 | 변경 전 재현 | 변경 후 |
| --- | --- | --- |
| 홈 | [before-home](check-2/before-home.png) | [after-home](check-2/after-home.png) |
| 홈 메뉴 눌림 | [before-home-pressed](check-2/before-home-pressed.png) | [after-home-pressed](check-2/after-home-pressed.png) |
| Settings 꺼짐 | [before-settings-off](check-2/before-settings-off.png) | [after-settings-off](check-2/after-settings-off.png) |
| Settings 켜짐 | [before-settings-on](check-2/before-settings-on.png) | [after-settings-on](check-2/after-settings-on.png) |
| 1단계 2×2 | [before-lesson-1-game](check-2/before-lesson-1-game.png) | [after-lesson-1-game](check-2/after-lesson-1-game.png) |
| 6단계 3×3 | [before-lesson-6-game](check-2/before-lesson-6-game.png) | [after-lesson-6-game](check-2/after-lesson-6-game.png) |
| LIMITLESS 시작 | [before-limitless-intro](check-2/before-limitless-intro.png) | [after-limitless-intro](check-2/after-limitless-intro.png) |
| LIMITLESS 본게임 | [before-limitless-game](check-2/before-limitless-game.png) | [after-limitless-game](check-2/after-limitless-game.png) |
| 블록 선택/산식 | [before-limitless-selected](check-2/before-limitless-selected.png) | [after-limitless-selected](check-2/after-limitless-selected.png) |
| 오답 결과 | [before-limitless-wrong](check-2/before-limitless-wrong.png) | [after-limitless-wrong](check-2/after-limitless-wrong.png) |
| 일시정지 버튼 | [before-pause](check-2/before-pause.png) | [after-pause](check-2/after-pause.png) |
| TIMELESS 시작 | [before-timeless-intro](check-2/before-timeless-intro.png) | [after-timeless-intro](check-2/after-timeless-intro.png) |
| TIMELESS 게임 | [before-timeless-game](check-2/before-timeless-game.png) | [after-timeless-game](check-2/after-timeless-game.png) |
| ENDLESS 시작 | [before-endless-intro](check-2/before-endless-intro.png) | [after-endless-intro](check-2/after-endless-intro.png) |
| ENDLESS 게임 | [before-endless-game](check-2/before-endless-game.png) | [after-endless-game](check-2/after-endless-game.png) |

## 검증 결과

- 유닛 테스트 **223개/23파일** 및 타입 검사 포함 프로덕션 빌드 통과.
- 15상태의 추적 요소 **105개**에서 기존 `font-family`, `font-size`, `font-weight`, `line-height`가 일치했다. 기록한 위치/폭/높이의 전후 차이는 **0 CSS px**였다. 전체 화면의 픽셀 동일성을 뜻하지 않으며 색과 그림자는 의도적으로 바뀌었다.
- 변경 후 가시 표면 측정 **603개**(화면 간 반복·블록 포함)에서 그라데이션이 없고 색상이 흰색/차가운 회색 범위임을 확인했다. RGB 채널 차이 32 이하를 중립색 검사 기준으로 사용했다. 로고 filter는 `none`, 메뉴/주 버튼/아이콘 버튼/스위치의 입체 그림자는 `none`, 살아 있는 일반 블록은 흰 면/그라데이션 없음/숫자 text-shadow 없음이다.
- 입력 회귀 검사 전후 각각 **16묶음** 통과. 2·3·4·5블록 학습과 세 모드 조건에서 터치/마우스 재탭 취소, 일부 선택 유지, 산식 갱신, 취소 후 새 드래그 정답 및 실제 오답을 검증했다.
- 실제 App의 1·6단계와 세 모드 본게임 **5조건**을 양쪽에서 확인했다. 취소 후 선택이 비워지고, 표시 시간/점수·오답·벌점이 바뀌지 않는다. `9+3=12` 오답 산식도 그대로 남는다.
- 홈·선택된 게임·Settings 켜짐·일시정지 원본을 육안으로 확인했다. 앱 브라우저 오류 0개. 게임 입력 소스 `boardView.ts`의 전후 SHA-256이 같아 직전 취소 수정이 유지됐음을 함께 확인했다.

## 한계/시행착오

- 실제 Android 폰/WebView의 렌더링과 터치는 별도 확인이 필요하다. 데스크톱 Chrome 터치 검증을 실기기 검증으로 대신 주장하지 않는다.
- `check-1/`은 중립색 검사 기준을 RGB 채널 차이 24 이하로 두어 선택 테두리 `rgb(112,123,139)`의 차이 27에서 중단했다. 차가운 회색을 포함하려는 디자인에 비해 검사 범위가 좁았다. CSS 색상을 바꾸지 않고 검사 기준을 32로 정비한 `check-2/`에서 전체 검증을 완료했다. 첫 촬영 원본은 보존했다.
- 연구용 자료는 개발 근거이며 학습 효과나 사용자 선호도의 실험 결과가 아니다. 비교 도구/보존 소스는 게임에서 import하지 않고 배포 런타임에 포함하지 않는다.
- **AAB 생성·버전 변경·커밋/push는 수행하지 않았다.** 기존 AAB와 원격 배포판에는 이 테마가 아직 들어 있지 않다. 사용자의 요청대로 AAB는 추후 수정 사항을 묶어 만든다.

## 재검증

[check.mjs](check.mjs)는 기준 커밋과 보존 overlay를 임시 폴더에서 재구성한다. 현재 설치된 의존성을 재사용하므로 과거 전체 실행 환경을 재현한 것은 아니다. 프로젝트 루트에서 Playwright/Chrome을 준비하고 새 출력 경로를 지정한다.

```sh
CAPTURE_OUT=docs/research/2026-10-01-neutral-flat-ui/recheck-new node docs/research/2026-10-01-neutral-flat-ui/check.mjs
```

필요하면 `PLAYWRIGHT_MODULE`, `CHROME_PATH`, 이미 보존된 임시 소스의 `BEFORE_SOURCE`를 지정한다. 기존 출력 경로는 덮어쓰지 않는다.

## 후속 미세 조정 — 박스 면만 아주 연한 회색

사용자는 컬러 블록 복원 결과를 승인한 뒤 시간/BEST/SCORE/합계/일시정지/게임 선택 같은 박스가 흰 배경에서 은은하게 구분되도록 아주 약한 회색을 요청했다. 같은 주요 디자인 작업의 면색 조정으로 묶는다.

- 공통 UI 면색 `--panel-lit`만 `#ffffff` → **`#f5f6f8`**로 변경했다. 메뉴·통계·합계·뒤로/일시정지·도구·일시정지 창과 같은 UI 표면이 일관되게 바뀐다. 기존 눌림/정답/주 버튼 구분은 유지한다.
- 화면 바탕은 흰색이고, 원래 컬러 블록·그라데이션·선택 효과·산식 칩·로고/커버·서체·크기·굵기·배치·입력/규칙/저장소는 그대로다. 로고 뒤 그림자는 계속 없다.
- 변경 전은 기준 커밋 `cae2e49b5af230a95b2f1890daf01b47b321b621`을 별도 임시 폴더에 git archive로 추출하고 직전 작업 소스를 겹쳐 재현했다. 출시 커밋 그대로가 아니라 미커밋 컬러 블록 복원 후보다. 현재 소스는 과거판으로 교체하지 않았다. [보존 overlay](light-panels/before-source-overlay.tar.gz)의 SHA-256은 `f8f57a6ebe3eea86b4b237c78b2c10206a9e1965462d097867dc041eeabc0475`이다.
- 촬영은 **2026-10-01 KST**(`2026-10-01T01:47:35.023Z`), Chrome 154.0.8037.58, **390×844 CSS px / DPR 2 / 780×1688 PNG**, 신규 en-US/Asia-Seoul 프로필, 제어 시계 `2026-10-01T00:00:00Z`, 퍼즐/표시 색 난수 각각 20261001, 소리/진동 끔. 비교용 기록/진도는 fixture이며 현재 의존성을 재사용했다. 애니메이션 위상은 상위 기록과 같다.
- [최종 검증 JSON](light-panels/check-2/verification.json): 6상태 전후 **12장**, 372개 요소에서 35개 UI 박스의 면색만 바뀌었다. 블록 색·효과와 나머지 표면, 모든 측정 요소의 크기·위치·서체·굵기는 정확히 일치했다. 브라우저 오류 0개, 223개 단위 테스트·프로덕션 빌드 통과. 홈/본게임 PNG를 육안 확인했다.
- 첫 검사 `light-panels/check-1`은 퍼즐 난수만 제어하고 표시 색의 별도 `crypto.getRandomValues`는 제어하지 않아 서로 다른 랜덤 색을 같아야 한다고 비교하면서 중단했다. 게임 소스는 바꾸지 않고 촬영 프로필에서만 표시 색 난수도 고정한 `check-2`로 비교/검증했다. 첫 결과는 보존한다. 앞선 기록의 랜덤 색 배치와는 다를 수 있다.
- [추가 촬영 도구](light-panels/check.mjs)는 게임에 import하지 않는다. 실제 Android 렌더링은 별도 확인이 필요하며 AAB/버전/커밋/push·다른 저장소는 이번 조정에서 변경하지 않았다.

| 상태 | 이전 흰 박스 후보 재현 | 연회색 박스 |
| --- | --- | --- |
| 홈 | [before](light-panels/check-2/before-home.png) | [after](light-panels/check-2/after-home.png) |
| Settings | [before](light-panels/check-2/before-settings.png) | [after](light-panels/check-2/after-settings.png) |
| LIMITLESS | [before](light-panels/check-2/before-limitless.png) | [after](light-panels/check-2/after-limitless.png) |
| 일시정지 | [before](light-panels/check-2/before-pause.png) | [after](light-panels/check-2/after-pause.png) |
| TIMELESS | [before](light-panels/check-2/before-timeless.png) | [after](light-panels/check-2/after-timeless.png) |
| ENDLESS | [before](light-panels/check-2/before-endless.png) | [after](light-panels/check-2/after-endless.png) |
