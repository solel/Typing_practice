// typing_site_v_3_practice.js
import { PRELOAD_TXT, buildFromPreload } from './typing_site_v_3_content.js';

const USER_KEY = 'typing_user_v3';
const DATA_KEY = 'typing_uploaded_txt_v3';

const $ = (s)=>document.querySelector(s);
const pad2=(n)=>n<10?'0'+n:String(n);

(function ensurePreload(){
  if (localStorage.getItem(DATA_KEY)) return;
  const built = buildFromPreload(PRELOAD_TXT);
  if (built) localStorage.setItem(DATA_KEY, JSON.stringify(built));
})();

// (상단 import/유틸/ensureUser 등 기존 코드 유지)

(function applyMode(){
  const $ = (s)=>document.querySelector(s);
  const userInfoLabel = $('#userInfoLabel');
  const soloSection = $('#soloSection');
  const togetherSection = $('#togetherSection');

  const params = new URLSearchParams(location.search);
  const mode = (params.get('mode') || 'solo').toLowerCase(); // 'solo' | 'together'
  const teacher = (params.get('teacher') || '').trim();

  document.body.classList.remove('mode-solo', 'mode-together');
  document.body.classList.add(mode === 'together' ? 'mode-together' : 'mode-solo');

  const user = JSON.parse(localStorage.getItem('typing_user_v9') || 'null');
  if (userInfoLabel && user){
    userInfoLabel.textContent = mode === 'together'
      ? `👤 ${user.id} ${user.name} · 🧑‍🏫 ${teacher || '선생님'}`
      : `👤 ${user.id} ${user.name}`;
  }

  if (mode === 'together'){
    if (soloSection) soloSection.style.display = 'none';
    if (togetherSection) togetherSection.style.display = '';
  } else {
    if (soloSection) soloSection.style.display = '';
    if (togetherSection) togetherSection.style.display = 'none';
  }
})();


function getParagraphPool(){
  const up = JSON.parse(localStorage.getItem(DATA_KEY) || 'null');
  if (up?.paragraphs?.length) return up.paragraphs;
  return ['관리자 자료가 없습니다. content.js를 확인하세요.'];
}

//단어 풀
function getWordPool(){
  try {
    const up = JSON.parse(localStorage.getItem('typing_uploaded_txt_v3') || 'null');
    if (up?.words?.length) return up.words;
  } catch(e){}
  return ['apple','banana','practice','typing','speed','accuracy','keyboard','idea','focus','evidence','사과','바나나','연습','속도','정확도','키보드','아이디어','집중','근거'];
}

// 항상 새로운 순서로 섞어서 400개 반환
function makeRandomWordStream() {
  const words = [...getWordPool()];
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  return words.slice(0, 30);
}

// 이벤트: 단어 불러오기 / 시작
const tgReady = document.querySelector('#tgReady');
const tgStart = document.querySelector('#tgStart');
const tgReset = document.querySelector('#tgReset');
const tgInput = document.querySelector('#tgInput');
const wordStream = document.querySelector('#wordStream');
const tgCorrect = document.querySelector('#tgCorrect');
const tgWrong = document.querySelector('#tgWrong');
const tgWpm = document.querySelector('#tgWpm');
const tgTime = document.querySelector('#tgTime');
const limitSec = document.querySelector('#limitSec');

// 함께하기 상태
let stream=[], streamIdx=0, tgTimer=0, tgRemain=0, tgCorrectN=0, tgWrongN=0, tgStartTs=0;
let tgStarted = false;               // ✅ 시작 누르기 전엔 false
let tgKeystrokes = 0;                // ✅ 타자수(키스트로크) 집계
let tgResults = [];                    // ✅ 각 단어의 채점 결과: 'ok' | 'bad'
let tgIsComposing = false;

function endTogether(reason='done'){
  clearInterval(tgTimer);
  tgStarted = false;
  tgInput.disabled = true;
  // 메시지 표시
  if (reason === 'done') {
    wordStream.innerHTML = `<span class="muted">🎉 모든 단어를 완료했습니다!</span>`;
  } else if (reason === 'time') {
    wordStream.innerHTML = `<span class="muted">⏰ 시간이 종료되었습니다.</span>`;
  }
}

