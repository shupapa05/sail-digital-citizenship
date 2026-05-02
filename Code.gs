/**
 * 지구 구조대 - 실천 마법 캐릭터 수집 게임
 * Google Apps Script 서버 코드 (MVP)
 *
 * 요구사항 요약:
 * - 캐릭터 기본 종류는 BANDI / LOUI 2종만 사용
 * - 기념일(DAY_ID)별 변신 버전 캐릭터 제공
 * - 뽑기 확률: BANDI 70%, LOUI 30%
 */

/*********************************
 * 상수 영역 (수정 용이하도록 분리)
 *********************************/
const CONFIG = {
  SHEETS: {
    STUDENTS: '학생명부',
    DAYS: '기념일관리',
    MISSIONS: '미션관리',
    PRACTICE_LOG: '실천로그',
    CHARACTERS: '캐릭터관리',
    OWNED: '보유캐릭터'
  },
  BASE_CHARS: {
    BANDI: 'BANDI',
    LOUI: 'LOUI'
  },
  DRAW_PROBABILITY: {
    BANDI: 0.7,
    LOUI: 0.3
  },
  HEADERS: {
    CHARACTERS: ['CHAR_ID','DAY_ID','BASE_CHAR','VERSION_NAME','COLOR','FEATURE','PROBABILITY','IMAGE_URL','DESCRIPTION','ACTIVE'],
    STUDENTS: ['학생ID','학년','반','번호','이름','개인코드'],
    DAYS: ['DAY_ID','날짜','기념일명','설명','활성화'],
    MISSIONS: ['MISSION_ID','DAY_ID','미션명','설명','보상티켓'],
    PRACTICE_LOG: ['날짜','학생ID','DAY_ID','MISSION_ID','소감','티켓','생성일'],
    OWNED: ['학생ID','CHAR_ID','획득일','횟수']
  }
};

const DEFAULT_CHARACTERS = [
  ['EARTH_HOUR_BANDI','EARTH_HOUR','BANDI','노란 별빛 반디','노란색','별빛, 지구의 휴식',0.7,'','어스아워의 별빛 반디 변신 버전',true],
  ['EARTH_HOUR_LOUI','EARTH_HOUR','LOUI','별빛 탐험가 루이','노란 배지','불 끄기 실천',0.3,'','어스아워의 루이 변신 버전',true],
  ['EARTH_DAY_BANDI','EARTH_DAY','BANDI','초록 새싹 반디','초록색','새싹, 생명',0.7,'','지구의 날 반디 변신 버전',true],
  ['EARTH_DAY_LOUI','EARTH_DAY','LOUI','초록 발자국 루이','초록색','걷기, 물 절약',0.3,'','지구의 날 루이 변신 버전',true],
  ['ENV_DAY_BANDI','ENV_DAY','BANDI','무지개 자원순환 반디','무지개색','분리배출, 새활용',0.7,'','환경의 날 반디 변신 버전',true],
  ['ENV_DAY_LOUI','ENV_DAY','LOUI','새활용 구조대 루이','무지개색','새활용 실천',0.3,'','환경의 날 루이 변신 버전',true],
  ['REFILL_DAY_BANDI','REFILL_DAY','BANDI','은빛 리필 반디','은색','다회용기',0.7,'','리필의 날 반디 변신 버전',true],
  ['REFILL_DAY_LOUI','REFILL_DAY','LOUI','텀블러 대장 루이','은색','텀블러 사용',0.3,'','리필의 날 루이 변신 버전',true],
  ['DESERT_DAY_BANDI','DESERT_DAY','BANDI','갈색 흙나무 반디','갈색','흙, 나무',0.7,'','사막화 방지의 날 반디 변신 버전',true],
  ['DESERT_DAY_LOUI','DESERT_DAY','LOUI','나무친구 루이','갈색','나무 심기',0.3,'','사막화 방지의 날 루이 변신 버전',true],
  ['ENERGY_DAY_BANDI','ENERGY_DAY','BANDI','하늘빛 에너지 반디','하늘색','절전',0.7,'','에너지의 날 반디 변신 버전',true],
  ['ENERGY_DAY_LOUI','ENERGY_DAY','LOUI','절전 영웅 루이','하늘색','절전 실천',0.3,'','에너지의 날 루이 변신 버전',true],
  ['WALK_DAY_BANDI','WALK_DAY','BANDI','주황 안전 반디','주황색','걷기, 안전',0.7,'','보행자의 날 반디 변신 버전',true],
  ['WALK_DAY_LOUI','WALK_DAY','LOUI','뚜벅뚜벅 루이','주황색','보행 실천',0.3,'','보행자의 날 루이 변신 버전',true]
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('지구 구조대 - 실천 마법')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** HTML include helper */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 초기 시트 생성/점검 + 기본 캐릭터 데이터 입력
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(CONFIG.SHEETS).forEach((key) => {
    const name = CONFIG.SHEETS[key];
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);

    const headers = CONFIG.HEADERS[key];
    if (headers && sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });

  const charSh = ss.getSheetByName(CONFIG.SHEETS.CHARACTERS);
  if (charSh.getLastRow() <= 1) {
    charSh.getRange(2, 1, DEFAULT_CHARACTERS.length, DEFAULT_CHARACTERS[0].length).setValues(DEFAULT_CHARACTERS);
  }

  return { success: true, message: '시트 초기화 완료' };
}

