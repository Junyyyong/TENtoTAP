# TAPtoTEN · Play 정책 준비 확인표

확인일: 2026-09-29. 운영자 표기는 사용자가 지정한 **TapeeTepee openstudio**, 공개 연락처는 **wnsdydtml@gmail.com**이다. 사용자가 이날 Play Console 화면을 확인하며 정정한 주소다. 이전 릴리스·연구 기록에 남은 주소는 당시 원본이며 현재 연락처로 사용하지 않는다. 대상은 사용자가 승인한 **6세 이상부터 성인까지**다.

## 앱 만들기의 선언 세 가지는 무엇인가?

| 선언 | 앱/자료 쪽 준비 | 콘솔 소유자에게 남은 일 |
| --- | --- | --- |
| 개발자 프로그램 정책 준수 | 앱 내 개인정보처리방침·연락처·오픈소스 고지 추가. 현 코드의 데이터·권한·SDK 점검 | 공개 정책 URL, 실제 대상 연령, 콘텐츠 등급·데이터 보안·광고 등 설문, 콘텐츠 사용 권리 확인. 문서 추가만으로 정책 전체 준수를 보증하지 않음 |
| Play 앱 서명 | 기존 업로드 키 유지, 서명된 새 AAB 제작 | Play App Signing 약관과 첫 업로드 설정 확인. Google의 앱 서명 키와 로컬 업로드 키는 다름 |
| 미국 수출법 | 현재 앱은 퍼즐 게임이며 별도의 사용자 암호화 기능은 발견되지 않음 | 운영체제/WebView의 암호화 기능까지 고려해야 하므로 이것만으로 수출법 면제라고 단정할 수 없음. 계정 소유자가 해당 법규·배포 국가를 확인하고 선언 |

이 문서는 코드 점검 및 제출 준비 자료이지 법률 검토나 심사 승인서가 아니다. 선언 체크박스를 자동으로 체크하거나 Play에 제출하지 않았다.

