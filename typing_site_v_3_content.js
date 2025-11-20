// typing_site_v_3_content.js
export const PRELOAD_TXT = {
  enabled: true,
  files: [
{ name: 'kor_eng_1.txt', 
  text: `정보의 양이 폭발적으로 증가하는 시대에는 읽고 쓰는 속도 자체가 학습 효율을 좌우합니다. Keep practicing typing so that your hands can follow your thoughts. 꾸준한 연습은 긴 글을 읽고 요약하거나, 근거를 들어 설명하는 과정을 훨씬 수월하게 만들어 줍니다.` },
{ name: 'kor_eng_2.txt', 
  text: `In an increasingly interconnected world, learning to type accurately and efficiently remains a foundational skill for students. 긴 글에서 핵심을 파악하고 구조화하여 표현하는 능력은 교과 전반의 이해도를 높입니다. With deliberate practice, you can focus on ideas rather than the keyboard.` }, 
{name: 'kor_eng_3.txt', 
  text: `This is because the brain has something of a two­tier memory system at work when it comes to retrieving memories, and this gives rise to a common yet infuriating sensation: recognising someone, but not being able to remember how or why, or what their name is. 이는 기억을 생각해 내는 것에 있어서 뇌가 2단계의 기억 시스템을 가진 무언가를 작동하도록 만들기 때문이며, 이것이 누군가를 알아볼 수는 있지만 어떻게, 왜 (아는지) 또는 그 사람의 이 름이 무엇인지는 기억하지 못하는, 흔하지만 짜증 나 는 감정을 유발한다.` },
{name: 'kor_eng_4.txt', 
  text: `For example, a taxi driver picks up his clients and transports them to their desired destination because they are committed to paying him afterwards for the service, and a construction worker performs her job every day because her employer has made a credible commitment to pay her at the end of the month. 예를 들어, 택시 기사는 고객이 나중에 서 비스에 대해 비용을 지불하겠다고 약속했기 때문에 고 객을 태워 (고객이) 원하는 목적지로 운송하고, 건설 노동자는 고용주가 월말에 (급여를) 지불하겠다는 신뢰할 만한 약속을 했기 때문에 매일 업무를 수행한다.` },
{name: 'kor_eng_5.txt', 
  text: `Indeed, the taxi driver and the construction worker are willing to accept money as payment only because a network of other agents (notably the central bank) is committed to taking various measures to sustain the currency in question. Moreover, commitments make people willing to perform actions that they would not otherwise perform. 사실, 택시 기사와 건설 노동자가 돈을 보수로 기꺼이 받아들이는 것은 오로지 다른 주체(특히 중앙은행)들 의 네트워크가 해당 통화를 유지하기 위한 다양한 조치를 취할 것을 약속했기 때문이다. 게다가, 약속은 사람들이 그렇지 않으면 수행하지 않을 행동을 기꺼이 수행하도 록 만든다. ` },
{name: 'kor_eng_6.txt', 
  text: `This happens because the brain differentiates between familiarity and recall. To clarify, familiarity (or recognition) is when you encounter someone or something and you know you’ve done so before. But beyond that, you’ve got nothing; all you can say is this person/thing is already in your memories. 이는 뇌가 친숙함과 회상을 구별 하기 때문에 발생한다. 명확하게 하자면, 친숙함(또는 인식)은 누군가 또는 무언가를 마주쳤고 이전에 그런 적이 있다는 것을 아는 경우이다. 하지만 그 이상으로는, 당신이 아는 것이 없고, 당신이 말할 수 있는 것은 이 사람/사물이 이미 기억 속에 있다는 것뿐이다. ` }
  ]
};

export function parseTxt(raw){
  const paragraphs = raw.replace(/\r\n/g,'\n').split(/\n{2,}/).map(s=>s.trim()).filter(s=>s.length>=120 && s.length<=4000).slice(0,2000);
  const words = raw.replace(/\u3000/g,' ').split(/[^\p{L}\p{N}_]+/u).map(w=>w.trim()).filter(w=>w.length>=1 && w.length<=24).slice(0,40000);
  return { paragraphs, words };
}

export function buildFromPreload(preload=PRELOAD_TXT){
  if (!preload?.enabled || !preload.files?.length) return null;
  let paragraphs=[], words=[];
  for (const f of preload.files){
    const sets = parseTxt(f.text);
    paragraphs = paragraphs.concat(sets.paragraphs);
    words = words.concat(sets.words);
  }
  return { paragraphs: Array.from(new Set(paragraphs)), words: Array.from(new Set(words)) };
}