function renderStream(){
  if (!tgStarted) {
    wordStream.textContent = '시작을 누르면 단어가 보입니다.';
    return;
  }
  if (!stream.length){ wordStream.textContent=''; return; }

   // ✅ 인덱스가 끝을 넘으면 종료
  if (streamIdx >= stream.length) { endTogether('done'); return; }

  const beforeStart = Math.max(0, streamIdx - 5);
  const beforeSlice = stream.slice(beforeStart, streamIdx);
  let beforeHtml = '';
  for (let i = 0; i < beforeSlice.length; i++) {
    const idx = beforeStart + i;
    const cls = tgResults[idx] === 'ok' ? 'prev-ok' : (tgResults[idx] === 'bad' ? 'prev-bad' : '');
    beforeHtml += `<span class="${cls}">${beforeSlice[i]}</span>` + (i < beforeSlice.length - 1 ? ' ' : ' ');
  }

  // ✅ 현재 단어/입력값/오타 여부를 "함수 내부"에서 계산
  const current = stream[streamIdx] || '';
  const typed   = (tgInput?.value || '');
  const nowWrong = typed && !current.startsWith(typed);
  const nowCls   = nowWrong ? 'now wrong' : 'now';

  const after = stream.slice(streamIdx+1, streamIdx+21).join(' ');

  wordStream.innerHTML =
    `<span class="muted">${beforeHtml}</span>` +
    `<span class="${nowCls}">${current}</span>` +
    `<span> ${after}</span>`;
}


function updateTgStats(){
  const pad2 = (n)=>n<10?'0'+n:String(n);
  tgTime.textContent = `${pad2(Math.floor(tgRemain/60))}:${pad2(Math.floor(tgRemain%60))}`;
  const sec = Math.max(1,(Date.now()-tgStartTs)/1000);
  const wpmVal = Math.round((tgCorrectN)/(sec/60));
  const cpmVal = Math.round((tgKeystrokes)/(sec/60));   // ✅ 타자수/분
  tgWpm.textContent = `${wpmVal} / ${cpmVal}타`;        // ✅ WPM과 타/분 함께 표기
}

function tick(){
  tgRemain--;
  updateTgStats();
  if (tgRemain<=0){
    clearInterval(tgTimer);
    tgInput.disabled = true;
    tgStarted = false;               // 세션 종료
    renderStream();
    endTogether('time'); 
  }
}

// 단어 불러오기: 준비만 하고, 화면엔 아직 안 보이게
if (tgReady) tgReady.addEventListener('click', ()=>{
  stream = makeRandomWordStream();
  streamIdx = 0;
  tgCorrectN = 0; tgWrongN = 0;
  tgKeystrokes = 0;                  // ✅ 초기화
  tgResults = [];                      // ✅ 결과 초기화
  tgCorrect.textContent = '0';
  tgWrong.textContent = '0';
  tgInput.value = '';
  tgInput.disabled = true;           // ✅ 시작 전엔 비활성
  tgStarted = false;                 // ✅ 시작 전
  renderStream();                    // “시작을 누르면 …” 안내만 보임
});

// 시작: 이때부터 단어 보이기 + 입력 활성화
if (tgStart) tgStart.addEventListener('click', ()=>{
  if (!stream.length){ stream = makeRandomWordStream(); }
  tgRemain = parseInt(limitSec.value,10) || 60;
  tgStartTs = Date.now();
  tgKeystrokes = 0;                  // ✅ 새 라운드 누적 초기화
  tgStarted = true;                  // ✅ 단어 표시 시작
  updateTgStats();
  clearInterval(tgTimer);
  tgTimer = setInterval(tick, 1000);
  tgInput.disabled = false;          // ✅ 입력 활성화 확실히
  tgInput.focus();
  renderStream();                    // ✅ 단어 표시
});

// 리셋: 모두 초기화, 입력 비활성화
if (tgReset) tgReset.addEventListener('click', ()=>{
  clearInterval(tgTimer);
  stream=[]; streamIdx=0; tgCorrectN=0; tgWrongN=0; tgRemain=0;
  tgKeystrokes = 0;                  // ✅ 초기화
  tgResults = [];                      // ✅ 결과 초기화
  tgStarted = false;                 // ✅ 시작 전 상태
  wordStream.textContent=''; tgInput.value=''; tgInput.disabled=true;
  tgCorrect.textContent='0'; tgWrong.textContent='0'; tgWpm.textContent='0'; tgTime.textContent='00:00';
});

