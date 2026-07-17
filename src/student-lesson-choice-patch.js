const PATCH_KEY = '__SAIL_STUDENT_LESSON_CHOICE_PATCHED__';
const HOME_CACHE_KEY = 'SAIL_LESSON_CHOICE_HOME_CACHE_V2';
const SHARED_FUN_CACHE_KEY = 'SAIL_FUN_HOME_CACHE_V1';
const RPC_PATHS = ['/rpc/login_student', '/rpc/get_student_home', '/rpc/save_mission_result'];

if (!window[PATCH_KEY]) {
  window[PATCH_KEY] = true;
  injectStyles();
  patchHomeCache();
  observeForms();
  setTimeout(applyLessonChoices, 250);
}

const TOPICS = [
  { keys: ['비밀번호', '보안', '금고', '인증', '계정'], name: '비밀번호와 계정 보호', action: '비밀번호나 계정을 안전하게 지키는 행동', risk: '다른 사람이 내 계정이나 개인정보에 접근할 수 있음', habit: '비밀번호를 공유하지 않고 주기적으로 점검하기' },
  { keys: ['개인정보', '사진', '위치', '얼굴', '주소', '전화번호', '공개'], name: '개인정보 보호', action: '공개 전 개인정보가 들어 있는지 확인하는 행동', risk: '한 번 공개된 정보가 빠르게 퍼질 수 있음', habit: '사진과 글을 올리기 전 정보 공개 범위 확인하기' },
  { keys: ['출처', '저작권', '자료', '작품', '인용', '복사', '창작자'], name: '출처와 저작권 존중', action: '자료의 출처와 사용 가능 여부를 확인하는 행동', risk: '다른 사람의 권리와 노력을 침해할 수 있음', habit: '자료를 사용할 때 출처를 함께 남기기' },
  { keys: ['댓글', '대화', '말', '표현', '존중', '배려', '감정'], name: '존중하는 온라인 대화', action: '상대가 어떻게 느낄지 생각하고 표현하는 행동', risk: '온라인 말도 실제 상처나 갈등으로 이어질 수 있음', habit: '보내기 전에 상대 입장에서 다시 읽어보기' },
  { keys: ['허위', '가짜', '뉴스', '정보', '사실', '검색', '확인'], name: '정보 확인과 판단', action: '정보의 출처와 근거를 확인하는 행동', risk: '틀린 정보가 퍼져 잘못된 판단을 만들 수 있음', habit: '공유하기 전 여러 자료와 비교하기' },
  { keys: ['알고리즘', '추천', 'AI', '인공지능', '자동', '데이터'], name: 'AI와 알고리즘 이해', action: '추천이나 AI 결과를 그대로 믿지 않고 확인하는 행동', risk: '추천 결과가 항상 정확하거나 공정하지 않을 수 있음', habit: 'AI 답변과 추천 정보의 근거 확인하기' },
  { keys: ['시간', '사용', '게임', '영상', '중독', '조절', '스마트폰'], name: '디지털 사용 조절', action: '사용 시간을 정하고 스스로 조절하는 행동', risk: '생활 균형과 해야 할 일이 흐트러질 수 있음', habit: '사용 시간과 쉬는 시간을 미리 정하기' },
  { keys: ['갈등', '오해', '다툼', '사과', '해결', '불편'], name: '온라인 갈등 해결', action: '상대의 말을 듣고 차분히 해결하려는 행동', risk: '오해가 커지고 관계가 나빠질 수 있음', habit: '바로 공격하지 않고 설명하거나 도움 요청하기' },
  { keys: ['공유', '전송', '게시', '업로드', '퍼뜨', '전달'], name: '책임 있는 공유', action: '보내기 전 내용과 대상을 확인하는 행동', risk: '보낸 내용이 빠르게 퍼져 피해가 생길 수 있음', habit: '공유 전 허락과 사실 여부 확인하기' },
  { keys: ['광고', '구매', '상업', '결제', '유료', '소비'], name: '광고와 소비 판단', action: '광고인지 정보인지 구분하고 필요성을 생각하는 행동', risk: '상업적 의도에 따라 충동적으로 선택할 수 있음', habit: '결제나 구매 전 보호자와 상의하기' }
];

