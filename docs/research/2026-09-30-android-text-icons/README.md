# 2026-09-30 · Android 글자 확대율 고정·게임별 아이콘

## 문제/요청과 근거

사용자는 특정 휴대전화에서 등급 문구가 화면 밖으로 커지고, TAPtoTEST 메뉴 글씨도 예상보다 커지는 사진을 제시했다. 다른 기기에서는 정상임을 확인했다고 설명했으며, 큰 글씨·쉬운 사용 모드의 영향이 의심된다고 했다. 또 설치된 TEN/TALK/TEST에 모두 같은 `4·6` 아이콘이 나오는 사진을 제시했다.

소스 검사는 세 앱의 기존 설치 아이콘 파일이 동일함을 확인했다. 그러나 사진만으로 해당 폰의 fontScale/density/WebView 설정을 측정하지는 못했으므로 글자 확대의 원인을 실기기로 확정했다는 주장은 하지 않는다. 사용자가 **세 앱의 내부 글자 확대율을 고정하고 제공된 각 게임 아이콘 적용·AAB 제작**을 명시적으로 요청했다.

## 무엇을 왜 바꿨는가

- MainActivity에서 `WebSettings.setTextZoom(100)`을 시작·복귀·설정 변경 시 적용하고, WebView 작업 큐에서도 재적용한다. 종료/누락된 WebView는 건너뛴다.
- Manifest configChanges에 fontScale을 추가해 글자 설정 변경 때문에 Activity를 재생성하지 않게 한다. 다른 Configuration 값이나 OS density/돋보기는 건드리지 않는다.
- CSS 자동 글자 확대는 `text-size-adjust: 100%`로 보완한다. 기본 디자인의 font-size, weight, 간격은 변경하지 않았다.
- 제공된 정사각 PNG 전체를 보존해 새 설치 아이콘 15개(5 density × foreground/legacy/round)와 스토어용 512 PNG를 만든다. adaptive foreground는 108dp 중앙 60dp, 흰 background로 세 게임 기준을 맞춘다.
- 버전 1.0.2/code3 → **1.0.3/code4**. 앱 ID와 업로드 인증서는 동일하며 게임/저장 규칙은 변경하지 않았다.

원본 아이콘은 `store/icon-source.png`이고 사용자 파일과 SHA-256이 같다: `1e98bcab00a78359d0641cf78bc0c2295cc4f7c1a1b69e3ec23b2782b235961a`. 원본 재디자인·크롭·생성형 이미지 변경은 하지 않았다. 아이콘 외곽은 Android 런처 마스크의 영향을 받는다.

이 글자 고정은 사용자의 게임 디자인 선택이며, 저시력 사용자의 앱 내부 글자 확대를 제한한다는 접근성 절충이 있다. 휴대전화 전체 확대를 막았다는 뜻은 아니다.

## 전후 화면과 재현 조건

**권위 있는 최종 자료는 `final/`이다.** 과거 버전은 `cae2e49b5af230a95b2f1890daf01b47b321b621`을 git archive로 임시 디렉터리에 추출하여 실행했다. 현재 소스를 과거 버전으로 교체하지 않았다. 이전 커밋의 날짜·실제 촬영 UTC 시각·Chrome 버전·소스 해시·PNG 해시는 [final/verification.json](final/verification.json)에 있다. 이후 화면은 이번 변경 작업 트리다.

- 공통 390×844 CSS px, DPR 2 → **780×1688 PNG**.
- 독립 신규 브라우저 프로필, en-US, Asia/Seoul, 시계 2026-09-30T00:00:01Z, 난수 seed 20260930.
- 양쪽 동일한 stage10/기록 fixture와 음소거 설정. 현재 설치된 의존성을 함께 사용하므로 당시 의존성 전체를 복원한 것은 아니다.
- 브라우저의 **기본 배율** 비교이며 Android fontScale 200%나 사용자 폰을 재현한 것이 아니다.

