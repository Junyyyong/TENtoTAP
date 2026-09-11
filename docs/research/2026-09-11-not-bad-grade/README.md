# 0점 NOT BAD 등급과 영상

## 요청과 변경

사용자가 전혀 성공하지 못했을 때 NOT BAD 등급과 새 영상을 표시하도록 요청했다. 이를 0점 종료로 해석해 알리고 구현했다. 사용자가 Git에 올린 `989471e`의 movie/6-notbad.webm, mp4, mp3를 그대로 public/movie/6.webm, 6-hevc.mp4, 6.mp3로 복사해 기존 재생 경로에 연결했다. 원본은 보존했고 영상은 재편집하지 않았다. MP4는 HEVC이며 길이는 5초다.

| LIMITLESS·ENDLESS 점수 | 등급 |
|---|---|
| 0 | NOT BAD! |
| 1–299 | GOOD TRY! |
| 300–599 | GREAT! |
| 600–999 | AMAZING! |
| 1000–1399 | UNBELIEVABLE!! |
| 1400 이상 | OH MY GOD~! |

TIMELESS는 기존처럼 전체 클리어 시간으로 판정한다. 3분 미만 OH MY GOD, 3분 이상 5분 미만 UNBELIEVABLE, 5분 이상 8분 미만 AMAZING, 8분 이상 GREAT. 미완료는 0점이면 NOT BAD, 점수가 있으면 GOOD TRY다. 기존 클리어 시간 구간과 보너스 GREAT 영상은 바꾸지 않았다. 시간 초과/종료 결과 카드의 대기 시간도 그대로다.

## 전후 재현

이전 `989471e`는 사용자 영상 업로드까지만 포함하고 아직 연결하지 않은 커밋이다. git archive로 별도 임시 폴더에 추출한 **과거 버전 재현**이며 실제 촬영일은 2026-09-11이다. 이후는 해당 커밋 기반 이번 작업 소스다. 기존 소스·연구 원본을 덮어쓰지 않았다.

Chrome, 390×844 CSS px / DPR 2, **780×1688 PNG**. 신규 프로필·같은 고정 시계·게임 난수 초기값으로 LIMITLESS 1단계를 시작하고 아무 정답도 누르지 않은 채 시간 초과시켰다. 색 난수와 실제 영상 프레임은 고정하지 않아 프레임 차이가 있을 수 있다.

- [이전 0점 GOOD TRY](before-zero-score-video.png)
- [이후 0점 NOT BAD](after-zero-score-video.png)

## 검증과 원본

테스트 144개와 빌드 통과. 점수 경계·영상 선택·TIMELESS 0점/점수 있는 미완료·기존 시간 판정을 검사했다. 모바일 Chrome에서 실제 0점 종료 후 NOT BAD 영상 디코딩과 결과 화면 복귀를 확인했다. HEVC/Safari와 소리의 실제 기기 품질은 확인하지 않았다. TIMELESS의 0점 미완료는 단위 테스트 경로이며 정상 플레이에서 반드시 도달하는 상태라는 주장은 아니다.

복사 전후 SHA-256 동일:

- WebM: `061d5e3d9f5b5512b6a0c5e0f693453a506c5593f8244f8d8afbccd9ed4e32c5`
- HEVC: `ea7936998c260888dc165499e20bed54f4d1b00e0f83f527cf04ee432f920e44`
- MP3: `24a354b87fbfafcad2802487d39fabf9335f3d501857c9ca2b0ab6c580a2446e`

[verification.json](verification.json)에 촬영 시각·브라우저·PNG 해시를 보존한다. [check.mjs](check.mjs)는 게임에 import하지 않는다. 후속 캡처는 새 경로를 사용한다.