// ✅ 타자수(키 입력) 집계 + 단어 제출 로직
if (tgInput) {
  // ✅ 한/영 IME 조합 상태 추적(한글 입력 깜빡임 방지용)
  tgInput.addEventListener('compositionstart', () => { tgIsComposing = true; });
  tgInput.addEventListener('compositionend',   () => { tgIsComposing = false; renderStream(); });

  // ✅ 글자가 실제로 바뀐 직후에 현재 단어 빨간색/정상 표시
  tgInput.addEventListener('input', () => {
    // IME 조합 중에는 오탐(빨간색 깜빡임)을 줄이고 싶으면 아래 한 줄 주석 해제:
    // if (tgIsComposing) return;
    renderStream();
  });

  tgInput.addEventListener('keydown', (e)=>{
    // 타자수: 실제 눌린 키만 센다
    if (e.key.length === 1 || ['Backspace','Space','Enter','Tab'].includes(e.key)) {
      tgKeystrokes++;
      updateTgStats();  // 변화 즉시 반영
    }

    // 단어 제출: Space 또는 Enter
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault(); // 입력창에 공백 줄줄 쌓이는 것 방지
      if (!tgStarted) return;  // 시작 전이면 무시

      const attempt = (tgInput.value || '').trim();
      const target = stream[streamIdx] || '';
      if (attempt.length > 0) {
        if (attempt === target) {
          tgCorrectN++; tgCorrect.textContent = String(tgCorrectN);
          tgResults[streamIdx] = 'ok';     // ✅ 결과 기록
        } else {
          tgWrongN++; tgWrong.textContent = String(tgWrongN);
          tgResults[streamIdx] = 'bad';    // ✅ 결과 기록
        }
      } else {
        // 빈 제출을 오답으로 치고 싶다면 주석 해제:
        tgWrongN++; tgWrong.textContent = String(tgWrongN);
        tgResults[streamIdx] = 'bad';
      }
      
      // 다음 단어로
      streamIdx++;
      tgInput.value = '';
      // ⛳ 마지막 단어 완료 시 종료
      if (streamIdx >= stream.length) {
        endTogether('done');
        return;                 // 더 이상 렌더/통계 업데이트 불필요
      }
      renderStream();
      updateTgStats();
    }
  });
}

//여기까지 단어 풀

const SOLO_LIMIT_SEC = 10*60;
let soloText=''; let soloStartTs=0; let soloTimer=0; let soloKeystrokes=0; let soloRemainSec=SOLO_LIMIT_SEC;

const soloTextEl=$('#soloText'), soloInput=$('#soloInput'), soloNew=$('#soloNew'), soloStart=$('#soloStart');
const soloProgress=$('#soloProgress'), soloAccuracy=$('#soloAccuracy'), soloWpm=$('#soloWpm'), soloCpm=$('#soloCpm'), soloTime=$('#soloTime'), soloRemain=$('#soloRemain');
const soloKeystrokesEl = document.querySelector('#soloKeystrokes') || null;

