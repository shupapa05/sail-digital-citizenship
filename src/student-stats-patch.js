import { getMonthlyHistory } from './api.js';

const css = `
.stats-dashboard{display:grid;gap:16px}.stats-card{background:#fff;border:1px solid #d9e5f4;border-radius:22px;padding:20px;box-shadow:0 14px 30px rgb(28 80 150 / 10%)}.stats-card h2{margin:0 0 12px}.stats-overview{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat-box{background:#f8fbff;border:1px solid #d9e5f4;border-radius:18px;padding:16px;text-align:center}.stat-box strong{display:block;font-size:34px;color:#07192f}.stat-box span{font-weight:800;color:#60738d}.area-bars{display:grid;gap:10px}.area-row{display:grid;grid-template-columns:70px 1fr 44px;align-items:center;gap:10px}.area-track{height:14px;background:#e9f0f7;border-radius:999px;overflow:hidden}.area-fill{height:100%;border-radius:999px}.area-fill.s{background:#3b82f6}.area-fill.a{background:#f97316}.area-fill.i{background:#a855f7}.area-fill.l{background:#22c55e}.line-chart{width:100%;height:auto;color:#3264df;background:#f8fbff;border-radius:16px;padding:8px}.line-chart text{font-size:10px;fill:#60738d}.choice-chips{display:flex;flex-wrap:wrap;gap:8px}.choice-chip{background:#eef6ff;border:1px solid #d9e5f4;border-radius:999px;padding:8px 12px;font-weight:800;color:#31435a}.insight-list{display:grid;gap:8px}.insight-list p{margin:0;background:#f8fbff;border-radius:14px;padding:12px}.photo-note-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}@media(max-width:720px){.stats-overview,.photo-note-grid{grid-template-columns:1fr}.area-row{grid-template-columns:58px 1fr 38px}.stat-box strong{font-size:28px}}
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);

function typeOf(x){return String(x.mission_type||x.type||'').toUpperCase()}
function label(t){return {S:'안전',A:'책임',I:'윤리',L:'소통'}[t]||t}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function countBy(arr,fn){return (arr||[]).reduce((a,x)=>{const k=fn(x); if(k)a[k]=(a[k]||0)+1; return a}, {})}

function kstYmd(date){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
}

function normalizeYmd(value){
  const raw = String(value ?? '').trim();
  if(!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(raw);
  if(Number.isNaN(parsed.getTime())) return '';
  return kstYmd(parsed);
}

function ddmmFromYmd(ymd){
  const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return String(ymd || '');
  return `${m[3]}/${m[2]}`;
}

function missionDateOf(item){
  return item?.date || item?.mission_date || item?.created_at || item?.createdAt || '';
}

function last7Days(){
  return Array.from({length:7},(_,i)=>{
    const d = new Date();
    d.setDate(d.getDate()-(6-i));
    const key = kstYmd(d);
    return { key, label: ddmmFromYmd(key) };
  });
}

function lineChart(items){
  const days = last7Days();
  const dayCount = days.reduce((acc, day) => {
    acc[day.key] = 0;
    return acc;
  }, {});

  (items || []).forEach(item => {
    const key = normalizeYmd(missionDateOf(item));
    if(!key) return;
    if(Object.prototype.hasOwnProperty.call(dayCount, key)) {
      dayCount[key] += 1;
    }
  });

  const labels = days.map(day => day.label);
  const vals = days.map(day => dayCount[day.key] || 0);
  const max = Math.max(1,...vals);
  const pts = vals.map((v,i)=>`${28+i*48},${112-(v/max)*82}`).join(' ');

  return `<svg class="line-chart" viewBox="0 0 340 145"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>${vals.map((v,i)=>`<circle cx="${28+i*48}" cy="${112-(v/max)*82}" r="5" fill="currentColor"></circle><text x="${28+i*48}" y="136" text-anchor="middle">${labels[i]}</text><text x="${28+i*48}" y="${102-(v/max)*82}" text-anchor="middle">${v}</text>`).join('')}</svg>`
}

function choices(items){
  return (items || []).flatMap(x=>[x.choice1_text,x.choice2_text,x.choice3_text,x.choice1Text,x.choice2Text,x.choice3Text]).filter(Boolean)
}

function renderStatsHtml(items){
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const byType = countBy(list,typeOf);
  const maxArea = Math.max(1,...['S','A','I','L'].map(t=>byType[t]||0));
  const note = list.filter(x=>x.note||x.memo).length;
  const photo = list.filter(x=>x.photo_url||x.photoUrl||x.photo_file_id||x.photoFileId).length;
  const activeDays = new Set(list.map(x=>normalizeYmd(missionDateOf(x))).filter(Boolean)).size;
  const ch = choices(list);
  const topChoices = Object.entries(countBy(ch,x=>x)).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const best = Object.entries(byType).sort((a,b)=>b[1]-a[1])[0];
  const weak = Object.entries({S:byType.S||0,A:byType.A||0,I:byType.I||0,L:byType.L||0}).sort((a,b)=>a[1]-b[1])[0];

  return `<section class="stats-dashboard"><div class="stats-card"><h1>나의 성장 통계</h1><div class="stats-overview"><div class="stat-box"><strong>${total}</strong><span>이번 달 실천</span></div><div class="stat-box"><strong>${activeDays}</strong><span>참여한 날</span></div><div class="stat-box"><strong>${note+photo}</strong><span>기록/사진 활용</span></div></div></div><div class="stats-card"><h2>영역별 실천 균형</h2><div class="area-bars">${['S','A','I','L'].map(t=>`<div class="area-row"><b>${label(t)}</b><div class="area-track"><i class="area-fill ${t.toLowerCase()}" style="width:${Math.round(((byType[t]||0)/maxArea)*100)}%"></i></div><strong>${byType[t]||0}</strong></div>`).join('')}</div></div><div class="stats-card"><h2>최근 7일 실천 흐름</h2>${lineChart(list)}</div><div class="photo-note-grid"><div class="stats-card"><h2>기록 습관</h2><div class="stats-overview"><div class="stat-box"><strong>${note}</strong><span>메모</span></div><div class="stat-box"><strong>${photo}</strong><span>사진</span></div><div class="stat-box"><strong>${Math.round((note+photo)/Math.max(1,total)*100)}%</strong><span>표현률</span></div></div></div><div class="stats-card"><h2>선택 분석</h2><div class="choice-chips">${topChoices.length?topChoices.map(([k,v])=>`<span class="choice-chip">${esc(k)} ${v}</span>`).join(''):'<p>선택 데이터가 아직 부족합니다.</p>'}</div></div></div><div class="stats-card"><h2>AI 요약 느낌의 성장 읽기</h2><div class="insight-list"><p>가장 많이 실천한 영역은 <b>${label(best?.[0])}</b>입니다.</p><p>다음에는 <b>${label(weak?.[0])}</b> 영역을 조금 더 실천하면 균형이 좋아집니다.</p><p>메모와 사진을 함께 남기면 단순 점수보다 성장 과정이 더 잘 보입니다.</p></div></div></section>`
}

async function replaceStats(){
  const title = document.querySelector('.profile h1');
  if(!title||title.textContent.trim()!=='나의 통계') return;

  const profile = document.querySelector('.profile');
  if(!profile||profile.dataset.richStats==='1') return;

  profile.dataset.richStats='1';

  try{
    const id = localStorage.getItem('SAIL_STUDENT_ID');
    const now = new Date();
    const res = await getMonthlyHistory(id,now.getFullYear(),now.getMonth()+1);
    profile.outerHTML = renderStatsHtml(Array.isArray(res.items)?res.items:[]);
  }catch{
    profile.outerHTML = renderStatsHtml([]);
  }
}

new MutationObserver(replaceStats).observe(document.body,{childList:true,subtree:true});
