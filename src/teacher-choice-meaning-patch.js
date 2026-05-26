const DASHBOARD_CACHE_KEY = 'SAIL_TEACHER_CITIZENSHIP_ANALYSIS_V1';

injectChoiceMeaningStyles();
observeChoiceCard();
setInterval(replaceChoiceCard, 900);
setTimeout(replaceChoiceCard, 300);

function injectChoiceMeaningStyles() {
  if (document.querySelector('#teacherChoiceMeaningStyles')) return;
  const style = document.createElement('style');
  style.id = 'teacherChoiceMeaningStyles';
  style.textContent = `
    .choice-meaning-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%);display:grid;gap:14px}
    .choice-meaning-card h2{margin:0;color:#07192f;font-size:24px}
    .choice-meaning-note{margin:0;color:#415a77;font-weight:800;line-height:1.55;background:#f8fbff;border:1px solid #d9e5f4;border-radius:16px;padding:12px}
    .choice-meaning-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .choice-meaning-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:14px;display:grid;gap:8px}
    .choice-meaning-box span{font-weight:950;color:#60738d}
    .choice-meaning-box strong{font-size:24px;color:#07192f;line-height:1.25}
    .choice-meaning-box small{color:#415a77;font-weight:800;line-height:1.45}
    .meaning-meter{height:10px;background:#e9f0f7;border-radius:999px;overflow:hidden}
    .meaning-meter i{display:block;height:100%;background:#3264df;border-radius:999px}
    .choice-meaning-list{display:grid;gap:6px;margin:0;padding:0;list-style:none}
    .choice-meaning-list li{display:flex;justify-content:space-between;gap:8px;border-top:1px solid #e5edf7;padding-top:6px;color:#334155;font-weight:800;font-size:13px}
    .choice-meaning-insight{background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:12px;color:#7c2d12;font-weight:900;line-height:1.55}
    @media(max-width:720px){.choice-meaning-grid{grid-template-columns:1fr}.choice-meaning-box strong{font-size:21px}}
  `;
  document.head.appendChild(style);
}

function observeChoiceCard() {
  new MutationObserver(replaceChoiceCard).observe(document.body, { childList: true, subtree: true });
}

function readDashboard() {
  try { return JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || '{}') || {}; }
  catch { return {}; }
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

function num(value) { return Number(value || 0); }

function choiceRows(data) {
  return data.choices || data.choice_top || data.choiceTop || [];
}

function groupKey(row) {
  const raw = String(row.choice_group || row.choiceGroup || row.group || row.category || row.type || '').toLowerCase();
  if (raw.includes('choice1') || raw.includes('action') || raw.includes('행동')) return 'action';
  if (raw.includes('choice2') || raw.includes('think') || raw.includes('thought') || raw.includes('생각')) return 'think';
  if (raw.includes('choice3') || raw.includes('heart') || raw.includes('emotion') || raw.includes('마음') || raw.includes('감정')) return 'heart';
  return 'action';
}

function choiceText(row) {
  return row.choice_text || row.choiceText || row.text || row.answer || row.label || '응답';
}

function choiceCount(row) {
  return num(row.count || row.total || row.value || row.cnt || 0);
}

function buildGroups(data) {
  const groups = {
    action: { title: '행동', question: '학생들이 실제로 어떤 행동을 했나', rows: [] },
    think: { title: '생각', question: '어떤 가치나 이유를 떠올렸나', rows: [] },
    heart: { title: '마음', question: '활동 뒤 어떤 감정을 느꼈나', rows: [] }
  };

  choiceRows(data).forEach(row => {
    const key = groupKey(row);
    groups[key].rows.push({ text: choiceText(row), count: choiceCount(row) });
  });

  return Object.values(groups).map(group => {
    const merged = new Map();
    group.rows.forEach(row => merged.set(row.text, (merged.get(row.text) || 0) + row.count));
    const rows = Array.from(merged, ([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const top = rows[0] || { text: '응답 없음', count: 0 };
    const topRate = total ? Math.round(top.count / total * 100) : 0;
    const diversity = rows.filter(row => row.count > 0).length;
    return { ...group, rows, total, top, topRate, diversity };
  });
}

function meaningHtml(data) {
  const groups = buildGroups(data);
  const total = groups[0]?.total || 0;
  if (!total) {
    return `
      <div class="choice-meaning-card" data-choice-meaning-card>
        <h2>행동·생각·마음 선택 해석</h2>
        <p class="choice-meaning-note">아직 선택 응답 데이터가 부족합니다. 학생들이 미션을 기록하면 선택 경향이 표시됩니다.</p>
      </div>
    `;
  }

  const mostFocused = [...groups].sort((a, b) => b.topRate - a.topRate)[0];
  const mostDiverse = [...groups].sort((a, b) => b.diversity - a.diversity)[0];

  return `
    <div class="choice-meaning-card" data-choice-meaning-card>
      <h2>행동·생각·마음 선택 해석</h2>
      <p class="choice-meaning-note">총합은 미션 구조상 거의 같게 나옵니다. 그래서 여기서는 총 횟수보다 <b>각 영역 안에서 어떤 응답이 몰렸는지</b>를 봅니다.</p>
      <div class="choice-meaning-grid">
        ${groups.map(group => `
          <div class="choice-meaning-box">
            <span>${group.title}</span>
            <strong>${esc(group.top.text)}</strong>
            <div class="meaning-meter"><i style="width:${group.topRate}%"></i></div>
            <small>${group.top.count}/${group.total}명 선택 (${group.topRate}%) · 응답 종류 ${group.diversity}개</small>
            <ul class="choice-meaning-list">
              ${group.rows.slice(0, 3).map(row => `<li><em>${esc(row.text)}</em><b>${row.count}</b></li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
      <div class="choice-meaning-insight">
        가장 반응이 모인 부분은 <b>${mostFocused.title}</b>입니다. “${esc(mostFocused.top.text)}” 응답이 ${mostFocused.topRate}%로 높습니다. 반대로 응답이 가장 다양한 부분은 <b>${mostDiverse.title}</b>이라, 수업 대화 소재로 풀어보기 좋습니다.
      </div>
    </div>
  `;
}

function findOldChoiceCard() {
  return Array.from(document.querySelectorAll('.teacher-card')).find(card => {
    if (card.querySelector('[data-choice-meaning-card]')) return false;
    const title = card.querySelector('h2')?.textContent || '';
    return card.querySelector('.choice-grid') || (title.includes('행동') && title.includes('선택'));
  });
}

function replaceChoiceCard() {
  if (document.querySelector('[data-choice-meaning-card]')) return;
  const oldCard = findOldChoiceCard();
  if (!oldCard) return;
  const data = readDashboard();
  if (!Object.keys(data).length) return;
  oldCard.outerHTML = meaningHtml(data);
}
