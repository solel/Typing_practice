import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, where, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { FIREBASE_CONFIG } from './firebase_config.js';


// 중복 초기화 방지
const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// 전역 객체 미리 준비(참조 에러 방지)
window.TypingAPI = window.TypingAPI || {};

/**
 * 리더보드 로딩(인덱스가 있을 땐 정렬 3단계, 없으면 폴백)
 * 권장 인덱스(복합):
 *   mode ASC, wpm DESC, accuracy DESC, time_sec ASC
 * -> Firestore 콘솔에서 "복합 인덱스 추가"로 생성
 */
async function loadLeaderboardImpl({ mode = "solo", top = 10, fallbackBatch = 200 }) {
  const scoresRef = collection(db, "scores");
  try {
    // 권장: 3단 정렬 (인덱스 필요)
    const qref = query(
      scoresRef,
      where("mode", "==", mode),
      orderBy("wpm", "desc"),
      orderBy("accuracy", "desc"),
      orderBy("time_sec", "asc"),
      limit(top)
    );
    const snap = await getDocs(qref);
    const rows = [];
    snap.forEach(d => rows.push(d.data()));
    return rows;
  } catch (e) {
    // 인덱스가 없으면 failed-precondition 에러 → 폴백: mode로 N개 가져와 클라이언트 정렬
    if (e?.code === "failed-precondition") {
      const qref2 = query(scoresRef, where("mode", "==", mode), limit(fallbackBatch));
      const snap2 = await getDocs(qref2);
      const rows2 = [];
      snap2.forEach(d => rows2.push(d.data()));
      rows2.sort((a, b) =>
        (b.wpm - a.wpm) ||
        (b.accuracy - a.accuracy) ||
        (a.time_sec - b.time_sec)
      );
      return rows2.slice(0, top);
    }
    throw e;
  }
}

async function submitScoreImpl({ sid, sname, mode, wpm, accuracy, time_sec, uid }) {
  return addDoc(collection(db, "scores"), {
    sid,
    sname,
    mode,
    wpm: Math.round(wpm),
    accuracy: Math.round(accuracy),
    time_sec: Math.round(time_sec),
    uid,
    created_at: serverTimestamp()
  });
}

// 준비 완료 Promise + 이벤트 제공
window.TypingReady = (async () => {
  try {
    await signInAnonymously(auth); // 익명 로그인 (Auth에서 활성화되어 있어야 함)
    const UID = auth.currentUser?.uid || null;

    // 전역 API 연결
    // 준비되기 전에도 호출되면 자동 대기하도록 래핑
    window.TypingAPI.submitScore = async (args) => submitScoreImpl({ ...args, uid: UID });
    window.TypingAPI.loadLeaderboard = async (args) => loadLeaderboardImpl(args);

    // 알림 이벤트(선택)
    document.dispatchEvent(new Event('typing-ready'));
    return true;
  } catch (err) {
    console.error('[Firebase init error]', err);
    document.dispatchEvent(new CustomEvent('typing-error', { detail: err }));
    throw err;
  }
})();