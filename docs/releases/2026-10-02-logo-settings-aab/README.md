# TAPtoTEN 1.0.7 · 로고 크기·설치 아이콘·진동 설정·앱 이름

- 제출 파일: `releases/TAPtoTEN-1.0.7-code9.aab` — 54,324,174 bytes (약 54.3 MB).
- 출시명/버전: **1.0.7**, 버전 코드: **9**.
- 앱 ID: `io.github.junyyyong.makezero`, minSdk 24 / targetSdk 36. 기존 업로드 키 유지.
- SHA-256: `397c7978e3694344e50d22340b3b346b312a3b13bd53c8c04d7f81195fa50c0f`.
- 이전 AAB는 보존했다. TAPtoTALK/TAPtoTEST의 파일이 아니다.

## 이번 업데이트

- 사용자에게 보여준 직전 메인 로고 후보 크기의 80%로 조정. 원본 비율·중심·다른 메뉴 위치는 유지하고 남는 공간은 여백으로 둔다.
- 설치 아이콘은 원본 이미지가 런처 마스크를 꽉 채우도록 적용. 기기의 원형 등 마스크에 따라 모서리가 잘린다.
- Settings의 진동 스위치와 안내를 제거하고 과거 저장값과 관계없이 진동을 비활성화. Music/Sound와 정책/라이선스 링크 유지.
- 설치 앱 이름·웹 제목·접근성 라벨을 띄어쓰기 없는 `TAPtoTEN`으로 통일. 로고 그림 자체는 변경하지 않았다.
- 기존 반응형·화면 확대 보정·서체·색상·게임 규칙·진도/기록 저장 키·형식 유지.

[승인한 최신 화면과 전후 비교](../../research/2026-10-02-main-logo-icon/index.html)

## 검증

- 자동 테스트 28파일 / **251개** 통과. TypeScript/Vite 및 Android release bundle 빌드 성공.
- [번들/서명](verification.json): bundletool validate·jarsigner strict 통과, 최신 dist 자산 **45개**가 AAB와 바이트 단위 일치. Preferences 플러그인 포함, 외부 서버 URL 없음, 키/연구 자료 미포함.
- [아이콘/컴파일](text-icons-verification.json): 아이콘 **15개** 픽셀 일치, 기존 앱 ID/인증서 유지, 컴파일된 WebView textZoom100 확인.
- [이번 변경의 실제 AAB 확인](update-verification.json): Android의 두 이름 리소스와 Capacitor 이름이 `TAPtoTEN`, 진동 UI/안내 없음·진동 비활성 코드 포함, Music/Sound 유지, 직전 출시 소스와 규칙/저장 파일 동일.
- 로고 8개 화면 조건·중심/다른 UI·Settings 토글/저장·진동 호출 0의 앞선 [모의검사](../../research/2026-10-02-main-logo-icon/size-review-complete/verification.json)는 이번 생산 빌드에 포함한 소스의 검증이다. 이번에 실기기 캡처를 새로 찍었다는 의미는 아니다.
- 최초 샌드박스 빌드는 Gradle 로컬 잠금 통신 권한으로 시작하지 못했다. 허용된 실행으로 재시도해 성공했다. flatDir·SDK XML·Gradle deprecated·jarsigner 경고는 있었으나 빌드/strict 서명 검증에 통과했다.

기준 커밋 `97b9b0c` 위의 승인된 작업 트리를 빌드했고 검증 JSON에 기준 커밋/변경 파일을 기록했다. 이후 커밋은 이 소스와 검증 기록을 포함한다. **실제 Android 설치·삭제 없는 업데이트·Play 업로드·심사 제출은 수행하지 않았다.**

## 출시명

```text
1.0.7
```

## 출시노트 — en-US에 복사

```text
<en-US>
- Refined the main logo size and spacing.
- Updated the app icon to fill its shape.
- Removed the vibration setting.
- Updated the app name to TAPtoTEN.
</en-US>
```

기존 TAPtoTEN 테스트 트랙에 새 AAB를 올리고 **9 (1.0.7)**을 확인한다. 출시명/노트를 입력하고 검토·제출한다. 설치 앱을 삭제하지 않고 업데이트한 뒤 앱 이름·아이콘·로고·Settings 및 기존 기록을 확인한다. AAB/키는 Git에 포함하지 않는다. Git push만으로 Play 설치본은 업데이트되지 않는다.
