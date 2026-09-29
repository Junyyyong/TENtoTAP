# TAP to TEN

손끝으로 두드려 **10**을 만드는 퍼즐. 브로드웨이 탭댄스 분위기. 웹(TypeScript)으로 만들고 Capacitor로 감싸서 Google Play에 올립니다.

## 모드

| 모드 | 목표 | 도구 |
| --- | --- | --- |
| **스토리** | **판을 전부 지워 뒤에 숨은 그림 얻기** | 힌트 · 한 수 물리기 · 나누기 |
| **타임어택** | 60초 동안 최대 점수 | 없음 |
| **무제한** | 블록이 계속 차오르는 걸 버티기 | 힌트 3회 |

**무제한**은 생존 모드입니다. 절반쯤 찬 보드에서 시작해 몇 초마다 새 블록이 떨어지고, 버틸수록 간격이 짧아집니다. 빈 칸이 없어지면 끝.

스토리는 전 **99 스테이지**, 9개씩 11챕터. **판은 어느 모드에서나 9×9, 81칸**입니다. 판 뒤에는 그림 한 장이 숨어 있고, 블록을 지우면 그 칸이 투명해지며 그림이 드러납니다. **전부 지우면 그림을 얻어 갤러리에 모읍니다** — 99장이 목표입니다.

## 규칙 (요약)

> 숫자를 골라 **합이 정확히 10**이 되면 지워집니다. 2개부터 5개까지.

```
4+6      1+9      2+3+5      1+1+8      1+2+3+4      1+2+3+2+2
```

**위치는 상관없습니다.** 보드 어느 칸이든, 아무리 멀리 떨어져 있어도 함께 고를 수 있습니다. 같은 숫자끼리 지우는 규칙은 없습니다(3+3은 6).

점수는 개수로만 결정됩니다 — 2개 10점 · 3개 20점 · 4개 40점 · 5개 80점.

전체 규칙은 **[docs/RULES.md](./docs/RULES.md)** 를 보세요.

## 그 외 화면

- **튜토리얼** — 처음 실행하면 자동으로 나오는 5단계. 직접 눌러야 넘어가고, 건너뛸 수 있습니다
- **내 기록** — 모드별 최고 점수, 스테이지별 별, 모은 별 총합

## 문서

| 문서 | 내용 |
| --- | --- |
| [RULES.md](./docs/RULES.md) | 게임 규칙 전체 |
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 폴더 구조와 "어디를 고쳐야 하나" |
| [DECISIONS.md](./docs/DECISIONS.md) | **왜 이렇게 되어 있는지.** 규칙 바꾸기 전 필독 |
| [BALANCE.md](./docs/BALANCE.md) | 난이도 조정 방법 |
| [CONTENT.md](./docs/CONTENT.md) | 캐릭터·대사·튜토리얼 편집 방법 |
| [PLAY_STORE_GUIDE.md](./docs/PLAY_STORE_GUIDE.md) | 처음 출시하는 사람을 위한 AAB·Play Console·테스트·업데이트 안내 |
| [PLAY_POLICY_CHECKLIST.md](./docs/PLAY_POLICY_CHECKLIST.md) | 앱 내 개인정보/라이선스, 어린이 대상 정책 및 콘솔 선언에 남은 확인 사항 |

`DECISIONS.md` 에는 직관과 반대라서 모르고 되돌리면 게임이 조용히 망가지는 것들이 정리되어 있습니다. 예를 들어 **보드를 랜덤 숫자로 뿌리면 수학적으로 클리어가 불가능**하고, **큰 조각을 많이 딜하면 오히려 쉬워집니다.**

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm test           # 규칙 · 상태 · 밸런스 · 페이싱 · 튜토리얼 (78개)
npm run typecheck
npm run build      # dist/
npm run build:single   # 단일 HTML 파일 하나로 (dist-single/)
npm run test:layout    # 기기 10종에서 화면 배치 검사 (preview 실행 필요)
```

구조는 `src/core`(규칙 · DOM 없음) → `src/content`(밸런스 · 스토리) → `src/ui`(화면) 한 방향으로만 의존합니다. 자세한 건 [ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Android 빌드

### 1. 업로드 키 만들기 (최초 1회)

업로드 키와 비밀번호를 안전한 곳에 백업하세요. Play App Signing을 사용하는 앱은 업로드 키 분실 시 재설정 신청이 가능합니다. Google이 관리하는 배포용 앱 서명 키와 우리가 보관하는 업로드 키는 역할이 다릅니다. [공식 서명 안내](https://developer.android.com/studio/publish/app-signing)

```bash
keytool -genkeypair -v -keystore android/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

`android/keystore.properties` 를 만듭니다 (이 파일과 `.jks` 는 `.gitignore` 로 커밋되지 않습니다):

```properties
storeFile=upload-keystore.jks
storePassword=<위에서 입력한 비밀번호>
keyAlias=upload
keyPassword=<위에서 입력한 비밀번호>
```

### 2. AAB 만들기

Java 21과 Android SDK Platform 36(Android Studio 또는 command line tools)을 준비한 다음:

```bash
npm run android:bundle
# → android/app/build/outputs/bundle/release/app-release.aab
```