공식 근거: [사용자 데이터](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [앱 서명](https://developer.android.com/studio/publish/app-signing), [수출법](https://support.google.com/googleplay/android-developer/answer/113770?hl=en).

## 게임 어디에 표시하나?

**메뉴 → Settings → Privacy policy / Licenses**. 설정 스위치 아래의 작은 텍스트 링크이며 시작 팝업이나 동의 버튼을 추가하지 않았다. 읽기 화면을 닫으면 설정으로 돌아간다. 게임 규칙·저장 키는 바꾸지 않았다.

- `public/privacy.html`: 영어/한국어 정책, 운영자·연락처, 기기 내 기록, 웹 호스팅과 이메일 문의, 어린이, 보관·삭제·보안.
- `public/licenses.html`: 실제 포함된 Capacitor·Preferences·Noto Sans KR 및 Android 의존성의 고지와 전문. 게임 아트워크 재사용 허가를 뜻하지 않는다.
- 두 문서는 앱에 포함되는 로컬 HTML이다. 정책 열람에 외부 사이트를 열거나 게임을 새로 불러올 필요가 없다.
- 공개 정책 URL은 `https://taptoten.vercel.app/privacy.html`이며 기존 배포와 콘솔 등록을 확인했다. 이번 연락처 정정은 1.0.2 / code 3에 포함한다. 새 웹 배포에서 정정한 주소가 표시되는지도 확인해야 한다.

Google Play는 개인정보처리방침의 콘솔 공개 URL과 앱 내 링크/본문을 요구한다. 앱에 긴 문서를 항상 표시할 필요는 없다. 별도 이용약관은 개인정보처리방침이나 개발자 선언을 대신하지 않는다. 참고한 AI Games 페이지의 광고·계정·구매 조항은 현재 게임과 맞지 않아 복사하지 않았다.

## 데이터와 권한 점검 결과

| 대상 | 코드에서 확인한 내용 | 한계/주의 |
| --- | --- | --- |
| 점수·튜토리얼·설정 | `src/ui/storage.ts`, `persistentStore.ts`: Android Preferences / 웹 localStorage | 개발자 계정/서버에 동기화하지 않음. 실기기 업데이트 보존은 별도 시험 필요 |
| 백업 | Android manifest의 `allowBackup=true` 유지 | 운영체제 설정에 따라 플랫폼 백업 가능. “휴대폰 밖으로 절대 나가지 않음”이라고 쓰지 않음 |
| 사용자 개인정보 입력 | 로그인·채팅·생년월일·사진 업로드 기능 없음 | 자발적 이메일 문의에는 이메일/본문/첨부가 포함될 수 있음 |
| 네트워크 | 앱은 빌드 산출물 포함, Capacitor `server.url` 없음. 음악/영상/정책은 로컬 자산 | 웹 버전의 호스팅 요청, OS/Google Play 처리와 구분. 플랫폼 수준 네트워크를 브라우저 검사만으로 부정할 수 없음 |
| 광고·분석 | 현재 앱 소스 및 패키지 목록에 광고/분석 SDK 없음 | 추후 추가하면 아동 정책·Data Safety·방침을 다시 검토 |
| Android 권한 | INTERNET, 앱 내부 비공개 receiver 권한. 위치·카메라·마이크·AD_ID 없음 | 권한 목록만으로 데이터 수집 여부 전체를 증명하지 않음 |
| 네이티브 의존성 | Gradle release 의존성 50개 컴포넌트(메타데이터 포함), Apache-2.0 POM/부모 POM 확인 | 의존성 이름 목록은 실행 중 전체 네트워크 감사가 아님 |

관련 설명: [Android 자동 백업](https://developer.android.com/identity/data/autobackup), [데이터 보안 양식](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).

### 어린이도 대상일 때

- 콘솔의 실제 대상 연령대를 선택한다. “어린이 포함”만으로 모든 연령 구간을 일괄 선택하지 않는다.
- 광고·행동 추적·회원가입을 새로 추가하지 않았다. 외부 이메일 앱으로 바로 이동하는 링크도 두지 않고 보호자용 문의 주소를 문서에 표시했다.
- 개인정보 입력이 없는 현재 기능에 불필요한 생년월일 입력이나 일괄 동의 팝업을 추가하지 않았다. 향후 데이터 수집·광고·소셜 기능을 추가하면 별도 검토한다.
- 영상·캐릭터 등 전체 콘텐츠의 연령 적절성과 상업적 배포 권리는 소유자가 확인해야 한다. 코드나 스크린샷만으로 이를 입증하지 않는다.
- 어린이 대상 표기, 개인정보 문서, Data Safety 설문은 실제 출시 빌드와 서로 일치해야 한다.

[Google Play Families 정책](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en).

## 아직 소유자가 확인해야 하는 것

1. 정책 내용 및 실제 문의 메일 관리 방침 검토. 국가별 법적 의무 전체를 이 코드 작업으로 확인한 것은 아님.
2. 공개 정책 URL은 유지하고, 연락처 정정 웹 배포와 새 AAB 반영을 확인. 스토어 소개·문의 주소도 정정 주소와 일치시킨다.
3. 아트워크·영상·음악의 사용 권리, 대상 연령·출시 국가·가격 결정.
4. Play 앱 서명 설정·선언, 데이터 보안/광고/등급 설문을 실제 처리와 일치시키고 소유자가 최종 확인·제출. 2026-09-29 사용자가 제공한 자동 보호 설정 화면에는 설치 프로그램 검사가 켜져 있고 선택적 앱 원격 분석 공유 항목은 보이지 않았다. 이 화면 관찰을 네이티브 전체 네트워크 감사로 간주하지 않는다. [자동 보호](https://support.google.com/googleplay/android-developer/answer/10183279?hl=en)
5. 실제 Android에서 정책 오프라인 열람·스크롤·닫기·시스템 뒤로가기, 세 모드 플레이, 삭제 없는 업데이트의 기록 유지 확인.
6. 키와 비밀번호 파일의 안전한 외부 백업. Git 업로드 금지.

## 라이선스 자료 갱신

`scripts/list-release-dependencies.gradle`을 Gradle init script(`-I`)로 주고 `:app:writeReleaseDependencyList`를 실행하면 `.android-tools/release-artifacts.json`이 생성된다. 그 뒤 `node scripts/build-license-notices.mjs`로 문서를 갱신한다. Gradle 캐시는 프로젝트의 `.android-tools/gradle-cache` 또는 지정한 `GRADLE_USER_HOME`을 사용한다. 새로운 Apache-2.0 이외의 의존성이 발견되면 자동 생성은 중단되고 검토가 필요하다.

출처: npm 각 패키지의 LICENSE, 실제 release 의존성의 POM/부모 POM과 AAR/JAR 내부 고지, [Noto OFL](https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/OFL.txt), [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt), [Cordova 14.0.1 NOTICE](https://raw.githubusercontent.com/apache/cordova-android/rel/14.0.1/NOTICE), [Cordova LICENSE](https://raw.githubusercontent.com/apache/cordova-android/rel/14.0.1/LICENSE). 원문은 `public/legal/`에 보존한다. 생성·감사 스크립트는 앱에 import하거나 배포 자산으로 복사하지 않는다.
