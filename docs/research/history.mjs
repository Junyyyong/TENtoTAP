import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Execute from repository root. Only archives extracted into owned temp folders
// are executed. The working application's source is never checked out or edited.
const repo = process.cwd();
const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const items = [
 ['prototype','9af818d','game','최초 숫자 퍼즐','숫자를 선택해 지우는 게임의 첫 실행 가능한 버전이 필요했다.','같은 숫자 두 개 또는 합계 10의 연결 조합, 탭·드래그, 힌트와 숫자 추가를 구현했다.','도구 구성만 있던 상태에서 실제 플레이 가능한 MAKEZERO로 바뀌었다.'],
 ['modes','1dfa09e','entry','세 가지 모드 분리','하나의 플레이 방식에서 목표와 제한이 다른 게임으로 확장했다.','공통 규칙을 유지하고 RunConfig로 스토리·60초 타임어택·엔드리스를 나눴다.','모드 선택 메뉴와 서로 다른 목표·자원을 갖게 됐다.'],
 ['sum-rule','5b6a5a6','rules','합계 10 규칙 단순화','합이 10이어도 위치 제약 때문에 거절되거나 가능한 조합이 남았는데 종료되는 문제가 보고됐다.','앞선 2f371c8에서 같은 숫자 매칭을 없앤 뒤 이 커밋에서 직선·인접 조건과 무의미해진 셔플을 제거했다.','어디에 있든 2~5개를 골라 합계 10이면 지워진다. 전후 비교는 직전 위치 제약 버전과 비교한다.'],
 ['survival','59c83d1','endless','생존형 엔드리스','엔드리스를 고정 판의 소진 방식에서 지속적인 압박이 있는 생존 방식으로 바꿨다.','합계 10의 그룹이 시간에 따라 빈칸에 등장하고 등장 간격이 줄도록 했다.','칸이 찬 상태에서 새 그룹을 놓을 수 없을 때 종료되며 생존 시간과 처리 속도가 중요해졌다.'],
 ['tutorial','880f309','tutorial','체험형 튜토리얼','설명문만으로 규칙을 전달하는 대신 플레이로 익히게 하는 단계가 필요했다.','유일한 정답 조합이 있는 연습판 다섯 개와 다시 보기·건너뛰기·개인 기록 화면을 추가했다.','사용자가 숫자를 직접 지우며 규칙을 연습한다. 이전 버전은 튜토리얼이 없어 메뉴를 비교 맥락으로 제시한다.'],
 ['identity','f018fc0','game','TAP to TEN과 극장 디자인','고정된 숫자 구성과 점수·잔여 숫자의 관계를 검토하고 시각 정체성을 정리했다.','9×9 숫자 덱과 10/20/40/80 점수 곡선, 벨벳·황동 중심 극장 디자인을 도입했다.','MAKEZERO에서 TAP to TEN으로 바뀌고 게임판과 배경·점수 표현이 달라졌다.'],
 ['story-99','457b9a4','story','99단계와 전체 클리어 목표','처음부터 전부 지울 수 없는 덱과 잘못 선택했을 때 복구 수단이 없는 문제가 있었다.','합계 10 그룹으로 판을 만들고 99단계 곡선과 제한된 되돌리기를 제공했다.','전체 클리어를 목표로 하며 선택 실수를 되돌릴 수 있다. 첫 단계 화면은 도구 변화의 예시이고 99단계 전체를 검증한 캡처는 아니다.'],
 ['picture','44bc200','story','그림 수집과 숫자 분포','스토리의 보상 목적이 흐리고 작은 숫자 편중으로 큰 숫자가 남는 문제가 있었다.','보드 아래 그림과 수집 목표, 숫자 가중 분배, 블록 분할을 추가하고 행 붕괴를 막았다.','지운 칸으로 그림이 드러나는 구조와 새 도구가 생겼다. 초기 화면만으로 전체 공개 과정의 효과를 입증하지 않는다.'],
 ['selection','dd86aaf','intro','모드 시작 안내와 보드 공간','모드를 누르면 바로 시작됐고 HUD가 늘며 보드 너비가 줄어드는 문제가 있었다.','스토리 선택 단계와 시간 모드 시작 안내를 추가하고 보드 공간 계산을 수정했다.','타임어택 선택 시 바로 게임이 시작되던 흐름에서 START 전 안내 화면으로 바뀌었다.'],
 ['paper','07b08a6','game','밝은 종이색 디자인과 보상','흰 그림이 어두운 게임판에서 뜬금없는 흰 구멍처럼 보였다.','밝은 종이색·마룬 글자·구분되는 숫자색으로 교체하고 당시 타임어택 점수 보상을 추가했다.','전체 UI가 밝아졌다. 당시 보상은 이후 레벨 모드에서 제거됐으므로 현재 규칙으로 혼동하지 않는다.'],
 ['english','794a5f0','entry','두 모드 중심과 영어 UI','당시 제품을 타임어택·엔드리스 중심으로 정리하는 방향으로 바뀌었다.','스토리 진입을 메뉴에서 제외하고 UI 문구를 영어로 통일했으며 종료 축하 표현을 도입했다.','메뉴의 모드 수와 언어가 바뀌었다. 스토리 코드는 제거하지 않았다.'],
 ['timeless','323486a','entry','TIMELESS 모드','시간 제한 없이 판을 비우는 새 모드와 탭·드래그 간 일관된 합계 판정이 필요했다.','3bbb5d4의 새 모드를 TIMELESS로 명명하고 10·20·30을 순차적으로 판정하도록 정리했다.','세 번째 모드가 생겼다. 비교 시작점은 새 모드 도입 전이며 여러 커밋을 묶는다.'],
 ['studio','4870f0a','entry','스튜디오 오프닝과 화면 배경','브랜드 오프닝 도입 후 Safari 상하단에 주황색이 남는 문제가 있었다.','스튜디오 카드만 주황색으로 칠하고 루트·테마색을 종이색으로 고정했다.','페이지 배경 처리가 바뀌었다. Chromium의 페이지 캡처에는 실제 Safari 주소창이 없으므로 그 개선을 이미지로 직접 검증할 수 없다.'],
 ['guidance','0d3ee75','tutorial','튜토리얼 금빛 안내','TAPtoTALK처럼 눌러야 할 곳을 반짝이게 표시해 달라는 사용자 요청이 있었다.','정답 숫자 중 미선택 숫자와 성공 후 Next/Start에 반복 효과를 적용했다.','정답 위치를 시각적으로 알 수 있게 됐다. 학습 효과를 측정한 사용자 실험은 아니다.'],
 ['levels','6542a95','intro','타임어택 네 레벨','작은 판부터 큰 판까지 선택하고 레벨별 최고기록을 보고 싶다는 요청이 있었다.','ae2d7cf에서 네 레벨과 진행·기록을 구현하고 아이콘 박스와 18px/600 제목을 정리했다.','START 대신 색이 다른 네 버튼과 BEST가 표시된다. 60초 고정, 단계별 보드 성장과 마지막 크기 반복으로 바뀌었다.'],
];
const overrides = {timeless:'0883e7a', levels:'0d3ee75'};
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const results=[];
async function capture(rev, scenario, file) {
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tapten-history-'));
 let server, context;
 const errors=[];
 try {
  const archive=execFileSync('git',['archive',rev],{cwd:repo,maxBuffer:512*1024*1024});
  execFileSync('tar',['-xf','-','-C',tmp],{input:archive});
  if(!fs.existsSync(path.join(tmp,'index.html'))) return {status:'unavailable',reason:'이 커밋은 빌드 도구만 있으며 index.html과 실행 가능한 게임 화면이 없다.'};
  fs.symlinkSync(path.join(repo,'node_modules'),path.join(tmp,'node_modules'),'dir');
  server=await createServer({root:tmp,configFile:false,server:{host:'127.0.0.1',port:5197,strictPort:true},logLevel:'error'});
  await server.listen();
  context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-09-06T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-09-06T12:00:01Z'));
  await page.addInitScript(()=>{let n=20260906; Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};});
  await page.goto('http://127.0.0.1:5197',{waitUntil:'networkidle',timeout:20000});
  await page.clock.runFor(8000);
  const visible=async s=>await page.locator(s).count()>0&&await page.locator(s).first().isVisible();
  const click=async s=>{await page.locator(s).first().click({force:true,timeout:3000});await page.clock.runFor(400);await page.evaluate(()=>{for(const a of document.getAnimations())if(a.effect?.getTiming().iterations!==Infinity)a.finish();});await new Promise(resolve=>setTimeout(resolve,80));};
  if(await visible('#btn-tutorial-skip')) await click('#btn-tutorial-skip');
  if(await visible('#btn-play')) await click('#btn-play');
  if(await visible('#btn-title-play')) await click('#btn-title-play');
  let note='';
  if(scenario==='tutorial') {
   if(await visible('#btn-title-tutorial')) await click('#btn-title-tutorial');
   else note='튜토리얼 도입 전: 해당 화면이 없어 실제 메뉴를 비교 맥락으로 캡처함.';
  } else if(scenario==='rules') {
   if(await visible('#btn-title-rules')) await click('#btn-title-rules');
   else throw Error('규칙 화면 진입 버튼 없음');
  } else if(scenario!=='entry') {
   const mode=scenario==='endless'?'endless':scenario==='story'?'story':'timeAttack';
   if(await page.locator('#mode-'+mode).count()) await click('#mode-'+mode);
   if(scenario!=='intro'&&await visible('#btn-intro-start')) await click('#btn-intro-start');
   if(scenario!=='intro'&&await visible('.time-level-1')) await click('.time-level-1');
   if(scenario!=='intro'&&await page.locator('#screen-game').count()&&!await visible('#screen-game')) throw Error('요청한 게임 화면에 진입하지 못함. 메뉴를 게임 화면으로 대체하지 않음.');
  }
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{await Promise.all([...document.images].filter(i=>i.src).map(i=>i.decode().catch(()=>{})));for(const a of document.getAnimations()){if(a.effect?.getTiming().iterations!==Infinity)a.finish();}});
  if(errors.length)throw Error(errors.join('; '));
  await page.screenshot({path:file});
  const png=fs.readFileSync(file);
  if(png.readUInt32BE(16)!==780||png.readUInt32BE(20)!==1688)throw Error('해상도 불일치');
  return {status:'captured',note,sha256:createHash('sha256').update(png).digest('hex'),errors,
   visibleScreens:await page.locator('.screen:visible').evaluateAll(es=>es.map(e=>e.id)),
   text: (await page.locator('body').innerText()).slice(0,1800)};
 }catch(e){return {status:'unavailable',reason:String(e),errors};}
 finally{await context?.close();await server?.close();fs.rmSync(tmp,{recursive:true,force:true});}
}
try {
 for(const [id,after,scenario,title,problem,change,outcome] of items) {
  const before=overrides[id]??git('rev-parse',`${after}^`);
  const date=git('show','-s','--format=%aI',after).slice(0,10);
  const dir=`docs/research/${date}-${id}`;fs.mkdirSync(dir,{recursive:true});
  const evidence={title,problem,change,outcome,scenario,capturedAt:new Date().toISOString(),viewport:{width:390,height:844},deviceScaleFactor:2,browser:browser.version(),method:'Historical git archive in isolated temp directory; current Vite runtime; fresh storage; seeded Math.random and controlled clock; finite animations finished. No historical source changes. Not a historical phone photograph or participant experiment.',sides:{}};
  for(const [side,rev] of [['before',before],['after',after]]) {
   console.log(`${id} ${side} ${rev.slice(0,7)}`);
   evidence.sides[side]={revision:git('rev-parse',rev),commitDate:git('show','-s','--format=%aI',rev),commitMessage:git('show','-s','--format=%B',rev),...await capture(rev,scenario,path.join(dir,side+'.png'))};
  }
  fs.writeFileSync(path.join(dir,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  const sideText=side=>evidence.sides[side].status==='captured'?`<img src="${side}.png" width="260" alt="${side}" />`: `재현 불가: ${evidence.sides[side].reason}`;
  fs.writeFileSync(path.join(dir,'README.md'),`# ${date} — ${title}\n\n## 문제·개선 요구\n\n${problem}\n\n## 무엇을 왜 수정했는가\n\n${change}\n\n## 수정 후 변화\n\n${outcome}\n\n## 전후 모바일 화면\n\n| 이전 ${evidence.sides.before.revision.slice(0,7)} | 이후 ${after} |\n|---|---|\n| ${sideText('before')} | ${sideText('after')} |\n\n${evidence.sides.before.note??''}\n\n${evidence.sides.after.note??''}\n\n## 근거와 재현 조건\n\n이 문서는 Git 커밋 설명·소스 변경과 최근 작업 대화를 바탕으로 사후 정리했다. 당시 문제의 빈도나 학습 효과를 새로 측정한 것이 아니다. 커밋 원문과 전체 번호, 촬영일, 해시, 화면 상태는 [evidence.json](evidence.json)에 있다.\n\n**과거 커밋을 이번에 재현한 화면**이다. 390×844 CSS px, DPR 2, 780×1688 PNG, Chromium 모바일 에뮬레이션을 사용했다. 별도 임시 폴더에서 git archive를 실행했고 당시 소스는 고치지 않았다. 현재 설치된 Vite/Playwright를 실행 도구로 사용했으므로 당시 잠금파일 환경 전체를 재현한 것은 아니다. 새 프로필·같은 난수 초기값·제어된 시계를 사용했지만 버전별 생성 알고리즘이 달라 숫자 배치까지 같지는 않을 수 있다. 화면 전환은 완료하고 반복 안내 효과는 유지했다. UI 경로가 도입되거나 사라진 경우 화면 종류도 달라진다.\n\n커밋 메시지의 과거 테스트·시뮬레이션 수치는 작성자의 당시 기록이며 이번에 재검증한 결과가 아니다. 특히 4870f0a는 일부 과거 브라우저 테스트 보고를 정정한다. Safari 브라우저 외곽, Android 네이티브 실행 및 소리·동영상 재생의 실기기 품질은 PNG로 입증하지 않는다.\n`);
  results.push({date,id,title,path:dir,...evidence.sides});
 }
 fs.writeFileSync('docs/research/history-index.json',JSON.stringify(results,null,2)+'\n');
 console.log('DONE',results.length);
} finally {await browser.close();}