| 비교 | 전 | 후 | 의미 |
|---|---|---|---|
| 게임 메뉴 | [before-title](final/before-title.png) | [after-title](final/after-title.png) | 기본 글씨 21px, 너비 298px 동일 |
| 10단계 이어하기 | [before-stage10](final/before-stage10.png) | [after-stage10](final/after-stage10.png) | 9블록과 기존 진도/기록 fixture 유지 |
| 최고 등급 문구 컴포넌트 | [before-cheer-fixture](final/before-cheer-fixture.png) | [after-cheer-fixture](final/after-cheer-fixture.png) | 실제 플레이 결과가 아닌 band0 강제 선택 테스트 화면. OH MY GOD~! 42.9px, 좌우 54.45~335.55px로 동일 |
| 아이콘 리소스 미리보기 | [before-icon-preview](final/before-icon-preview.png) | [after-icon-preview](final/after-icon-preview.png) | **실제 런처 캡처 아님**. 실제 리소스를 원형/둥근사각형 마스크로 표시 |

동영상 프레임은 브라우저 미디어 디코더의 실시간 진행이어서 전후 프레임을 동일하게 고정하지 않았다. 비교 대상은 문구 크기·범위이며 영상 프레임 차이를 디자인 변화로 해석하지 않는다.

## 검증 결과와 한계

- 기존 테스트 219개 통과. TypeScript·웹·Android release 빌드 성공.
- [JVM 라이프사이클 테스트](../../../tests/native/text-zoom-contract.mjs)는 실제 MainActivity 소스를 Android/Capacitor 테스트 더블과 함께 컴파일한다. 1.0/1.3/1.8/2.0 설정 입력에도 textZoom100 재적용, super 호출, null/종료 안전성, OS config 불변 확인. 실제 Android WebView 렌더링 시험은 아니다.
- 최종 브라우저 오류 0, 정상 배율 메뉴·등급 크기 동일, 진도/최고기록 fixture 유지.
- 실제 AAB의 컴파일 코드, fontScale flag, 아이콘 15개, 웹 자산 45개, 앱 ID·서명 일치 검증 성공. [출시 검증](../../releases/2026-09-30-text-icons-aab/README.md).
- **실제 휴대전화·에뮬레이터에서 큰 글씨/쉬운 사용 모드와 삭제 없는 앱 업데이트를 시험하지 못했다.** 최종 테스터 검증은 남아 있다. 기존 자료/사용자 테스트 결과를 지어내지 않는다.
- OS 내비게이션바 safe area·기기 전체 화면 확대는 이번 텍스트 확대율 고정으로 모두 해결됐다고 주장하지 않는다.

### 실패한 캡처 보존

- `attempt-1/`: 아이콘 프리뷰 HTML에 viewport meta가 없어 높이가 1687px로 캡처되어 규격 검사 실패.
- `attempt-2/`, `attempt-3/`: 페이지를 about:blank로 전환할 때 캡처 초기화 스크립트가 localStorage를 읽어 SecurityError 2건. 앱 오류가 아닌 테스트 도구의 origin 검사 누락이었다. 이 두 시도의 cheer fixture는 band5=NOT BAD여서 최종 최고등급 비교 자료로 사용하지 않는다.
- 최종 스크립트는 localhost 문서에서만 저장 fixture를 초기화하고 viewport meta와 band0를 명시했다. 실패 출력은 삭제/덮어쓰기하지 않았다.

## 재실행

원본은 `check.mjs`. 출력 경로는 매번 새 `CAPTURE_OUT`으로 지정한다. 로컬 Playwright 위치는 `PLAYWRIGHT_MODULE`, Chrome은 `CHROME_PATH`로 설정할 수 있다. 아이콘 생성은 `scripts/build-launcher-icons.mjs`와 별도 설치된 sharp(`SHARP_MODULE`)를 사용한다. 이 도구와 연구 자료는 게임에 import하거나 AAB에 포함하지 않는다.

공식 API 참고: [WebSettings.setTextZoom](https://developer.android.com/reference/android/webkit/WebSettings#setTextZoom(int)), [Adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).
