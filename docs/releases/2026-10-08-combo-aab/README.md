# TAPtoTEN 1.0.8 · LIMITLESS 콤보 보너스

- 제출 파일: `releases/TAPtoTEN-1.0.8-code10.aab` — 54,324,438 bytes (약 54.3 MB).
- 출시명/버전: **1.0.8**, 버전 코드: **10**.
- 앱 ID: `io.github.junyyyong.makezero`, minSdk 24 / targetSdk 36. 기존 업로드 키 유지.
- SHA-256: `6a2045ea9303d6fcaabf0814fcbc3e945b0dfc491c8da5014ce0bdc5fd4c0c77`.
- 이전 AAB/연구 원본 보존. TAPtoTALK/TAPtoTEST 수정 없음.

## 이번 업데이트

LIMITLESS의 튜토리얼 이후 60초 본게임에서 5번째 연속 정답부터 매 정답 **기본 점수 +20점**. 6번째 이후에도 보너스는 +20점으로 고정한다. 선택 취소·확정 오답은 콤보를 초기화한다. 취소는 점수/시간 벌점이 없고, 오답은 기존 −1초를 유지한다. 일시정지/재개와 자동 판 교체는 콤보 유지, 새 게임/재시도는 0부터 시작한다.

보드 아래 기존 안내에 콤보/보너스 조건을 표시하고 팝업·SCORE·BEST·결과에 실제 지급 점수를 반영했다. 다른 모드·튜토리얼, 기존 등급 경계·서체·디자인·아이콘·앱 이름·화면 확대 보정·저장 키/형식은 유지한다.

[전후 화면과 연구 근거](../../research/2026-10-08-limitless-combo/index.html)

## 검증

- 이번 릴리스에서 자동 테스트 **29파일/263개**, TypeScript/Vite 및 Android release bundle 빌드 성공.
- [번들/서명](verification.json): bundletool validate·jarsigner strict 통과. 최신 dist 자산 **45개**가 AAB와 바이트 단위 일치. Preferences 포함, 외부 서버 URL 없음, 키/연구 자료 미포함.
- [업데이트 대조](update-verification.json): 1.0.7/code9와 앱 ID·업로드 인증서 동일, 설치 이름 TAPtoTEN 유지, 아이콘 **15개** 바이트 동일. 저장·기본 점수 규칙·MainActivity 소스와 배포 CSS 동일, 콤보 코드 포함.
- 이전 소스 검증의 브라우저 관찰/검사 20사례·선택 입력 회귀 16사례·전후 PNG 6장은 [연구기록](../../research/2026-10-08-limitless-combo/README.md)에 보존했다. 이번 릴리스에서 새 실기기 검사를 했다는 의미가 아니다.
- flatDir·SDK XML·Gradle deprecated 경고 및 jarsigner 경고는 있으나 빌드/strict 서명 검증은 통과했다. 서명 경고 원문은 검증 JSON에 보존한다.

기준 커밋 `f68c7a8` 위의 승인된 작업 트리를 빌드했으며 검증 JSON에 당시 커밋/변경 파일을 기록했다. 이후 릴리스 커밋은 이 소스와 검증 기록을 포함한다. **실제 Android 설치·삭제 없는 업데이트·Play 업로드·심사 제출은 수행하지 않았다.** AAB/키는 Git에서 제외한다.

## 출시명

```text
1.0.8
```

## 출시노트 — en-US에 복사

```text
<en-US>
- Added a LIMITLESS combo bonus: earn 20 extra points for each correct answer from a 5-answer streak.
- Cancelling a selection or making a mistake resets the combo.
- Added combo and bonus information below the board.
</en-US>
```

기존 TAPtoTEN 테스트 트랙에 새 AAB를 올리고 **10 (1.0.8)**을 확인한다. 출시명/노트를 입력하고 검토·제출한다. 앱을 삭제하지 않고 업데이트한 뒤 콤보·선택 취소와 기존 진도/기록을 확인한다. Git push만으로 Play 설치본이 업데이트되지는 않는다.
