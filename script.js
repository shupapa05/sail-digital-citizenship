const anniversaryData = [
  {
    key: "earthhour",
    title: "📘 어스아워 (3월 말)",
    meaning: "전 세계가 동시에 불을 끄며 지구에게 휴식을 주는 시간",
    missions: ["전등 10분 이상 끄기", "사용하지 않는 플러그 뽑기", "밤하늘 별 1개 이상 관찰하기"],
    characters: [
      { name: "별빛 수호자 루나", grade: "legendary", desc: "불을 끄면 별빛 마법이 켜져요." },
      { name: "쉼표요정 슬립", grade: "rare", desc: "지구의 휴식 시간을 지켜요." },
      { name: "스위치 요정 틱", grade: "normal", desc: "작은 스위치가 큰 변화를 만들어요." }
    ]
  },
  { key: "earthday", title: "📗 지구의 날 (4월 22일)", meaning: "환경오염의 심각성을 알리고 보호 행동을 시작하는 날", missions: ["양치컵 사용하기", "1km 걷거나 자전거 타기", "오늘의 초록 발자국 한 줄 쓰기"], characters: [
    { name: "물방울 요정 드롭", grade: "legendary", desc: "물을 아끼는 습관을 지켜요." },
    { name: "초록러너 그린", grade: "rare", desc: "걸음마다 탄소를 줄여요." },
    { name: "컵친구 톡", grade: "normal", desc: "양치컵 사용 미션 전문." }
  ] },
  { key: "envday", title: "📙 환경의 날 (6월 5일)", meaning: "UN이 지정한 자원순환 실천의 날", missions: ["분리배출 3종류 정확히 하기", "새활용 아이디어 1개 실천", "오늘 물건 끝까지 사용하기"], characters: [
    { name: "순환박사 리본", grade: "legendary", desc: "버려진 것을 보물로 바꿔요." },
    { name: "분리대장 픽", grade: "rare", desc: "정확한 분리가 지구를 살려요." },
    { name: "업사이클 꼬미", grade: "normal", desc: "작은 창의력이 큰 자원이 돼요." }
  ] },
  { key: "refill", title: "⚪ 세계 리필의 날 (6월 16일)", meaning: "일회용을 줄이고 다시 채우는 소비를 실천하는 날", missions: ["일회용품 1개 거절하기", "텀블러/다회용기 사용", "리필 가능한 물건 찾아보기"], characters: [
    { name: "리필기사 텀비", grade: "legendary", desc: "다시 채우기로 쓰레기를 막아요." },
    { name: "거절용사 노노", grade: "rare", desc: "거절도 멋진 환경 실천!" },
    { name: "용기요정 캡", grade: "normal", desc: "내 용기가 지구 장비예요." }
  ] },
  { key: "desert", title: "🌵 세계 사막화 방지의 날 (6월 17일)", meaning: "황폐화를 막고 숲과 토양의 소중함을 배우는 날", missions: ["종이 한 장 아껴 쓰기", "나무/식물 친구 돌보기", "채소 반찬 남기지 않기"], characters: [
    { name: "숲친구 아보", grade: "legendary", desc: "나무와 토양을 지키는 수호자." },
    { name: "종이지킴이 펄프", grade: "rare", desc: "종이를 아껴 숲을 지켜요." },
    { name: "새싹요정 리프", grade: "normal", desc: "작은 돌봄이 큰 숲을 만들어요." }
  ] },
  { key: "energy", title: "❄️ 에너지의 날 (8월 22일)", meaning: "전력 위기를 기억하며 에너지를 절약하는 날", missions: ["대기전력 차단하기", "에어컨 26도 지키기", "불필요한 조명 끄기"], characters: [
    { name: "에너지헌터 볼트", grade: "legendary", desc: "에너지 흡혈귀를 물리쳐요." },
    { name: "26도 마법사 쿨", grade: "rare", desc: "적정 온도의 지혜를 전해요." },
    { name: "플러그요정 오프", grade: "normal", desc: "한 번 뽑으면 전기가 절약돼요." }
  ] },
  { key: "walk", title: "🧡 보행자의 날 (11월 11일)", meaning: "탄소 없는 이동수단인 걷기와 안전을 강조하는 날", missions: ["15분 이상 걷기", "보행 안전수칙 1개 실천", "걷고 난 뒤 느낌 기록"], characters: [
    { name: "하이파이브 워커 핍", grade: "legendary", desc: "발걸음마다 지구와 하이파이브!" },
    { name: "안전카드 옐로", grade: "rare", desc: "안전한 실천이 진짜 실천." },
    { name: "뚜벅이 토토", grade: "normal", desc: "걷기가 가장 깨끗한 이동 마법." }
  ] }
];

