const PATCH_KEY = '__SAIL_STUDENT_LESSON_CHOICE_PATCHED__';
const HOME_CACHE_KEY = 'SAIL_LESSON_CHOICE_HOME_CACHE_V1';
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
  {
    keys: ['비밀번호', '보안', '금고', '인증', '계정'],
    how: ['복잡하고 예측하기 어려운 비밀번호를 만들었다', '친구에게 비밀번호를 알려주지 않기로 했다', '비밀번호를 다시 점검해야겠다고 느꼈다'],
    why: ['개인정보와 계정을 지키는 첫 번째 약속이기 때문이다', '한 번 공유하면 다른 사람이 내 정보에 접근할 수 있기 때문이다', '쉽게 맞힐 수 있는 정보는 위험해질 수 있기 때문이다'],
    next: ['비밀번호를 주기적으로 바꾸고 안전하게 보관하겠다', '공용 기기에서는 로그아웃까지 확인하겠다', '수상한 로그인이나 요청은 어른에게 알리겠다']
  },
  {
    keys: ['개인정보', '사진', '위치', '얼굴', '주소', '전화번호', '공개'],
    how: ['올리기 전에 개인정보가 들어 있는지 확인했다', '나와 친구의 정보가 보이지 않게 조심했다', '공개 범위를 먼저 생각해 보았다'],
    why: ['한 번 공개된 정보는 다시 거두기 어렵기 때문이다', '친구의 정보도 허락 없이 올리면 피해가 될 수 있기 때문이다', '작은 정보가 모이면 나를 알아낼 수 있기 때문이다'],
    next: ['사진과 글을 올리기 전 한 번 더 확인하겠다', '친구 정보는 반드시 허락을 받고 사용하겠다', '필요 없는 개인정보는 입력하지 않겠다']
  },
  {
    keys: ['출처', '저작권', '자료', '작품', '인용', '복사', '창작자'],
    how: ['자료를 사용하기 전에 출처를 확인했다', '다른 사람의 작품을 내 것처럼 쓰지 않았다', '필요한 경우 출처를 함께 적었다'],
    why: ['창작자의 노력과 권리를 존중해야 하기 때문이다', '출처가 있어야 정보의 믿을 수 있는 정도를 알 수 있기 때문이다', '무단 사용은 다른 사람에게 피해를 줄 수 있기 때문이다'],
    next: ['자료를 쓸 때 출처를 함께 남기겠다', '사용해도 되는 자료인지 먼저 확인하겠다', '내 생각과 가져온 자료를 구분해서 표현하겠다']
  },
  {
    keys: ['댓글', '대화', '말', '표현', '존중', '배려', '감정'],
    how: ['상대가 기분 나쁘지 않게 표현하려고 했다', '댓글이나 말을 보내기 전에 한 번 더 읽었다', '내 감정만 앞세우지 않으려고 했다'],
    why: ['온라인 말도 실제 사람에게 상처가 될 수 있기 때문이다', '존중하는 표현이 안전한 대화를 만들기 때문이다', '같은 말도 표현 방식에 따라 다르게 받아들여지기 때문이다'],
    next: ['댓글을 쓰기 전 상대 입장에서 다시 읽어보겠다', '불편한 말은 차분하게 바꾸어 표현하겠다', '친구의 생각을 끝까지 듣고 답하겠다']
  },
  {
    keys: ['허위', '가짜', '뉴스', '정보', '사실', '검색', '확인'],
    how: ['정보를 바로 믿지 않고 다시 확인했다', '출처와 날짜를 살펴보았다', '다른 자료와 비교해 보았다'],
    why: ['틀린 정보를 퍼뜨리면 다른 사람도 잘못 판단할 수 있기 때문이다', '믿을 만한 출처인지 확인해야 하기 때문이다', '자극적인 정보일수록 더 조심해야 하기 때문이다'],
    next: ['정보를 공유하기 전 출처와 근거를 확인하겠다', '확실하지 않은 내용은 퍼뜨리지 않겠다', '여러 자료를 비교하며 판단하겠다']
  },
  {
    keys: ['알고리즘', '추천', 'AI', '인공지능', '자동', '데이터'],
    how: ['추천 결과를 그대로 믿지 않고 이유를 생각했다', '내가 본 정보가 왜 추천됐는지 떠올렸다', 'AI가 틀릴 수도 있음을 생각했다'],
    why: ['알고리즘은 내가 본 정보와 선택을 바탕으로 작동하기 때문이다', '추천 정보가 항상 공정하거나 정확한 것은 아니기 때문이다', 'AI 결과도 사람이 확인하고 판단해야 하기 때문이다'],
    next: ['추천 결과를 볼 때 다른 관점도 찾아보겠다', 'AI 답변은 근거를 확인한 뒤 사용하겠다', '내 데이터가 어떻게 쓰일지 생각하겠다']
  },
  {
    keys: ['시간', '사용', '게임', '영상', '중독', '조절', '스마트폰'],
    how: ['사용 시간을 정하고 지키려고 했다', '필요한 활동과 쉬는 활동을 구분했다', '멈춰야 할 때를 스스로 생각했다'],
    why: ['디지털 기기를 오래 쓰면 생활 균형이 흐트러질 수 있기 때문이다', '스스로 조절하는 힘이 책임 있는 사용의 시작이기 때문이다', '해야 할 일을 먼저 하는 습관이 필요하기 때문이다'],
    next: ['사용 시간을 정하고 알림이나 타이머를 활용하겠다', '해야 할 일을 먼저 한 뒤 기기를 사용하겠다', '쉬는 시간에는 몸을 움직이는 활동도 하겠다']
  },
  {
    keys: ['갈등', '오해', '다툼', '사과', '해결', '불편'],
    how: ['오해가 생겼을 때 차분히 설명하려고 했다', '상대의 말을 먼저 들어보려고 했다', '필요하면 사과하거나 도움을 요청했다'],
    why: ['온라인 갈등은 말이 빠르게 퍼져 더 커질 수 있기 때문이다', '상대의 입장을 들어야 문제를 정확히 알 수 있기 때문이다', '차분한 해결이 서로를 지키는 방법이기 때문이다'],
    next: ['갈등이 생기면 바로 공격하지 않고 멈추겠다', '필요하면 선생님이나 보호자에게 도움을 요청하겠다', '상대가 이해할 수 있게 구체적으로 말하겠다']
  },
  {
    keys: ['공유', '전송', '게시', '업로드', '퍼뜨', '전달'],
    how: ['보내기 전에 내용과 대상을 확인했다', '다른 사람에게 피해가 될 수 있는지 생각했다', '공유해도 되는 정보인지 살펴보았다'],
    why: ['한 번 보낸 내용은 빠르게 퍼질 수 있기 때문이다', '내가 보낸 정보가 다른 사람에게 영향을 줄 수 있기 때문이다', '책임 있는 공유가 안전한 온라인 생활을 만들기 때문이다'],
    next: ['전송 전 대상과 내용을 다시 확인하겠다', '확실하지 않은 내용은 공유하지 않겠다', '친구와 관련된 내용은 허락을 먼저 받겠다']
  },
  {
    keys: ['광고', '구매', '상업', '결제', '유료', '소비'],
    how: ['광고인지 정보인지 구분해 보았다', '구매나 결제 전에 꼭 필요한지 생각했다', '과장된 표현을 그대로 믿지 않았다'],
    why: ['광고는 내 선택을 유도하기 위해 만들어질 수 있기 때문이다', '충동적인 결제는 나중에 문제가 될 수 있기 때문이다', '상업적 의도를 알고 판단해야 하기 때문이다'],
    next: ['광고를 볼 때 목적을 먼저 생각하겠다', '결제 전 보호자와 상의하겠다', '과장된 정보는 한 번 더 확인하겠다']
  }
];