/**
 * 개인코드 로그인
 */
function loginByCode(personalCode) {
  const student = findStudentByCode_(personalCode);
  if (!student) return { success: false, message: '개인코드를 확인해 주세요.' };

  return { success: true, student: student };
}

/** 오늘의 활성 기념일 조회 */
function getTodayDayInfo() {
  const day = getTodayActiveDay_();
  if (!day) {
    return { success: false, message: '오늘 활성화된 기념일이 없습니다.' };
  }
  return { success: true, day: day };
}

/** DAY_ID 기준 미션 목록 조회 */
function getMissionsByDay(dayId) {
  const sh = getSheet_(CONFIG.SHEETS.MISSIONS);
  const rows = getDataRows_(sh);
  const missions = rows
    .filter(r => r.DAY_ID === dayId)
    .map(r => ({
      missionId: r.MISSION_ID,
      name: r.미션명,
      description: r.설명,
      rewardTicket: Number(r.보상티켓 || 0)
    }));

  return { success: true, missions: missions };
}

/** 실천 인증 등록 + 티켓 획득 */
function submitPracticeLog(payload) {
  const { studentId, dayId, missionId, comment } = payload;

  const mission = getMissionById_(missionId);
  if (!mission) return { success: false, message: '미션 정보를 찾을 수 없습니다.' };

  const reward = Number(mission.보상티켓 || 1);
  const sh = getSheet_(CONFIG.SHEETS.PRACTICE_LOG);
  sh.appendRow([
    new Date(),
    studentId,
    dayId,
    missionId,
    comment || '',
    reward,
    new Date()
  ]);

  return { success: true, ticketGained: reward };
}

/** 학생의 총 티켓 계산 */
function getStudentTicketCount(studentId) {
  const sh = getSheet_(CONFIG.SHEETS.PRACTICE_LOG);
  const rows = getDataRows_(sh);
  const total = rows
    .filter(r => r.학생ID === studentId)
    .reduce((sum, r) => sum + Number(r.티켓 || 0), 0);

  const used = getUsedTicketCount_(studentId);
  return { success: true, total: total, used: used, available: Math.max(total - used, 0) };
}

/**
 * 캐릭터 뽑기
 * - 티켓 1장 소모
 * - DAY_ID에 해당하는 BANDI/LOUI만 대상
 * - BANDI 70%, LOUI 30%
 */
function drawCharacter(studentId, dayId) {
  const ticketInfo = getStudentTicketCount(studentId);
  if (!ticketInfo.success || ticketInfo.available < 1) {
    return { success: false, message: '사용 가능한 티켓이 부족합니다.' };
  }

  const candidates = getCharactersByDay_(dayId);
  const bandi = candidates.find(c => c.BASE_CHAR === CONFIG.BASE_CHARS.BANDI);
  const loui = candidates.find(c => c.BASE_CHAR === CONFIG.BASE_CHARS.LOUI);
  if (!bandi || !loui) {
    return { success: false, message: '해당 기념일 캐릭터 데이터가 올바르지 않습니다.' };
  }

  const rand = Math.random();
  const selected = rand < CONFIG.DRAW_PROBABILITY.BANDI ? bandi : loui;

  upsertOwnedCharacter_(studentId, selected.CHAR_ID);
  logTicketUsage_(studentId, dayId, selected.CHAR_ID);

  return {
    success: true,
    character: selected,
    probabilityApplied: {
      bandi: CONFIG.DRAW_PROBABILITY.BANDI,
      loui: CONFIG.DRAW_PROBABILITY.LOUI
    }
  };
}