const state = { tickets: 0, totalDraws: 0, legendaryCount: 0, owned: {} };

const daySelect = document.getElementById("daySelect");
const dayInfo = document.getElementById("dayInfo");
const missionForm = document.getElementById("missionForm");
const claimTicketsBtn = document.getElementById("claimTickets");
const resetMissionsBtn = document.getElementById("resetMissions");
const ticketNotice = document.getElementById("ticketNotice");
const ticketCountEl = document.getElementById("ticketCount");
const drawBtn = document.getElementById("drawBtn");
const drawResult = document.getElementById("drawResult");
const totalDrawsEl = document.getElementById("totalDraws");
const legendaryCountEl = document.getElementById("legendaryCount");
const collection = document.getElementById("collection");

function selectedDay() {
  return anniversaryData.find((d) => d.key === daySelect.value);
}

function renderDayOptions() {
  anniversaryData.forEach((d, idx) => {
    const option = document.createElement("option");
    option.value = d.key;
    option.textContent = d.title;
    option.selected = idx === 0;
    daySelect.appendChild(option);
  });
}

function renderDayInfo() {
  const day = selectedDay();
  dayInfo.innerHTML = `<strong>기념일 의미</strong>: ${day.meaning}`;
  missionForm.innerHTML = day.missions
    .map((mission, i) => `<label class="mission"><input type="checkbox" value="${i}"/> ${mission}</label>`)
    .join("");
  ticketNotice.textContent = "";
}

function updateStats() {
  ticketCountEl.textContent = String(state.tickets);
  totalDrawsEl.textContent = String(state.totalDraws);
  legendaryCountEl.textContent = String(state.legendaryCount);
}

function claimTickets() {
  const checkedCount = missionForm.querySelectorAll("input[type='checkbox']:checked").length;
  if (checkedCount === 0) {
    ticketNotice.textContent = "미션을 1개 이상 선택해 주세요.";
    return;
  }
  const earned = Math.min(checkedCount, 3);
  state.tickets += earned;
  updateStats();
  ticketNotice.textContent = `실천 완료! 뽑기권 ${earned}장 획득.`;
}

function resetMissions() {
  missionForm.querySelectorAll("input[type='checkbox']").forEach((box) => {
    box.checked = false;
  });
  ticketNotice.textContent = "미션 체크를 초기화했어요.";
}

function rollCharacter(day) {
  const random = Math.random() * 100;
  if (random < 10) return day.characters.find((c) => c.grade === "legendary");
  if (random < 40) return day.characters.find((c) => c.grade === "rare");
  return day.characters.find((c) => c.grade === "normal");
}

function renderCollection() {
  const entries = Object.entries(state.owned);
  if (!entries.length) {
    collection.innerHTML = "<p>아직 획득한 캐릭터가 없습니다.</p>";
    return;
  }
  collection.innerHTML = entries
    .map(([name, data]) => `<div class="card"><strong class="${data.grade}">${name}</strong><span class="badge ${data.grade}">${data.grade}</span><br/>${data.desc}<br/>보유: ${data.count}장</div>`)
    .join("");
}

function drawCharacter() {
  if (state.tickets < 1) {
    drawResult.textContent = "뽑기권이 부족해요. 미션 실천 후 다시 시도해 주세요.";
    return;
  }

  state.tickets -= 1;
  state.totalDraws += 1;

  const character = rollCharacter(selectedDay());
  if (character.grade === "legendary") state.legendaryCount += 1;

  if (!state.owned[character.name]) {
    state.owned[character.name] = { ...character, count: 0 };
  }
  state.owned[character.name].count += 1;

  drawResult.innerHTML = `🎉 <strong class="${character.grade}">${character.name}</strong> 획득!<br/>${character.desc}`;
  updateStats();
  renderCollection();
}

renderDayOptions();
renderDayInfo();
updateStats();
renderCollection();

daySelect.addEventListener("change", renderDayInfo);
claimTicketsBtn.addEventListener("click", claimTickets);
resetMissionsBtn.addEventListener("click", resetMissions);
drawBtn.addEventListener("click", drawCharacter);