const FALLBACK = {
  how: ['질문과 관련된 행동을 직접 실천해 보았다', '상황을 떠올리며 더 나은 행동을 골라 보았다', '아직 실천은 부족하지만 무엇을 해야 할지 알게 되었다'],
  why: ['나와 다른 사람 모두에게 영향을 줄 수 있기 때문이다', '디지털 공간에서도 책임 있는 판단이 필요하기 때문이다', '작은 선택이 더 안전한 온라인 문화를 만들기 때문이다'],
  next: ['다음에는 행동하기 전에 한 번 더 생각하겠다', '친구와 함께 지킬 수 있는 약속으로 만들어 보겠다', '비슷한 상황에서 오늘 배운 방법을 적용하겠다']
};

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

function stageHint(mission, question) {
  const stage = Number(mission?.level || mission?.stage || 0);
  if (stage === 1) return '내 경험과 연결해서 골라요';
  if (stage === 2) return '왜 그런지 판단해요';
  if (stage >= 3) return '앞으로의 실천을 정해요';
  if (String(question).includes('왜')) return '이유를 생각해요';
  return '질문과 가장 가까운 답을 골라요';
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
  if (!form || form.dataset.lessonChoiceApplied === '1') return;

  const question = visibleQuestion();
  if (!question) return;

  const data = readHome();
  const mission = currentMission(data, question);
  const isLesson = mission?.lesson_mode || mission?.lesson_question_id || data?.mission_selection?.mode === 'lesson';
  if (!isLesson) return;

  const topic = topicFor(`${question} ${mission?.mission_title || ''} ${mission?.check_question || ''}`);
  setGroupTitle('choice1', '어떻게 행동했나요?');
  setGroupTitle('choice2', '왜 그렇게 생각했나요?');
  setGroupTitle('choice3', '다음에는 어떻게 할까요?');
  replaceButtons('choice1', topic.how);
  replaceButtons('choice2', topic.why);
  replaceButtons('choice3', topic.next);

  const hint = document.createElement('p');
  hint.className = 'lesson-choice-hint';
  hint.textContent = stageHint(mission, question);
  form.prepend(hint);
  form.dataset.lessonChoiceApplied = '1';
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
    .choice-button{line-height:1.45;min-height:48px}
  `;
  document.head.appendChild(style);
}