function escapeHtml(s){return (s||'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderDecorated(){
  if (!soloStartTs){ soloTextEl.textContent='시작 버튼을 누르면 지문이 표시됩니다.'; return; }
  const target=soloText||''; const typed=soloInput.value||''; let html=''; const len=target.length; const tLen=typed.length;
  for (let i=0;i<len;i++){
    const t=target[i]; const u=typed[i]??'';
    if (i<tLen){ html += (u===t) ? `<span class="mark-correct">${escapeHtml(t)}</span>` : `<span class="mark-wrong">${escapeHtml(t)}</span>`; }
    else if (i===tLen){ html += `<span class="mark-next">${escapeHtml(t)}</span>`; }
    else { html += `<span>${escapeHtml(t)}</span>`; }
  }
  soloTextEl.innerHTML = html;
}

function updateSoloStats(){
  const typed=soloInput.value; const total=soloText.length; let correct=0;
  for (let i=0;i<typed.length && i<total;i++){ if (typed[i]===soloText[i]) correct++; }
  const progress=Math.min(typed.length/Math.max(1,total),1); const accuracy=typed.length?Math.round((correct/typed.length)*100):100;
  soloProgress.textContent=Math.round(progress*100)+'%'; soloAccuracy.textContent=accuracy+'%';
  const elapsed=soloStartTs?Math.max(0,Math.floor((Date.now()-soloStartTs)/1000)):0;
  soloTime.textContent=`${pad2(Math.floor(elapsed/60))}:${pad2(elapsed%60)}`;
  soloRemain.textContent=`${pad2(Math.floor(soloRemainSec/60))}:${pad2(soloRemainSec%60)}`;
  const wpm=elapsed>0?Math.round(((typed.length)/5)/(elapsed/60)):0; soloWpm.textContent=isFinite(wpm)?wpm:0;
  const cpm=elapsed>0?Math.round(soloKeystrokes/(elapsed/60)):0; soloCpm.textContent=isFinite(cpm)?cpm:0;
  if (soloKeystrokesEl) soloKeystrokesEl.textContent = String(soloKeystrokes);
  if (typed.length>=total && typed===soloText){
    soloInput.disabled = true;
    clearInterval(soloTimer);
    submitSoloScore(); // 완주 시 제출
  }
}

// ===== 점수 제출 관련 (Firebase만 사용) =====
let soloSubmitted = false;

function getUser() {
  const u = JSON.parse(localStorage.getItem('typing_user_v9') || localStorage.getItem('typing_user_v3') || 'null');
  return u && u.id && u.name ? u : { id: 'unknown', name: 'unknown' };
}

async function submitSoloScore() {
  // ✅ firebase 준비될 때까지 대기
  if (window.TypingReady) { try { await window.TypingReady; } catch(_){} }

  if (!(window.TypingAPI && typeof window.TypingAPI.submitScore === 'function')) {
    alert('데이터 저장 준비가 안 되었습니다. firebase_init.js 로드/설정을 확인하세요.');
    return;
  }
  if (soloSubmitted) return;
  soloSubmitted = true;

  const user = getUser();
  const typed = soloInput.value || '';
  const total = soloText.length;
  let correct = 0;
  for (let i = 0; i < typed.length && i < total; i++) {
    if (typed[i] === soloText[i]) correct++;
  }

  const elapsed = soloStartTs ? Math.max(1, Math.floor((Date.now() - soloStartTs) / 1000)) : 1;
  const wpm = Math.round(((typed.length) / 5) / (elapsed / 60));
  const accuracy = typed.length ? Math.round((correct / typed.length) * 100) : 100;

  if (window.TypingAPI && typeof window.TypingAPI.submitScore === 'function') {
    try {
      await window.TypingAPI.submitScore({
        sid: user.id,
        sname: user.name,
        mode: 'solo',
        wpm,
        accuracy,
        time_sec: elapsed
      });
      console.log('[submit] Firebase 저장 완료');
    } catch (e) {
      console.error('[submit] Firebase 저장 실패', e);
      alert('점수 저장에 실패했습니다. firebase_init.js가 올바르게 연결되었는지 확인하세요.');
    }
  } else {
    alert('데이터 저장 준비가 안 되었습니다. firebase_init.js 로드 여부를 확인하세요.');
  }
}

function pickSolo(){
  const pool=getParagraphPool();
  soloText = pool[Math.floor(Math.random()*pool.length)] || '자료 없음';
  soloTextEl.textContent='시작 버튼을 누르면 지문이 표시됩니다.';
  soloInput.value=''; soloKeystrokes=0; soloInput.disabled=true; clearInterval(soloTimer);
  soloStartTs=0; soloRemainSec=SOLO_LIMIT_SEC; updateSoloStats();
  soloSubmitted = false; // 새 라운드에서 다시 제출 가능
}

// 버튼 이벤트
soloNew.addEventListener('click', pickSolo);
soloStart.addEventListener('click', ()=>{
  if (!soloText) pickSolo();
  soloInput.disabled=false; soloInput.focus(); soloStartTs=Date.now(); clearInterval(soloTimer); renderDecorated();
  soloTimer=setInterval(()=>{
    if (soloRemainSec>0) soloRemainSec--;
    updateSoloStats(); renderDecorated();
    if (soloRemainSec<=0){
      clearInterval(soloTimer);
      soloInput.disabled=true;
      submitSoloScore(); // 시간 종료 시 제출
    }
  },1000);
});
soloInput.addEventListener('input', ()=>{ updateSoloStats(); renderDecorated(); });
soloInput.addEventListener('keydown', (e)=>{ if (e.key.length===1 || ['Backspace','Space','Enter','Tab'].includes(e.key)) soloKeystrokes++; });

// 첫 로드 시 한 번 준비
pickSolo();