const FALLBACK = { name: '디지털 시민 행동', action: '질문과 관련된 상황에서 책임 있게 판단하는 행동', risk: '나와 다른 사람 모두에게 영향을 줄 수 있음', habit: '행동하기 전에 한 번 더 생각하기' };

function patchHomeCache() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  window.fetch = async function patchedFetch(input, init) {
    const response = await originalFetch.apply(this, arguments);
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!RPC_PATHS.some(path => url.includes(path))) return response;

    try {
      const data = await response.clone().json();
      if (data?.mission_selection?.mode === 'lesson' || data?.missions?.some(m => m?.lesson_mode || m?.lesson_question_id)) {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(data));
      }
      setTimeout(applyLessonChoices, 80);
    } catch {}

    return response;
  };
}

function readHome() {
  for (const key of [HOME_CACHE_KEY, SHARED_FUN_CACHE_KEY]) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}') || {};
      if (Array.isArray(data.missions)) return data;
    } catch {}
  }
  return {};
}

function visibleQuestion() {
  return document.querySelector('.mission-question')?.textContent?.trim() || '';
}

function currentMission(data, question) {
  const missions = Array.isArray(data.missions) ? data.missions : [];
  return missions.find(mission => String(mission.event_question || '').trim() === question) ||
    missions.find(mission => String(mission.check_question || '').trim() === question) ||
    missions.find(mission => mission?.lesson_mode || mission?.lesson_question_id) ||
    null;
}

function topicFor(text) {
  const value = String(text || '');
  return TOPICS.find(topic => topic.keys.some(key => value.includes(key))) || FALLBACK;
}

function hash(value) {
  return String(value || '').split('').reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 0);
}

function rotate(list, seed) {
  const rows = list.slice();
  if (!rows.length) return rows;
  const start = Math.abs(hash(seed)) % rows.length;
  return rows.slice(start).concat(rows.slice(0, start));
}

function questionFocus(question, topic) {
  const text = String(question || '').replace(/[?!.]/g, '').trim();
  const matchedKey = TOPICS.flatMap(t => t.keys).find(key => text.includes(key));
  if (matchedKey) return matchedKey;
  const chunks = text.split(/\s+/).filter(word => word.length >= 2 && !['무엇인가요', '어떤', '왜', '어떻게', '필요한가요', '있나요'].includes(word));
  return chunks.slice(-2).join(' ') || topic.name;
}

function stageOf(mission, question) {
  const stage = Number(mission?.level || mission?.stage || 0);
  if (stage) return stage;
  if (String(question).includes('왜') || String(question).includes('이유')) return 2;
  if (String(question).includes('앞으로') || String(question).includes('필요')) return 3;
  return 1;
}