/** 학생 도감 조회 (반디/루이 분리) */
function getStudentCollection(studentId) {
  const ownedMap = getOwnedMap_(studentId);
  const allChars = getAllActiveCharacters_();

  const bandi = allChars.filter(c => c.BASE_CHAR === CONFIG.BASE_CHARS.BANDI)
    .map(c => ({ ...c, owned: !!ownedMap[c.CHAR_ID], count: ownedMap[c.CHAR_ID] || 0 }));
  const loui = allChars.filter(c => c.BASE_CHAR === CONFIG.BASE_CHARS.LOUI)
    .map(c => ({ ...c, owned: !!ownedMap[c.CHAR_ID], count: ownedMap[c.CHAR_ID] || 0 }));

  return { success: true, bandi: bandi, loui: loui };
}

/*********************************
 * 내부 유틸 함수
 *********************************/
function getSheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function getDataRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => headers.reduce((obj, key, i) => {
    obj[key] = row[i];
    return obj;
  }, {}));
}

function findStudentByCode_(code) {
  const rows = getDataRows_(getSheet_(CONFIG.SHEETS.STUDENTS));
  const hit = rows.find(r => String(r.개인코드).trim() === String(code).trim());
  if (!hit) return null;
  return {
    studentId: hit.학생ID,
    grade: hit.학년,
    classNo: hit.반,
    number: hit.번호,
    name: hit.이름
  };
}

function getTodayActiveDay_() {
  const rows = getDataRows_(getSheet_(CONFIG.SHEETS.DAYS));
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const hit = rows.find(r => {
    const d = Utilities.formatDate(new Date(r.날짜), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return d === today && String(r.활성화).toLowerCase() === 'true';
  });
  return hit || null;
}

function getMissionById_(missionId) {
  return getDataRows_(getSheet_(CONFIG.SHEETS.MISSIONS)).find(r => r.MISSION_ID === missionId) || null;
}

function getCharactersByDay_(dayId) {
  return getAllActiveCharacters_().filter(r => r.DAY_ID === dayId);
}

function getAllActiveCharacters_() {
  return getDataRows_(getSheet_(CONFIG.SHEETS.CHARACTERS)).filter(r => String(r.ACTIVE).toLowerCase() === 'true');
}

function getOwnedMap_(studentId) {
  const rows = getDataRows_(getSheet_(CONFIG.SHEETS.OWNED)).filter(r => r.학생ID === studentId);
  return rows.reduce((acc, r) => {
    acc[r.CHAR_ID] = Number(r.횟수 || 1);
    return acc;
  }, {});
}

function upsertOwnedCharacter_(studentId, charId) {
  const sh = getSheet_(CONFIG.SHEETS.OWNED);
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) {
    sh.appendRow([studentId, charId, new Date(), 1]);
    return;
  }

  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === studentId && values[i][1] === charId) {
      const count = Number(values[i][3] || 0) + 1;
      sh.getRange(i + 1, 4).setValue(count);
      sh.getRange(i + 1, 3).setValue(new Date());
      return;
    }
  }
  sh.appendRow([studentId, charId, new Date(), 1]);
}

function logTicketUsage_(studentId, dayId, charId) {
  const sh = getSheet_(CONFIG.SHEETS.PRACTICE_LOG);
  sh.appendRow([new Date(), studentId, dayId, 'DRAW', `[뽑기] ${charId}`, -1, new Date()]);
}

function getUsedTicketCount_(studentId) {
  const rows = getDataRows_(getSheet_(CONFIG.SHEETS.PRACTICE_LOG)).filter(r => r.학생ID === studentId);
  return rows.filter(r => Number(r.티켓 || 0) < 0).reduce((sum, r) => sum + Math.abs(Number(r.티켓 || 0)), 0);
}