빌드 스크립트는 서명 설정이 없으면 중단합니다. `.android-tools/`에 프로젝트 전용 도구를 준비한 경우 자동으로 사용하며, 기존 JAVA_HOME/ANDROID_HOME 설정을 우선합니다. 생성한 파일은 실제 Android 기기 및 Play 내부 테스트에서 확인한 뒤 공개하세요.

SDK를 설치하고 싶지 않다면 GitHub Actions 의 **Release AAB** 워크플로를 수동 실행하면 됩니다. 아래 4개 시크릿을 저장소에 등록해두세요.

| 시크릿 | 값 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | 키 파일의 Base64 값. macOS 예: `base64 -i android/upload-keystore.jks` (출력을 공개하지 말 것) |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |

빌드된 `.aab` 는 워크플로 실행 결과의 아티팩트로 내려받습니다.

### 버전 올리기

`android/app/build.gradle` 의 `versionCode`(업로드마다 반드시 증가) 와 `versionName` 을 수정합니다.

### 업데이트와 사용자 기록

Android 앱의 진도·최고기록·설정은 `@capacitor/preferences`에 저장합니다. 기존 앱 WebView의 localStorage 기록은 최초 실행 시 네이티브 기록이 없을 때만 이전하며 원본을 지우지 않습니다. 웹판은 같은 출처의 localStorage를 계속 사용합니다.

- 앱 업데이트 때 `applicationId`, Preferences 기본 그룹, `makezero.*.v1` 저장 키를 변경하지 마세요. 데이터 형식 변경은 기존 필드를 유지하며 호환 처리해야 합니다.
- 읽기 실패 시 시작을 멈추고 Retry를 표시합니다. 저장 실패 안내가 뜨면 앱을 닫기 전에 재시도하세요. 직전 정상값 백업은 데이터 손상 대비용이며 클라우드 백업이 아닙니다.
- LIMITLESS는 튜토리얼 단계 단위 이어하기입니다. ENDLESS/TIMELESS는 최고기록을 보존하며 진행 중 판 복원은 하지 않습니다. 오늘 기록은 날짜가 바뀌면 초기화됩니다.
- 출시 전에 구버전 설치 → 기록 생성 → 같은 앱을 삭제하지 않고 새 버전 설치 → 진도·세 모드 기록·설정 유지 순서로 실기기 검증이 필요합니다. 현재 자동 검증은 모의 네이티브 브리지까지이며 실제 Android 설치 업데이트는 미검증입니다.
- 앱 삭제·데이터 삭제·휴대전화 교체 복구 및 웹→새 앱 자동 이전은 제공하지 않습니다.

[저장 안정화 검증·연구기록](docs/research/2026-09-28-update-safe-storage/README.md)

## Play Console 체크리스트

- [ ] 개발자 계정 등록 ($25, 1회) 및 신분 확인
- [ ] **비공개 테스트: 최소 12명이 연속 14일 참여 상태 유지** — 2023-11-13 이후 만든 **개인 계정**에 적용. 충족 후 프로덕션 액세스를 신청하며 자동 승인되는 것은 아닙니다. 다른 계정 유형은 콘솔 요구사항을 확인하세요.
- [ ] 앱 아이콘 512×512 → `store/play-icon-512.png`
- [ ] 그래픽 이미지 1024×500 → `store/play-feature-1024x500.png`
- [ ] 현재 게임 스크린샷 최소 2장. 권장: 세로 1080×1920 3장 이상. 연구용 780×1688은 스토어 비율 규격과 다릅니다
- [x] 앱 내 개인정보처리방침·문의 주소 및 라이선스 (Settings)
- [ ] 개인정보처리방침 웹 배포·공개 URL 확인·콘솔 등록
- [ ] 데이터 보안(Data Safety) 양식 — 실제 배포 앱과 의존성의 수집·공유 동작을 확인한 후 작성
- [ ] 콘텐츠 등급 설문
- [ ] 앱 카테고리: 게임 > 퍼즐

### 알아둘 것

- **Target API** — 2026-08-31부터 신규 앱은 Android 16(API 36) 이상이어야 합니다. 이 프로젝트는 `android/variables.gradle` 에서 이미 36으로 설정되어 있습니다.
- **applicationId** — `io.github.junyyyong.makezero`. 스토어에 한 번 올리면 **영구히 변경 불가**하므로, 다른 값을 쓰려면 첫 업로드 전에 `capacitor.config.ts`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`, `MainActivity.java` 의 패키지 경로를 함께 바꾸세요.
- **INTERNET 권한** — Capacitor 템플릿의 기본 권한이 남아 있습니다. Data Safety는 권한 유무가 아니라 실제 데이터 수집·공유 동작을 기준으로 작성합니다. 오프라인 동작도 실기기 검증이 필요합니다.
- **광고 없음** — AdMob SDK를 넣지 않았습니다. 나중에 붙이면 개인정보처리방침과 Data Safety 양식을 함께 갱신해야 합니다.

본인인증부터 정식 공개까지의 순서와 준비물은 [쉬운 출시 안내서](docs/PLAY_STORE_GUIDE.md)를 확인하세요. Git/Vercel 배포만으로 설치된 Android 앱은 업데이트되지 않습니다.