function choicesForQuestion({ question, mission, topic }) {
  const stage = stageOf(mission, question);
  const focus = questionFocus(question, topic);
  const seed = `${mission?.lesson_question_id || mission?.mission_id || ''}:${question}`;

  const stageOne = {
    titles: ['무엇을 발견했나요?', '왜 눈에 띄었나요?', '어떤 선택을 했나요?'],
    rows: [
      [`${focus}와 관련된 위험 신호를 찾았다`, `${topic.action}을 떠올렸다`, `내 경험에서 비슷한 상황을 떠올렸다`],
      [`쉽게 지나치면 ${topic.risk}기 때문이다`, `${topic.name}은 작은 선택에서 시작되기 때문이다`, `친구에게도 영향을 줄 수 있다고 생각했기 때문이다`],
      [`오늘부터 ${topic.habit}`, `${focus} 상황에서는 먼저 멈추고 확인하기`, `비슷한 일이 생기면 어른이나 친구와 상의하기`]
    ]
  };

  const stageTwo = {
    titles: ['어떤 판단을 했나요?', '그 이유는 무엇인가요?', '무엇을 조심해야 하나요?'],
    rows: [
      [`${focus}는 그냥 넘기면 안 된다고 판단했다`, `먼저 사실과 상황을 확인해야 한다고 생각했다`, `상대방과 나 모두에게 영향을 생각해야 한다고 보았다`],
      [`${topic.risk}기 때문이다`, `${topic.name}은 신중한 판단이 필요하기 때문이다`, `잘못된 선택이 온라인에서 빠르게 커질 수 있기 때문이다`],
      [`확인 없이 바로 행동하지 않기`, `${topic.habit}`, `친구에게 설명할 수 있을 만큼 근거를 확인하기`]
    ]
  };

  const stageThree = {
    titles: ['앞으로 어떻게 할까요?', '실천 약속은 무엇인가요?', '친구에게 권할 방법은?'],
    rows: [
      [`${topic.habit}`, `${focus} 상황에서 먼저 확인하고 행동하기`, `내가 할 수 있는 안전한 방법을 정하기`],
      [`나와 친구를 함께 지키는 약속이기 때문이다`, `${topic.risk}기 때문이다`, `${topic.name}을 꾸준히 실천해야 하기 때문이다`],
      [`친구에게 ${topic.name}의 이유를 설명하기`, `우리 반 약속으로 ${topic.habit}`, `비슷한 상황을 보면 멈추고 확인하자고 말하기`]
    ]
  };

  const pack = stage >= 3 ? stageThree : stage === 2 ? stageTwo : stageOne;
  return {
    titles: pack.titles,
    rows: pack.rows.map((row, index) => rotate(row, `${seed}:${index}`).slice(0, 3)),
    hint: stage >= 3 ? '이 질문의 실천 약속을 골라요' : stage === 2 ? '이 질문의 이유와 판단을 골라요' : '이 질문에서 발견한 점을 골라요'
  };
}

function setGroupTitle(group, title) {
  const section = document.querySelector(`[data-choice-group="${group}"]`)?.closest('.choice-group');
  const heading = section?.querySelector('h2');
  if (heading) heading.textContent = title;
}

function replaceButtons(group, labels) {
  const buttons = Array.from(document.querySelectorAll(`[data-choice-group="${group}"]`));
  buttons.forEach((button, index) => {
    const label = labels[index] || labels[labels.length - 1] || button.textContent.trim();
    button.textContent = label;
    button.dataset.choiceText = label;
    button.setAttribute('aria-label', label);
  });
}

function applyLessonChoices() {
  const form = document.querySelector('#missionForm');
  if (!form) return;

  const question = visibleQuestion();
  if (!question) return;

  const appliedKey = `${question}:${document.querySelector('[data-choice-group="choice1"]')?.dataset.choiceCode || ''}`;
  if (form.dataset.lessonChoiceApplied === appliedKey) return;

  const data = readHome();
  const mission = currentMission(data, question);
  const isLesson = mission?.lesson_mode || mission?.lesson_question_id || data?.mission_selection?.mode === 'lesson';
  if (!isLesson) return;

  const topic = topicFor(`${question} ${mission?.mission_title || ''} ${mission?.check_question || ''}`);
  const choices = choicesForQuestion({ question, mission, topic });
  setGroupTitle('choice1', choices.titles[0]);
  setGroupTitle('choice2', choices.titles[1]);
  setGroupTitle('choice3', choices.titles[2]);
  replaceButtons('choice1', choices.rows[0]);
  replaceButtons('choice2', choices.rows[1]);
  replaceButtons('choice3', choices.rows[2]);

  form.querySelector('.lesson-choice-hint')?.remove();
  const hint = document.createElement('p');
  hint.className = 'lesson-choice-hint';
  hint.textContent = choices.hint;
  form.prepend(hint);
  form.dataset.lessonChoiceApplied = appliedKey;
}

function observeForms() {
  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(applyLessonChoices, 80);
  }).observe(document.body, { childList: true, subtree: true });
}

function injectStyles() {
  if (document.querySelector('#lessonChoicePatchStyles')) return;
  const style = document.createElement('style');
  style.id = 'lessonChoicePatchStyles';
  style.textContent = `
    .lesson-choice-hint{margin:0 0 14px;padding:10px 12px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;color:#1e3a8a;font-weight:900;text-align:center}
    .choice-button{line-height:1.45;min-height:48px;text-align:left}
  `;
  document.head.appendChild(style);
}
