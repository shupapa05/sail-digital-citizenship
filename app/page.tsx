"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryKey = "work" | "class" | "personal";
type ViewKey = "calendar" | "class" | "work" | "assessment" | "settings";
type PointType = "observation" | "praise" | "penalty" | "mission" | "submissionAward";
type ClassSectionKey = "pointRecords" | "submissions" | "lifeRecords" | "missions";
type SettingsSectionKey = "calendar" | "class" | "assessment" | "work";

type CalendarItem = {
  id: string;
  date: string;
  title: string;
  memo: string;
  start: string;
  end: string;
  calendarId: string;
  category: CategoryKey;
};

type CalendarConfig = {
  work: string;
  class: string;
  personal: string;
  personalFamily: string;
};

type CalendarCreateForm = {
  title: string;
  date: string;
  memo: string;
  target: "work" | "class" | "personal" | "personalFamily";
};

type StudentTotal = {
  id: string;
  number: number;
  name: string;
  total: number;
};

type PointRecord = {
  id: string;
  studentId: string;
  studentName: string;
  type: PointType;
  points: number;
  reason: string;
  actor: string;
  createdAt: string;
};

type SubmissionTask = {
  id: string;
  title: string;
  createdAt: string;
  archivedAt?: string;
};

type SubmissionCheck = {
  taskId: string;
  studentId: string;
  checked: boolean;
  actor: string;
  updatedAt: string;
};

type Mission = {
  id: string;
  title: string;
  points: number;
  createdAt: string;
};

type AssessmentItem = {
  id: string;
  subject: string;
  standard: string;
  unit: string;
  domain: string;
  element: string;
  method: string;
  period: string;
  excellent: string;
  good: string;
  basic: string;
  needsHelp: string;
  neisName: string;
  createdAt?: string;
};

type AssessmentResult = {
  itemId: string;
  studentId: string;
  level: string;
  memo: string;
  updatedAt: string;
};

const calendarStorageKey = "schooltask-2-calendar-config";
const classMissionTargetStorageKey = "schooltask-2-class-mission-target";

const categoryMeta: Record<CategoryKey, { label: string; color: string; light: string; hint: string }> = {
  work: { label: "업무", color: "#2563eb", light: "#eff6ff", hint: "학교업무 캘린더 ID" },
  class: { label: "학급", color: "#16a34a", light: "#f0fdf4", hint: "학급 캘린더 ID" },
  personal: { label: "개인", color: "#ea580c", light: "#fff7ed", hint: "개인 캘린더 ID" }
};

const pointMeta: Record<PointType, { label: string; color: string }> = {
  observation: { label: "관찰기록", color: "#2563eb" },
  praise: { label: "칭찬", color: "#16a34a" },
  penalty: { label: "감점", color: "#dc2626" },
  mission: { label: "학급미션", color: "#ea580c" },
  submissionAward: { label: "제출상점", color: "#7c3aed" }
};

const fallbackPointMeta = { label: "기록", color: "#64748b" };

const classSectionLabels: Record<ClassSectionKey, string> = {
  pointRecords: "점수기록",
  submissions: "제출표",
  lifeRecords: "생활기록",
  missions: "학급미션"
};

const assessmentLevels = ["매우 잘함", "잘함", "보통", "노력 요함"];

const settingsSectionLabels: Record<SettingsSectionKey, string> = {
  calendar: "달력",
  class: "학급경영",
  assessment: "수행평가",
  work: "학교업무"
};

const navItems: Array<{ key: ViewKey; label: string }> = [
  { key: "calendar", label: "통합 달력" },
  { key: "class", label: "학급경영" },
  { key: "work", label: "학교업무" },
  { key: "assessment", label: "수행평가" },
  { key: "settings", label: "설정" }
];

const defaultCalendarConfig: CalendarConfig = {
  work: "",
  class: "",
  personal: "primary",
  personalFamily: ""
};

const seedItems: CalendarItem[] = [
  {
    id: "sample-work-1",
    date: "2026-06-10",
    title: "학년 협의 자료 정리",
    memo: "업무 캘린더가 연결되면 실제 일정으로 바뀝니다.",
    start: "2026-06-10",
    end: "2026-06-11",
    calendarId: "sample",
    category: "work"
  },
  {
    id: "sample-class-1",
    date: "2026-06-10",
    title: "학급 미션 점수 확인",
    memo: "학급 캘린더가 연결되면 실제 일정으로 바뀝니다.",
    start: "2026-06-10",
    end: "2026-06-11",
    calendarId: "sample",
    category: "class"
  },
  {
    id: "sample-personal-1",
    date: "2026-06-10",
    title: "개인 일정 확인",
    memo: "개인 캘린더가 연결되면 실제 일정으로 바뀝니다.",
    start: "2026-06-10",
    end: "2026-06-11",
    calendarId: "sample",
    category: "personal"
  }
];

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function normalizeCalendarId(value: string) {
  return value.trim().toLowerCase();
}

function calendarConfigEntries(config: CalendarConfig): Array<{ key: keyof CalendarConfig; category: CategoryKey; id: string }> {
  return [
    { key: "work", category: "work", id: config.work },
    { key: "class", category: "class", id: config.class },
    { key: "personal", category: "personal", id: config.personal },
    { key: "personalFamily", category: "personal", id: config.personalFamily }
  ];
}

function categoryFromCalendarId(calendarId: string, config: CalendarConfig): CategoryKey {
  const source = normalizeCalendarId(calendarId);
  const matched = calendarConfigEntries(config).find((entry) => normalizeCalendarId(entry.id) === source);
  return matched?.category || "work";
}

function uniqueConfiguredIds(config: CalendarConfig) {
  return Array.from(new Set(calendarConfigEntries(config).map((item) => item.id.trim()).filter(Boolean)));
}

function buildMonthCells(base: Date) {
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(base.getFullYear(), base.getMonth(), 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      ymd: toYmd(date),
      isCurrentMonth: date.getMonth() === base.getMonth(),
      isToday: toYmd(date) === toYmd(new Date())
    };
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatRecordDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function calendarTimeLabel(value: string) {
  if (!value || !value.includes("T")) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function isSameCalendarWeek(a: Date, b: Date) {
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate() - a.getDay());
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate() - b.getDay());
  return toYmd(startA) === toYmd(startB);
}

function parseRosterText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\t|,/).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2)
    .filter((cells, index) => !(index === 0 && /번호|number/i.test(cells[0]) && /이름|name/i.test(cells[1])))
    .map((cells) => ({
      number: Number(cells[0]),
      name: cells[1]
    }))
    .filter((student) => Number.isFinite(student.number) && student.name);
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseTableText(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (line.includes("\t") ? line.split("\t").map((cell) => cell.trim()) : splitCsvLine(line)));
}

function findHeaderIndex(cells: string[], keywords: string[]) {
  return cells.findIndex((cell) => keywords.some((keyword) => cell.replace(/\s/g, "").includes(keyword)));
}

function readCell(cells: string[], index: number) {
  return index >= 0 ? (cells[index] || "").trim() : "";
}

function safeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").trim();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function subjectFromText(text: string) {
  const match = text.match(/(?:\d학년\s*\d학기\s*)?(국어|사회|도덕|수학|과학|체육|음악|미술|영어|실과)/);
  return match?.[1] || "";
}

function subjectFromStandard(text: string) {
  const codeSubject = text.match(/\[\d\s*([가-힣])\s*\d{2}-\d{2}\]/)?.[1];
  const map: Record<string, string> = {
    국: "국어",
    사: "사회",
    도: "도덕",
    수: "수학",
    과: "과학",
    체: "체육",
    음: "음악",
    미: "미술",
    영: "영어",
    실: "실과"
  };
  return codeSubject ? map[codeSubject] || "" : "";
}

function cleanAssessmentText(value: string) {
  return value.replace(/[▪■●•]/g, "").replace(/\s+/g, " ").trim();
}

function hasStandardCode(value: string) {
  return /\[\d\s*[가-힣]\s*\d{2}-\d{2}\]/.test(value);
}

function isLevelLabel(value: string) {
  const compact = value.replace(/\s/g, "");
  if (compact === "매우잘함") return "excellent";
  if (compact === "잘함") return "good";
  if (compact === "보통") return "basic";
  if (compact === "노력요함") return "needsHelp";
  return "";
}

function collectMethodTags(cells: string[]) {
  return cells
    .flatMap((cell) => cell.match(/\[[^\]]*(?:서술형|논술형|구술|관찰|실기|포트폴리오|정의적능력평가)[^\]]*\]/g) || [])
    .map((tag) => tag.replace(/^\[|\]$/g, "").trim())
    .filter(Boolean);
}

function splitLevelText(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return {
    excellent: normalized.match(/매우\s*잘함\s*(.*?)(?=잘함|보통|노력\s*요함|$)/)?.[1]?.trim() || "",
    good: normalized.match(/잘함\s*(.*?)(?=보통|노력\s*요함|$)/)?.[1]?.trim() || "",
    basic: normalized.match(/보통\s*(.*?)(?=노력\s*요함|$)/)?.[1]?.trim() || "",
    needsHelp: normalized.match(/노력\s*요함\s*(.*)$/)?.[1]?.trim() || ""
  };
}

function levelDescriptionFromCells(cells: string[], labelIndex: number) {
  for (let index = labelIndex + 1; index < cells.length; index += 1) {
    const candidate = cleanAssessmentText(cells[index]);
    if (!candidate || isLevelLabel(candidate) || /^\d+월$/.test(candidate) || collectMethodTags([candidate]).length > 0) continue;
    return candidate;
  }
  return "";
}

function parseAssessmentImport(text: string): AssessmentItem[] {
  const rows = parseTableText(text);
  if (rows.length === 0) return [];

  const headerRowIndex = rows.findIndex((cells) => cells.some((cell) => /성취\s*기준/.test(cell)));
  const header = headerRowIndex >= 0 ? rows[headerRowIndex] : [];
  const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const standardIndex = findHeaderIndex(header, ["성취기준"]);
  const unitIndex = findHeaderIndex(header, ["단원명"]);
  const domainIndex = findHeaderIndex(header, ["평가영역"]);
  const elementIndex = findHeaderIndex(header, ["평가요소"]);
  const methodIndex = findHeaderIndex(header, ["수업·평가방법", "수업평가방법", "평가방법"]);
  const levelIndex = findHeaderIndex(header, ["성취수준"]);
  const periodIndex = findHeaderIndex(header, ["평가시기"]);

  let currentSubject = "";
  const items: AssessmentItem[] = [];
  let currentItem: AssessmentItem | null = null;
  let currentMethodTags = new Set<string>();

  function finishCurrentItem() {
    if (!currentItem) return;
    currentItem.method = Array.from(currentMethodTags).join(", ") || currentItem.method;
    currentItem.neisName = [currentItem.subject, currentItem.unit, currentItem.element].filter(Boolean).join("_");
    items.push(currentItem);
    currentItem = null;
    currentMethodTags = new Set<string>();
  }

  rows.slice(startRow).forEach((cells, index) => {
    const joined = cells.join(" ").replace(/\s+/g, " ").trim();
    const nextSubject = subjectFromText(joined);
    if (nextSubject && !hasStandardCode(joined)) {
      currentSubject = nextSubject;
      return;
    }

    const rowHasStandard = hasStandardCode(joined);
    if (rowHasStandard) {
      finishCurrentItem();
      const standardCell = readCell(cells, standardIndex) || cells.find((cell) => hasStandardCode(cell)) || "";
      const standard = cleanAssessmentText(standardCell || joined.match(/\[[^\]]+\][^\t,]*/)?.[0] || "");
      const subject = subjectFromStandard(standard) || currentSubject || subjectFromText(joined);
      const unit = cleanAssessmentText(readCell(cells, unitIndex));
      const element = cleanAssessmentText(readCell(cells, elementIndex));

      currentItem = {
        id: `draft-${Date.now()}-${index}`,
        subject,
        standard,
        unit,
        domain: cleanAssessmentText(readCell(cells, domainIndex)),
        element,
        method: "",
        period: readCell(cells, periodIndex) || joined.match(/\d+월/)?.[0] || "",
        excellent: "",
        good: "",
        basic: "",
        needsHelp: "",
        neisName: "",
        createdAt: ""
      };
    }

    if (!currentItem) return;

    if (!currentItem.unit) currentItem.unit = cleanAssessmentText(readCell(cells, unitIndex));
    if (!currentItem.domain) currentItem.domain = cleanAssessmentText(readCell(cells, domainIndex));
    if (!currentItem.element) currentItem.element = cleanAssessmentText(readCell(cells, elementIndex));
    if (!currentItem.period) currentItem.period = readCell(cells, periodIndex) || joined.match(/\d+월/)?.[0] || "";
    collectMethodTags(cells).forEach((tag) => currentMethodTags.add(tag));

    const levelSource = readCell(cells, levelIndex) || joined;
    const splitLevels = splitLevelText(levelSource);
    currentItem.excellent ||= splitLevels.excellent;
    currentItem.good ||= splitLevels.good;
    currentItem.basic ||= splitLevels.basic;
    currentItem.needsHelp ||= splitLevels.needsHelp;

    const item = currentItem;
    cells.forEach((cell, cellIndex) => {
      const levelKey = isLevelLabel(cell);
      if (!levelKey) return;
      const description = levelDescriptionFromCells(cells, cellIndex);
      if (description) {
        item[levelKey as "excellent" | "good" | "basic" | "needsHelp"] ||= description;
      }
    });
  });

  finishCurrentItem();
  return items;
}

export default function Page() {
  const [activeView, setActiveView] = useState<ViewKey>("class");
  const [month, setMonth] = useState(() => new Date());
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>(defaultCalendarConfig);
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>(seedItems);
  const [selectedCalendar, setSelectedCalendar] = useState<{ date: string; category: CategoryKey } | null>(null);
  const [calendarStatus, setCalendarStatus] = useState("대기");
  const [calendarReloadKey, setCalendarReloadKey] = useState(0);
  const [calendarQuickDate, setCalendarQuickDate] = useState("");
  const [visibleCalendarCategories, setVisibleCalendarCategories] = useState<CategoryKey[]>(["work", "class", "personal"]);
  const [calendarCreateForm, setCalendarCreateForm] = useState<CalendarCreateForm>({
    title: "",
    date: toYmd(new Date()),
    memo: "",
    target: "personal"
  });
  const [students, setStudents] = useState<StudentTotal[]>([]);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionTask[]>([]);
  const [submissionChecks, setSubmissionChecks] = useState<SubmissionCheck[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [classTotal, setClassTotal] = useState(0);
  const [pointForm, setPointForm] = useState({
    studentId: "",
    type: "praise" as PointType,
    points: "5",
    reason: ""
  });
  const [missionForm, setMissionForm] = useState({
    title: "",
    points: "999"
  });
  const [classTotalTarget, setClassTotalTarget] = useState("0");
  const [editingRecordId, setEditingRecordId] = useState("");
  const [editingRecordForm, setEditingRecordForm] = useState({
    type: "praise" as PointType,
    points: "0",
    reason: ""
  });
  const [editingMissionId, setEditingMissionId] = useState("");
  const [editingMissionForm, setEditingMissionForm] = useState({
    title: "",
    points: "0"
  });
  const [submissionTitle, setSubmissionTitle] = useState("");
  const [editingSubmissionId, setEditingSubmissionId] = useState("");
  const [editingSubmissionTitle, setEditingSubmissionTitle] = useState("");
  const [submissionAwardPoints, setSubmissionAwardPoints] = useState<Record<string, string>>({});
  const [showPastSubmissions, setShowPastSubmissions] = useState(false);
  const [selectedRecordStudentId, setSelectedRecordStudentId] = useState("");
  const [selectedRecordStudentIds, setSelectedRecordStudentIds] = useState<string[]>([]);
  const [lifeRecordSearch, setLifeRecordSearch] = useState("");
  const [lifeRecordForm, setLifeRecordForm] = useState({ studentId: "", reason: "" });
  const [activeClassSection, setActiveClassSection] = useState<ClassSectionKey>("pointRecords");
  const [classroomMessage, setClassroomMessage] = useState("");
  const [rosterText, setRosterText] = useState("번호,이름\n1,민지\n2,서연\n3,지후");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [assessmentImportText, setAssessmentImportText] = useState("");
  const [assessmentDrafts, setAssessmentDrafts] = useState<AssessmentItem[]>([]);
  const [assessmentMessage, setAssessmentMessage] = useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [commonAssessmentLevel, setCommonAssessmentLevel] = useState("잘함");
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionKey>("calendar");

  useEffect(() => {
    const saved = window.localStorage.getItem(calendarStorageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<CalendarConfig>;
      setCalendarConfig({
        work: parsed.work || "",
        class: parsed.class || "",
        personal: parsed.personal || "primary",
        personalFamily: parsed.personalFamily || ""
      });
    } catch {
      window.localStorage.removeItem(calendarStorageKey);
    }
  }, []);

  useEffect(() => {
    loadClassroom();
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(classMissionTargetStorageKey);
    if (saved) setClassTotalTarget(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(classMissionTargetStorageKey, classTotalTarget);
  }, [classTotalTarget]);

  useEffect(() => {
    let cancelled = false;

    async function loadCalendar() {
      const ids = uniqueConfiguredIds(calendarConfig);
      if (ids.length === 0) {
        setCalendarItems(seedItems);
        setCalendarStatus("캘린더 ID 필요");
        return;
      }

      try {
        setCalendarStatus("연결 중");
        const params = new URLSearchParams({
          calendarIds: ids.join(","),
          daysPast: "30",
          daysFuture: "60"
        });
        const res = await fetch(`/api/calendar/events?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.events)) throw new Error(data.error || "calendar failed");
        if (cancelled) return;

        const remoteItems: CalendarItem[] = data.events.map((event: any) => ({
          id: `cal-${event.calendarId}-${event.id}`,
          date: event.date,
          title: event.title || "(제목 없음)",
          memo: event.memo || "",
          start: event.start || event.date,
          end: event.end || event.date,
          calendarId: event.calendarId || "",
          category: categoryFromCalendarId(event.calendarId || "", calendarConfig)
        }));
        setCalendarItems(remoteItems.length > 0 ? remoteItems : seedItems);
        setCalendarStatus(`${remoteItems.length}개 불러옴`);
      } catch (error) {
        if (!cancelled) {
          setCalendarItems(seedItems);
          setCalendarStatus(error instanceof Error ? `연결 실패: ${error.message}` : "연결 실패");
        }
      }
    }

    loadCalendar();
    return () => {
      cancelled = true;
    };
  }, [calendarConfig, calendarReloadKey]);

  async function loadClassroom() {
    const res = await fetch("/api/classroom", { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) return;
    setStudents(data.totals || []);
    setRecords(data.records || []);
    setSubmissions(data.submissions || []);
    setSubmissionChecks(data.submissionChecks || []);
    setMissions(data.missions || []);
    setAssessmentItems(data.assessmentItems || []);
    setAssessmentResults(data.assessmentResults || []);
    setClassTotal(Number(data.classTotal || 0));
    setPointForm((current) => ({
      ...current,
      studentId: current.studentId || data.totals?.[0]?.id || ""
    }));
    setLifeRecordForm((current) => ({
      ...current,
      studentId: current.studentId || data.totals?.[0]?.id || ""
    }));
    setSelectedRecordStudentId((current) => current || data.totals?.[0]?.id || "");
    setSelectedRecordStudentIds((current) => (current.length > 0 ? current : data.totals?.[0]?.id ? [data.totals[0].id] : []));
    setSelectedAssessmentId((current) => current || data.assessmentItems?.[0]?.id || "");
  }

  async function addPoint() {
    const targetStudentIds = selectedRecordStudentIds.length > 0 ? selectedRecordStudentIds : selectedRecordStudentId ? [selectedRecordStudentId] : [];
    if (targetStudentIds.length === 0) {
      setClassroomMessage("적용할 학생을 한 명 이상 선택해 주세요.");
      return;
    }
    const rawPoints = Number(pointForm.points || 0);
    if (pointForm.type !== "observation" && (!Number.isFinite(rawPoints) || rawPoints <= 0)) {
      setClassroomMessage("칭찬이나 감점 점수는 1점 이상으로 입력해 주세요.");
      return;
    }
    const finalPoints = pointForm.type === "observation" ? 0 : pointForm.type === "penalty" ? -Math.abs(rawPoints) : Math.abs(rawPoints);

    const results = await Promise.all(
      targetStudentIds.map((studentId) =>
        fetch("/api/classroom", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "add-record",
            studentId,
            type: pointForm.type,
            points: finalPoints,
            reason: pointForm.reason,
            actor: "교사"
          })
        })
      )
    );

    if (results.some((res) => !res.ok)) {
      setClassroomMessage("일부 학생의 점수를 기록하지 못했습니다.");
      return;
    }
    setPointForm((current) => ({ ...current, reason: "" }));
    setClassroomMessage(`${targetStudentIds.length}명에게 ${pointMeta[pointForm.type].label}을 적용했습니다.`);
    await loadClassroom();
  }

  async function addLifeRecord() {
    if (!lifeRecordForm.studentId) {
      setClassroomMessage("생활기록을 남길 학생을 선택해 주세요.");
      return;
    }
    if (!lifeRecordForm.reason.trim()) {
      setClassroomMessage("생활기록 내용을 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "add-record",
        studentId: lifeRecordForm.studentId,
        type: "observation",
        points: 0,
        reason: lifeRecordForm.reason,
        actor: "교사"
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "생활기록을 저장하지 못했습니다.");
      return;
    }
    setLifeRecordForm((current) => ({ ...current, reason: "" }));
    setClassroomMessage("생활기록을 저장했습니다.");
    await loadClassroom();
  }

  function startEditRecord(record: PointRecord) {
    setActiveClassSection("pointRecords");
    setEditingRecordId(record.id);
    setEditingRecordForm({
      type: record.type,
      points: String(record.points),
      reason: record.reason
    });
  }

  function cancelEditRecord() {
    setEditingRecordId("");
    setEditingRecordForm({ type: "praise", points: "0", reason: "" });
  }

  async function saveRecordEdit(recordId: string) {
    const points = Number(editingRecordForm.points);
    if (!Number.isFinite(points)) {
      setClassroomMessage("수정할 점수를 숫자로 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update-record",
        recordId,
        type: editingRecordForm.type,
        points,
        reason: editingRecordForm.reason
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "점수 기록을 수정하지 못했습니다.");
      return;
    }
    cancelEditRecord();
    setClassroomMessage("점수 기록을 수정했습니다.");
    await loadClassroom();
  }

  async function deleteRecord(record: PointRecord) {
    const ok = window.confirm(`${record.studentName}의 기록을 삭제할까요?`);
    if (!ok) return;

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "delete-record",
        recordId: record.id
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "점수 기록을 삭제하지 못했습니다.");
      return;
    }
    if (editingRecordId === record.id) cancelEditRecord();
    setClassroomMessage("점수 기록을 삭제했습니다.");
    await loadClassroom();
  }

  function selectRecordStudent(studentId: string) {
    setSelectedRecordStudentId(studentId);
    setSelectedRecordStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]
    );
    setPointForm((current) => ({ ...current, studentId }));
  }

  function toggleAllRecordStudents() {
    setSelectedRecordStudentIds((current) => (current.length === students.length ? [] : students.map((student) => student.id)));
  }


  async function applyMission() {
    const points = Number(missionForm.points);
    if (!Number.isFinite(points) || points === 0) {
      setClassroomMessage("학급 점수는 0이 아닌 숫자로 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "mission-all",
        title: missionForm.title,
        points
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "학급 점수를 기록하지 못했습니다.");
      return;
    }
    setMissionForm({ title: "", points: "999" });
    setClassroomMessage(`학급 점수 ${points > 0 ? "+" : ""}${points}점을 기록했습니다.`);
    await loadClassroom();
  }

  function startEditMission(mission: Mission) {
    setEditingMissionId(mission.id);
    setEditingMissionForm({
      title: mission.title,
      points: String(mission.points)
    });
  }

  function cancelEditMission() {
    setEditingMissionId("");
    setEditingMissionForm({ title: "", points: "0" });
  }

  async function saveMissionEdit(missionId: string) {
    const points = Number(editingMissionForm.points);
    if (!Number.isFinite(points) || points === 0) {
      setClassroomMessage("학급미션 점수는 0이 아닌 숫자로 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update-mission",
        missionId,
        title: editingMissionForm.title,
        points
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "학급미션을 수정하지 못했습니다.");
      return;
    }
    cancelEditMission();
    setClassroomMessage("학급미션 기록을 수정했습니다.");
    await loadClassroom();
  }

  async function deleteMissionItem(mission: Mission) {
    const ok = window.confirm(`학급미션 "${mission.title}" 기록을 삭제할까요?`);
    if (!ok) return;

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "delete-mission",
        missionId: mission.id
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "학급미션을 삭제하지 못했습니다.");
      return;
    }
    if (editingMissionId === mission.id) cancelEditMission();
    setClassroomMessage("학급미션 기록을 삭제했습니다.");
    await loadClassroom();
  }

  async function addSubmission() {
    const title = submissionTitle.trim();
    if (!title) {
      setClassroomMessage("제출 항목 이름을 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "add-submission",
        title
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "제출 항목을 만들지 못했습니다.");
      return;
    }
    setSubmissionTitle("");
    setClassroomMessage(`제출 항목 "${title}"을 만들었습니다.`);
    await loadClassroom();
  }

  async function archiveSubmission(task: SubmissionTask, archived: boolean) {
    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "archive-submission",
        taskId: task.id,
        archived
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "제출 항목 상태를 바꾸지 못했습니다.");
      return;
    }
    setClassroomMessage(archived ? `"${task.title}"을 완료 처리했습니다.` : `"${task.title}"을 다시 진행 중으로 돌렸습니다.`);
    await loadClassroom();
  }

  function startEditSubmission(task: SubmissionTask) {
    setEditingSubmissionId(task.id);
    setEditingSubmissionTitle(task.title);
  }

  function cancelEditSubmission() {
    setEditingSubmissionId("");
    setEditingSubmissionTitle("");
  }

  async function saveSubmissionEdit(taskId: string) {
    const title = editingSubmissionTitle.trim();
    if (!title) {
      setClassroomMessage("수정할 제출 항목 이름을 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update-submission",
        taskId,
        title
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "제출 항목을 수정하지 못했습니다.");
      return;
    }
    cancelEditSubmission();
    setClassroomMessage(`제출 항목을 "${title}"로 수정했습니다.`);
    await loadClassroom();
  }

  async function deleteSubmission(task: SubmissionTask) {
    const ok = window.confirm(`"${task.title}" 제출 항목을 삭제할까요?\n체크표 기록도 함께 삭제됩니다.`);
    if (!ok) return;

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "delete-submission",
        taskId: task.id
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setClassroomMessage(data.error || "제출 항목을 삭제하지 못했습니다.");
      return;
    }
    setSubmissionAwardPoints((current) => {
      const next = { ...current };
      delete next[task.id];
      return next;
    });
    if (editingSubmissionId === task.id) cancelEditSubmission();
    setClassroomMessage(`제출 항목 "${task.title}"을 삭제했습니다.`);
    await loadClassroom();
  }

  async function toggleSubmission(taskId: string, studentId: string, checked: boolean) {
    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "toggle-submission",
        taskId,
        studentId,
        checked,
        actor: "교사"
      })
    });
    if (!res.ok) return;
    await loadClassroom();
  }

  async function awardSubmission(taskId: string) {
    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "award-submission",
        taskId,
        points: Number(submissionAwardPoints[taskId] || 0)
      })
    });
    if (!res.ok) return;
    setSubmissionAwardPoints((current) => ({ ...current, [taskId]: "" }));
    await loadClassroom();
  }

  function saveCalendarConfig() {
    window.localStorage.setItem(calendarStorageKey, JSON.stringify(calendarConfig));
    setCalendarStatus("연결값 저장됨");
  }

  async function checkCalendarConnection() {
    const ids = uniqueConfiguredIds(calendarConfig);
    if (ids.length === 0) {
      setSettingsMessage("캘린더 ID를 먼저 입력해 주세요.");
      return;
    }

    try {
      setSettingsMessage("캘린더 연결 확인 중입니다.");
      const params = new URLSearchParams({
        calendarIds: ids.join(","),
        daysPast: "7",
        daysFuture: "14",
        forceRefresh: "1"
      });
      const res = await fetch(`/api/calendar/events?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.events)) throw new Error(data.error || data.errors?.[0]?.error || "calendar failed");
      setSettingsMessage(`${data.source === "apps-script" ? "Apps Script" : "Google API"} 연결 확인: 일정 ${data.events.length}개를 불러왔습니다.`);
    } catch (error) {
      setSettingsMessage(error instanceof Error ? `캘린더 연결 실패: ${error.message}` : "캘린더 연결 실패");
    }
  }

  async function createCalendarItem() {
    const calendarId = calendarConfig[calendarCreateForm.target].trim();
    const title = calendarCreateForm.title.trim();
    const date = calendarCreateForm.date.trim();
    const memo = calendarCreateForm.memo.trim();

    if (!calendarId) {
      setCalendarStatus("일정을 추가할 캘린더 ID를 설정에서 입력해 주세요.");
      return;
    }
    if (!title) {
      setCalendarStatus("일정 제목을 입력해 주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setCalendarStatus("일정 날짜를 선택해 주세요.");
      return;
    }

    try {
      setCalendarStatus("일정 추가 중");
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ calendarId, title, date, memo, category: calendarCreateForm.target })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "calendar create failed");

      setCalendarCreateForm((current) => ({ ...current, title: "", memo: "" }));
      setSelectedCalendar({ date, category: categoryFromCalendarId(calendarId, calendarConfig) });
      setCalendarStatus(`${date} 일정이 추가되었습니다.`);
      setCalendarQuickDate("");
      setCalendarReloadKey((current) => current + 1);
    } catch (error) {
      setCalendarStatus(error instanceof Error ? `일정 추가 실패: ${error.message}` : "일정 추가 실패");
    }
  }

  function prepareCalendarDate(date: string) {
    setCalendarCreateForm((current) => ({ ...current, date }));
    setCalendarStatus(`${date} 선택됨`);
  }

  function openCalendarQuickInput(date: string) {
    setCalendarCreateForm((current) => ({ ...current, date }));
    setCalendarQuickDate(date);
    setCalendarStatus(`${date} 일정 입력 준비`);
  }

  async function saveRoster() {
    const nextStudents = parseRosterText(rosterText);
    if (nextStudents.length === 0) {
      setSettingsMessage("번호와 이름이 있는 명렬표를 입력해 주세요.");
      return;
    }

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update-students",
        students: nextStudents
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setSettingsMessage(data.error || "명렬표를 저장하지 못했습니다.");
      return;
    }

    setSettingsMessage(`${nextStudents.length}명의 명렬표를 저장했습니다.`);
    await loadClassroom();
  }

  async function loadRosterFile(file: File) {
    if (!/\.csv$|\.txt$/i.test(file.name)) {
      setSettingsMessage("현재는 CSV 또는 TXT 파일을 지원합니다. 엑셀에서 CSV로 저장해 올려주세요.");
      return;
    }

    const text = await file.text();
    setRosterText(text);
    setSettingsMessage("파일을 불러왔습니다. 내용을 확인한 뒤 저장하세요.");
  }

  function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPointRecords() {
    downloadCsv("점수기록.csv", [
      ["날짜", "학생", "구분", "점수", "내용", "입력자"],
      ...records.map((record) => {
        const meta = pointMeta[record.type] || fallbackPointMeta;
        return [formatRecordDate(record.createdAt), record.studentName, meta.label, String(record.points), record.reason, record.actor];
      })
    ]);
  }

  function exportSubmissions() {
    downloadCsv("제출표.csv", [
      ["학생", ...sortedSubmissions.map((task) => `${task.title}${task.archivedAt ? " (완료)" : ""}`)],
      ...students.map((student) => [
        `${student.number}번 ${student.name}`,
        ...sortedSubmissions.map((task) => (submissionCheckMap.get(`${task.id}:${student.id}`)?.checked ? "제출" : ""))
      ])
    ]);
  }

  function exportLifeRecords() {
    downloadCsv("생활기록.csv", [
      ["날짜", "학생", "내용", "입력자"],
      ...lifeRecords.map((record) => [formatRecordDate(record.createdAt), record.studentName, record.reason, record.actor])
    ]);
  }

  function exportMissions() {
    downloadCsv("학급미션.csv", [
      ["날짜", "점수", "내용"],
      ...missions.map((mission) => [formatRecordDate(mission.createdAt), String(mission.points), mission.title])
    ]);
  }

  function previewAssessmentImport() {
    const nextDrafts = parseAssessmentImport(assessmentImportText);
    setAssessmentDrafts(nextDrafts);
    setAssessmentMessage(nextDrafts.length > 0 ? `${nextDrafts.length}개 평가항목을 추출했습니다.` : "추출된 평가항목이 없습니다.");
  }

  function updateAssessmentDraft(id: string, field: keyof AssessmentItem, value: string) {
    setAssessmentDrafts((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function removeAssessmentDraft(id: string) {
    setAssessmentDrafts((current) => current.filter((item) => item.id !== id));
  }

  async function saveAssessmentDrafts() {
    const source = assessmentDrafts.length > 0 ? assessmentDrafts : assessmentItems;
    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "save-assessments",
        items: source
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setAssessmentMessage(data.error || "수행평가 항목을 저장하지 못했습니다.");
      return;
    }
    setAssessmentItems(data.assessmentItems || []);
    setAssessmentDrafts([]);
    setAssessmentMessage(`${data.assessmentItems?.length || 0}개 수행평가 항목을 저장했습니다.`);
    setSelectedAssessmentId((current) => current || data.assessmentItems?.[0]?.id || "");
  }

  async function deleteAssessment(itemId: string) {
    const item = assessmentItems.find((entry) => entry.id === itemId);
    const ok = window.confirm(`"${item?.neisName || item?.element || "수행평가"}" 항목을 삭제할까요? 학생별 입력 결과도 함께 삭제됩니다.`);
    if (!ok) return;

    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "delete-assessment",
        itemId
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setAssessmentMessage(data.error || "수행평가 항목을 삭제하지 못했습니다.");
      return;
    }
    await loadClassroom();
    setAssessmentMessage("수행평가 항목을 삭제했습니다.");
  }

  async function setAssessmentResultValue(itemId: string, studentId: string, level: string, memo = "", shouldReload = true) {
    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "set-assessment-result",
        itemId,
        studentId,
        level,
        memo
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setAssessmentMessage(data.error || "수행평가 결과를 저장하지 못했습니다.");
      return;
    }
    if (shouldReload) await loadClassroom();
  }

  async function applyAssessmentLevelToStudents(onlyEmpty: boolean) {
    if (!selectedAssessment) return;
    const targets = students.filter((student) => {
      if (!onlyEmpty) return true;
      return !assessmentResultMap.get(`${selectedAssessment.id}:${student.id}`)?.level;
    });
    await Promise.all(
      targets.map((student) => {
        const result = assessmentResultMap.get(`${selectedAssessment.id}:${student.id}`);
        return setAssessmentResultValue(selectedAssessment.id, student.id, commonAssessmentLevel, result?.memo || "", false);
      })
    );
    setAssessmentMessage(`${targets.length}명에게 ${commonAssessmentLevel}을 적용했습니다.`);
    await loadClassroom();
  }

  async function loadAssessmentFile(file: File) {
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setAssessmentMessage("현재는 CSV 또는 TXT 파일을 지원합니다. 엑셀에서 CSV로 저장해 올려주세요.");
      return;
    }
    const text = await file.text();
    setAssessmentImportText(text);
    const nextDrafts = parseAssessmentImport(text);
    setAssessmentDrafts(nextDrafts);
    setAssessmentMessage(`${file.name}에서 ${nextDrafts.length}개 평가항목을 추출했습니다.`);
  }

  function exportSelectedAssessmentForNeis() {
    const selected = assessmentItems.find((item) => item.id === selectedAssessmentId);
    if (!selected) {
      setAssessmentMessage("나이스용으로 내보낼 수행평가 항목을 선택해 주세요.");
      return;
    }

    const resultMap = new Map(assessmentResults.map((result) => [`${result.itemId}:${result.studentId}`, result]));
    const filename = [selected.subject, selected.domain, selected.unit]
      .map(safeFilenamePart)
      .filter(Boolean)
      .join("_") || "수행평가";
    downloadCsv(`${filename}.csv`, [
      ["이름", "성취수준"],
      ...students.map((student) => [student.name, resultMap.get(`${selected.id}:${student.id}`)?.level || ""])
    ]);
  }

  function confirmNeisReady() {
    return window.confirm(
      "나이스 자동입력을 시작하기 전에 준비해 주세요.\n\n" +
        "1. 나이스 성적 입력 화면을 엽니다.\n" +
        "2. 첫 번째 학생 이름 옆 입력 칸을 클릭해 커서가 깜빡이게 둡니다.\n" +
        "3. 확인을 누르면 입력프로그램이 실행되고 잠시 뒤 자동입력이 시작됩니다."
    );
  }

  async function startNeisAutoInput() {
    if (!selectedAssessmentId) {
      setAssessmentMessage("나이스 자동입력을 시작할 수행평가 항목을 선택해 주세요.");
      return;
    }
    if (!confirmNeisReady()) {
      setAssessmentMessage("나이스 자동입력을 취소했습니다.");
      return;
    }

    setAssessmentMessage("나이스 자동입력용 CSV를 저장하고 입력프로그램을 준비하는 중입니다.");
    const res = await fetch("/api/neis/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: selectedAssessmentId })
    });
    const data = await res.json();
    setAssessmentMessage(data.message || (data.ok ? "나이스 자동입력을 시작했습니다." : "나이스 자동입력을 시작하지 못했습니다."));
  }

  async function startNeisAutoInputFromFile(file: File) {
    if (!confirmNeisReady()) {
      setAssessmentMessage("CSV 입력을 취소했습니다.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setAssessmentMessage(`${file.name} 파일을 나이스 입력프로그램으로 보내는 중입니다.`);
    const res = await fetch("/api/neis/start", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    setAssessmentMessage(data.message || (data.ok ? "나이스 자동입력을 시작했습니다." : "나이스 자동입력을 시작하지 못했습니다."));
  }

  function moveMonth(amount: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function toggleCalendarCategory(key: CategoryKey) {
    setVisibleCalendarCategories((current) => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  const activeLabel = navItems.find((item) => item.key === activeView)?.label || "학급경영";
  const cells = useMemo(() => buildMonthCells(month), [month]);
  const groupedByDate = useMemo(() => {
    return calendarItems.reduce<Record<string, CalendarItem[]>>((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [calendarItems]);
  const visibleCategorySet = useMemo(() => new Set(visibleCalendarCategories), [visibleCalendarCategories]);
  const selectedCalendarItems =
    selectedCalendar && visibleCategorySet.has(selectedCalendar.category)
      ? (groupedByDate[selectedCalendar.date] || []).filter((item) => item.category === selectedCalendar.category)
      : [];
  const today = useMemo(() => new Date(), []);
  const submissionCheckMap = useMemo(() => {
    return new Map(submissionChecks.map((item) => [`${item.taskId}:${item.studentId}`, item]));
  }, [submissionChecks]);
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [submissions]);
  const activeSubmissions = sortedSubmissions.filter((task) => !task.archivedAt);
  const archivedSubmissions = sortedSubmissions.filter((task) => task.archivedAt);
  const latestSubmissions = activeSubmissions.slice(0, 4);
  const pastSubmissions = activeSubmissions.slice(4);
  const visibleSubmissions = showPastSubmissions ? activeSubmissions : latestSubmissions;
  const selectedRecordStudent = students.find((student) => student.id === selectedRecordStudentId);
  const selectedRecordStudents = students.filter((student) => selectedRecordStudentIds.includes(student.id));
  const allRecordStudentsSelected = students.length > 0 && selectedRecordStudentIds.length === students.length;
  const selectedAssessment = assessmentItems.find((item) => item.id === selectedAssessmentId);
  const assessmentResultMap = useMemo(() => {
    return new Map(assessmentResults.map((result) => [`${result.itemId}:${result.studentId}`, result]));
  }, [assessmentResults]);
  const assessmentSubjects = uniqueValues(assessmentItems.map((item) => item.subject));
  const assessmentUnits = uniqueValues(
    assessmentItems.filter((item) => !selectedAssessment?.subject || item.subject === selectedAssessment.subject).map((item) => item.unit)
  );
  const assessmentDomains = uniqueValues(
    assessmentItems
      .filter((item) => !selectedAssessment?.subject || item.subject === selectedAssessment.subject)
      .filter((item) => !selectedAssessment?.unit || item.unit === selectedAssessment.unit)
      .map((item) => item.domain)
  );
  const assessmentElements = assessmentItems
    .filter((item) => !selectedAssessment?.subject || item.subject === selectedAssessment.subject)
    .filter((item) => !selectedAssessment?.unit || item.unit === selectedAssessment.unit)
    .filter((item) => !selectedAssessment?.domain || item.domain === selectedAssessment.domain);

  function selectAssessmentBy(field: keyof Pick<AssessmentItem, "subject" | "unit" | "domain" | "element">, value: string) {
    const preferred = assessmentItems.find(
      (item) =>
        item[field] === value &&
        (field === "subject" || !selectedAssessment?.subject || item.subject === selectedAssessment.subject) &&
        (field === "unit" || !selectedAssessment?.unit || item.unit === selectedAssessment.unit) &&
        (field === "domain" || !selectedAssessment?.domain || item.domain === selectedAssessment.domain)
    );
    const fallback = assessmentItems.find((item) => item[field] === value);
    setSelectedAssessmentId((preferred || fallback || assessmentItems[0])?.id || "");
  }
  const lifeRecords = records.filter((record) => record.type === "observation");
  const visibleLifeRecords = lifeRecords.filter((record) => {
    const keyword = lifeRecordSearch.trim();
    if (keyword) return record.studentName.includes(keyword);
    return true;
  });
  const calendarConfigFields: Array<{ key: keyof CalendarConfig; label: string; color: string; placeholder: string }> = [
    { key: "work", label: "업무 캘린더 ID", color: categoryMeta.work.color, placeholder: "업무 캘린더 ID" },
    { key: "class", label: "학급 캘린더 ID", color: categoryMeta.class.color, placeholder: "학급 캘린더 ID" },
    { key: "personal", label: "나의 일정 캘린더 ID", color: categoryMeta.personal.color, placeholder: "primary 또는 내 캘린더 ID" },
    { key: "personalFamily", label: "가족 일정 캘린더 ID", color: categoryMeta.personal.color, placeholder: "가족 캘린더 ID" }
  ];
  const calendarCreateTargets: Array<{ key: CalendarCreateForm["target"]; label: string }> = [
    { key: "work", label: "업무" },
    { key: "class", label: "학급" },
    { key: "personal", label: "개인" }
  ];

  return (
    <main style={styles.shell}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.appName}>SchoolTask 2.0</div>
          <div style={styles.appSub}>학급경영 + 학교업무</div>
        </div>

        <nav style={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.key}
              style={{ ...styles.navButton, ...(activeView === item.key ? styles.navActive : {}) }}
              onClick={() => setActiveView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <section style={styles.sidePanel}>
          <div style={styles.panelTitleDark}>학생 접속</div>
          <a href="/student" target="_blank" style={styles.studentLink}>
            /student 열기
          </a>
          <div style={styles.statusPill}>{calendarStatus}</div>
        </section>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>{activeLabel}</h1>
            <div style={styles.headerMeta}>
              {activeView === "class"
                ? "제출은 체크표로 관리하고, 관찰기록/칭찬은 학생별로, 학급미션은 학급 총점으로 기록합니다."
                : "업무, 학급, 개인 일정을 한 화면에서 봅니다."}
            </div>
          </div>
          {activeView === "calendar" && (
            <div style={styles.monthControls}>
              <button style={styles.iconButton} onClick={() => moveMonth(-1)} aria-label="이전 달">
                &lt;
              </button>
              <div style={styles.monthTitle}>
                {month.getFullYear()}년 {month.getMonth() + 1}월
              </div>
              <button style={styles.iconButton} onClick={() => moveMonth(1)} aria-label="다음 달">
                &gt;
              </button>
            </div>
          )}
        </header>

        {activeView === "class" && (
          <div style={styles.classGrid}>
            <section style={{ ...styles.sectionTabs, gridColumn: "1 / -1" }}>
              {(Object.keys(classSectionLabels) as ClassSectionKey[]).map((section) => (
                <button
                  key={section}
                  style={{ ...styles.sectionTab, ...(activeClassSection === section ? styles.sectionTabActive : {}) }}
                  onClick={() => setActiveClassSection(section)}
                >
                  {classSectionLabels[section]}
                </button>
              ))}
            </section>

            {activeClassSection === "pointRecords" && <section style={styles.panel}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>점수기록</div>
                  <div style={styles.panelHint}>학생 카드를 여러 명 선택해서 한 번에 점수를 기록하고, 아래에서 전체 점수 흐름을 확인합니다.</div>
                </div>
                <button style={styles.lightButton} onClick={toggleAllRecordStudents}>
                  {allRecordStudentsSelected ? "전체 해제" : "전체 선택"}
                </button>
                <button style={styles.lightButton} onClick={loadClassroom}>
                  새로고침
                </button>
                <button style={styles.lightButton} onClick={exportPointRecords}>
                  CSV
                </button>
              </div>
              <div style={styles.scoreGrid}>
                {students.map((student) => (
                  <button
                    key={student.id}
                    style={{
                      ...styles.scoreCard,
                      ...(selectedRecordStudentIds.includes(student.id) ? styles.scoreCardActive : {})
                    }}
                    onClick={() => selectRecordStudent(student.id)}
                  >
                    <div style={styles.studentNo}>{student.number}번</div>
                    <div style={styles.studentName}>{student.name}</div>
                    <div style={{ ...styles.scoreValue, color: student.total < 0 ? "#dc2626" : "#111827" }}>
                      {student.total}점
                    </div>
                  </button>
                ))}
              </div>
              <div style={styles.selectedPointPanel}>
                <div>
                  <div style={styles.panelTitle}>선택 학생 적용</div>
                  <div style={styles.panelHint}>
                    {selectedRecordStudents.length > 0
                      ? `${selectedRecordStudents.length}명에게 동시에 기록합니다.`
                      : "학생 카드를 한 명 이상 선택하세요."}
                  </div>
                </div>
                <div style={styles.pointTypeCards}>
                  {[
                    { type: "praise" as PointType, title: "칭찬", hint: "상점 기록" },
                    { type: "penalty" as PointType, title: "감점", hint: "점수 차감" }
                  ].map((option) => (
                    <button
                      key={option.type}
                      style={{ ...styles.pointTypeCard, ...(pointForm.type === option.type ? styles.pointTypeCardActive : {}) }}
                      onClick={() =>
                        setPointForm((current) => ({
                          ...current,
                          type: option.type,
                          points: option.type === "observation" ? "0" : current.points === "0" ? "1" : current.points
                        }))
                      }
                    >
                      <strong>{option.title}</strong>
                      <span>{option.hint}</span>
                    </button>
                  ))}
                </div>
                {pointForm.type !== "observation" && (
                  <div style={styles.pointValueRow}>
                    <div style={styles.pointQuickButtons}>
                      {["1", "3", "5"].map((value) => (
                        <button
                          key={value}
                          style={{ ...styles.pointQuickButton, ...(pointForm.points === value ? styles.pointQuickButtonActive : {}) }}
                          onClick={() => setPointForm((current) => ({ ...current, points: value }))}
                        >
                          {pointForm.type === "penalty" ? "-" : "+"}
                          {value}
                        </button>
                      ))}
                    </div>
                    <input
                      style={styles.pointDirectInput}
                      type="number"
                      min="1"
                      value={pointForm.points}
                      onChange={(event) => setPointForm((current) => ({ ...current, points: event.target.value }))}
                      placeholder="직접"
                    />
                  </div>
                )}
                {pointForm.type === "observation" && (
                  <div style={styles.observationNotice}>관찰기록은 점수 없이 생활기록에 모입니다.</div>
                )}
                <input
                  style={styles.input}
                  value={pointForm.reason}
                  onChange={(event) => setPointForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="관찰 내용 또는 점수 사유"
                />
                <button style={styles.primaryButton} onClick={addPoint} disabled={selectedRecordStudents.length === 0}>
                  선택 학생 {selectedRecordStudents.length}명에게 적용
                </button>
              </div>
              <div style={styles.recordList}>
                {records.map((record) => {
                  const meta = pointMeta[record.type] || fallbackPointMeta;
                  const isEditing = editingRecordId === record.id;
                  return (
                    <div key={record.id} style={isEditing ? styles.recordEditItem : styles.recordItem}>
                      {isEditing ? (
                        <>
                          <select
                            style={styles.compactInput}
                            value={editingRecordForm.type}
                            onChange={(event) => setEditingRecordForm((current) => ({ ...current, type: event.target.value as PointType }))}
                          >
                            <option value="observation">관찰기록</option>
                            <option value="praise">칭찬</option>
                            <option value="penalty">감점</option>
                            <option value="submissionAward">제출상점</option>
                          </select>
                          <strong>{record.studentName}</strong>
                          <input
                            style={styles.compactInput}
                            type="number"
                            value={editingRecordForm.points}
                            onChange={(event) => setEditingRecordForm((current) => ({ ...current, points: event.target.value }))}
                          />
                          <input
                            style={styles.compactInput}
                            value={editingRecordForm.reason}
                            onChange={(event) => setEditingRecordForm((current) => ({ ...current, reason: event.target.value }))}
                          />
                          <div style={styles.rowActions}>
                            <button style={styles.lightButton} onClick={() => saveRecordEdit(record.id)}>
                              저장
                            </button>
                            <button style={styles.ghostButton} onClick={cancelEditRecord}>
                              취소
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span style={{ ...styles.recordBadge, background: meta.color }}>{meta.label}</span>
                          <strong>{record.studentName}</strong>
                          <span style={{ color: record.points < 0 ? "#dc2626" : "#166534", fontWeight: 900 }}>
                            {record.points > 0 ? "+" : ""}
                            {record.points}점
                          </span>
                          <span style={styles.recordReason}>{record.reason}</span>
                          <span style={styles.recordMeta}>
                            {record.actor} · {formatRecordDate(record.createdAt)}
                          </span>
                          <div style={styles.rowActions}>
                            <button style={styles.ghostButton} onClick={() => startEditRecord(record)}>
                              수정
                            </button>
                            <button style={styles.dangerButton} onClick={() => deleteRecord(record)}>
                              삭제
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>}

            {classroomMessage && (
              <section style={{ ...styles.messagePanel, gridColumn: "1 / -1" }}>
                {classroomMessage}
              </section>
            )}

            {activeClassSection === "submissions" && <section style={{ ...styles.panel, gridColumn: "1 / -1" }}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>제출표</div>
                  <div style={styles.panelHint}>
                    진행 중 제출 {activeSubmissions.length}개를 보여주고, 완료된 항목은 아래에 따로 보관합니다.
                  </div>
                </div>
                <div style={styles.inlineCreate}>
                  <input
                    style={styles.inlineInput}
                    value={submissionTitle}
                    onChange={(event) => setSubmissionTitle(event.target.value)}
                    placeholder="예: 독서록 제출"
                  />
                  <button style={styles.lightButton} onClick={addSubmission}>
                    항목 추가
                  </button>
                </div>
                <button style={styles.lightButton} onClick={exportSubmissions}>
                  CSV
                </button>
                {pastSubmissions.length > 0 && (
                  <button style={styles.lightButton} onClick={() => setShowPastSubmissions((current) => !current)}>
                    {showPastSubmissions ? "지난 제출 숨기기" : `지난 제출 ${pastSubmissions.length}개 보기`}
                  </button>
                )}
              </div>
              {activeSubmissions.length === 0 && <div style={styles.emptyText}>진행 중인 제출 항목이 없습니다. 항목을 만들거나 완료 항목을 되돌릴 수 있습니다.</div>}
              {activeSubmissions.length > 0 && (
                <div style={styles.submissionTableWrap}>
                  <table style={styles.submissionTable}>
                    <thead>
                      <tr>
                        <th style={styles.submissionStudentHead}>학생</th>
                        {visibleSubmissions.map((task) => {
                          const isEditing = editingSubmissionId === task.id;
                          return (
                            <th key={task.id} style={styles.submissionHead}>
                              {isEditing ? (
                                <input
                                  style={styles.submissionHeaderEditInput}
                                  value={editingSubmissionTitle}
                                  onChange={(event) => setEditingSubmissionTitle(event.target.value)}
                                  autoFocus
                                />
                              ) : (
                                task.title
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td style={styles.submissionStudentCell}>
                            {student.number}번 {student.name}
                          </td>
                          {visibleSubmissions.map((task) => {
                            const check = submissionCheckMap.get(`${task.id}:${student.id}`);
                            return (
                              <td key={task.id} style={styles.submissionCell}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(check?.checked)}
                                  onChange={(event) => toggleSubmission(task.id, student.id, event.target.checked)}
                                  style={styles.checkbox}
                                />
                                {check?.checked && <div style={styles.checkMeta}>{check.actor}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={styles.submissionFooterLabel}>항목 관리</td>
                        {visibleSubmissions.map((task) => {
                          const checkedCount = submissionChecks.filter((item) => item.taskId === task.id && item.checked).length;
                          const isEditing = editingSubmissionId === task.id;
                          return (
                            <td key={task.id} style={styles.submissionFooterCell}>
                              <div style={styles.submissionColumnTools}>
                                <div style={styles.submissionCountText}>{checkedCount}명 제출</div>
                                <input
                                  style={styles.submissionAwardInput}
                                  type="number"
                                  value={submissionAwardPoints[task.id] || ""}
                                  onChange={(event) =>
                                    setSubmissionAwardPoints((current) => ({
                                      ...current,
                                      [task.id]: event.target.value
                                    }))
                                  }
                                  placeholder="상점"
                                />
                                <button style={styles.lightButton} onClick={() => awardSubmission(task.id)}>
                                  상점 지급
                                </button>
                                <div style={styles.submissionEditActions}>
                                  {isEditing ? (
                                    <>
                                      <button style={styles.lightButton} onClick={() => saveSubmissionEdit(task.id)}>
                                        저장
                                      </button>
                                      <button style={styles.ghostButton} onClick={cancelEditSubmission}>
                                        취소
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button style={styles.ghostButton} onClick={() => startEditSubmission(task)}>
                                        수정
                                      </button>
                                      <button style={styles.ghostButton} onClick={() => archiveSubmission(task, true)}>
                                        완료
                                      </button>
                                      <button style={styles.dangerButton} onClick={() => deleteSubmission(task)}>
                                        삭제
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {archivedSubmissions.length > 0 && (
                <div style={styles.archivedList}>
                  <div style={styles.panelTitle}>완료된 제출</div>
                  {archivedSubmissions.map((task) => (
                    <div key={task.id} style={styles.archivedItem}>
                      <span>{task.title}</span>
                      <span style={styles.recordMeta}>{task.archivedAt ? formatRecordDate(task.archivedAt) : ""}</span>
                      <button style={styles.ghostButton} onClick={() => archiveSubmission(task, false)}>
                        되돌리기
                      </button>
                      <button style={styles.dangerButton} onClick={() => deleteSubmission(task)}>
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>}

            {activeClassSection === "lifeRecords" && <section style={{ ...styles.panel, gridColumn: "1 / -1" }}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>생활기록</div>
                  <div style={styles.panelHint}>
                    {lifeRecordSearch
                      ? `"${lifeRecordSearch}" 검색 결과입니다.`
                      : "관찰기록 전체를 최신순으로 보여줍니다."}
                  </div>
                </div>
                <button style={styles.lightButton} onClick={exportLifeRecords}>
                  CSV
                </button>
                <input
                  style={styles.recordSearchInput}
                  value={lifeRecordSearch}
                  onChange={(event) => setLifeRecordSearch(event.target.value)}
                  placeholder="학생 이름 검색"
                />
              </div>
              <div style={styles.lifeRecordComposer}>
                <select
                  style={styles.input}
                  value={lifeRecordForm.studentId}
                  onChange={(event) => setLifeRecordForm((current) => ({ ...current, studentId: event.target.value }))}
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.number}번 {student.name}
                    </option>
                  ))}
                </select>
                <input
                  style={styles.input}
                  value={lifeRecordForm.reason}
                  onChange={(event) => setLifeRecordForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="생활기록 내용"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addLifeRecord();
                  }}
                />
                <button style={styles.primaryButton} onClick={addLifeRecord}>
                  생활기록 저장
                </button>
              </div>
              {visibleLifeRecords.length === 0 && <div style={styles.emptyText}>아직 관찰기록이 없습니다.</div>}
              {visibleLifeRecords.length > 0 && (
                <div style={styles.studentRecordList}>
                  {visibleLifeRecords.map((record) => {
                    const meta = pointMeta[record.type] || fallbackPointMeta;
                    return (
                      <div key={record.id} style={styles.studentRecordItem}>
                        <span style={styles.recordDate}>{formatRecordDate(record.createdAt)}</span>
                        <strong>{record.studentName}</strong>
                        <span style={{ ...styles.recordBadge, background: meta.color }}>{meta.label}</span>
                        <span style={styles.recordReason}>{record.reason}</span>
                        <span style={styles.recordMeta}>{record.actor}</span>
                        <div style={styles.rowActions}>
                          <button style={styles.ghostButton} onClick={() => startEditRecord(record)}>
                            수정
                          </button>
                          <button style={styles.dangerButton} onClick={() => deleteRecord(record)}>
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>}

            {activeClassSection === "missions" && <section style={{ ...styles.panel, gridColumn: "1 / -1" }}>
              <div style={styles.panelHeader}>
                <div>
                  <div style={styles.panelTitle}>학급미션</div>
                  <div style={styles.panelHint}>개인별 점수가 아니라 학급 총점만 올리거나 내립니다.</div>
                </div>
                <div style={styles.classTotalBoxCompact}>
                  <span>학급 총점</span>
                  <strong>{classTotal}점</strong>
                </div>
                <button style={styles.lightButton} onClick={exportMissions}>
                  CSV
                </button>
              </div>
              <div style={styles.missionSetPanel}>
                <div>
                  <div style={styles.panelTitle}>목표점수</div>
                  <div style={styles.panelHint}>학급미션의 목표 기준입니다. 아래 미션 점수로 현재 총점을 올리거나 내립니다.</div>
                </div>
                <input
                  style={styles.input}
                  type="number"
                  value={classTotalTarget}
                  onChange={(event) => setClassTotalTarget(event.target.value)}
                  placeholder="목표 총점"
                />
                <div style={styles.missionTargetSummary}>
                  <span>현재 {classTotal}점</span>
                  <strong>
                    남은 점수 {Number.isFinite(Number(classTotalTarget)) ? Number(classTotalTarget) - classTotal : 0}점
                  </strong>
                </div>
              </div>
              <div style={styles.panelHint}>미션 성공은 양수, 실패나 감점은 음수로 입력합니다.</div>
              <div style={styles.missionInputGrid}>
                <input
                  style={styles.input}
                  value={missionForm.title}
                  onChange={(event) => setMissionForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="예: 아침 독서 10분 성공"
                />
                <input
                  style={styles.input}
                  type="number"
                  value={missionForm.points}
                  onChange={(event) => setMissionForm((current) => ({ ...current, points: event.target.value }))}
                  placeholder="학급 점수, 감점은 -10"
                />
                <button style={styles.primaryButton} onClick={applyMission}>
                  학급 총점에 기록
                </button>
              </div>
              {missions.length > 0 && (
                <div style={styles.classMissionList}>
                  {missions.map((mission) => {
                    const isEditing = editingMissionId === mission.id;
                    return (
                      <div key={mission.id} style={isEditing ? styles.classMissionEditItem : styles.classMissionItem}>
                        {isEditing ? (
                          <>
                            <span>{formatRecordDate(mission.createdAt)}</span>
                            <input
                              style={styles.compactInput}
                              type="number"
                              value={editingMissionForm.points}
                              onChange={(event) => setEditingMissionForm((current) => ({ ...current, points: event.target.value }))}
                            />
                            <input
                              style={styles.compactInput}
                              value={editingMissionForm.title}
                              onChange={(event) => setEditingMissionForm((current) => ({ ...current, title: event.target.value }))}
                            />
                            <div style={styles.rowActions}>
                              <button style={styles.lightButton} onClick={() => saveMissionEdit(mission.id)}>
                                저장
                              </button>
                              <button style={styles.ghostButton} onClick={cancelEditMission}>
                                취소
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span>{formatRecordDate(mission.createdAt)}</span>
                            <strong>
                              {mission.points > 0 ? "+" : ""}
                              {mission.points}점
                            </strong>
                            <span>{mission.title}</span>
                            <div style={styles.rowActions}>
                              <button style={styles.ghostButton} onClick={() => startEditMission(mission)}>
                                수정
                              </button>
                              <button style={styles.dangerButton} onClick={() => deleteMissionItem(mission)}>
                                삭제
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>}
          </div>
        )}

        {activeView === "calendar" && (
          <div style={styles.mainGrid}>
            <section style={styles.calendarArea}>
              <div style={styles.calendarLegend}>
                {(["work", "class", "personal"] as CategoryKey[]).map((key) => {
                  const meta = categoryMeta[key];
                  const visible = visibleCategorySet.has(key);
                  return (
                    <button
                      key={key}
                      style={{
                        ...styles.legendItem,
                        ...(visible ? {} : styles.legendItemMuted)
                      }}
                      onClick={() => toggleCalendarCategory(key)}
                    >
                      <span style={{ ...styles.legendDot, background: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
              <div style={styles.weekHeader}>
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} style={styles.weekCell}>
                    {day}
                  </div>
                ))}
              </div>
              <div style={styles.monthGrid}>
                {cells.map((cell) => {
                  const dayItems = groupedByDate[cell.ymd] || [];
                  const counts = dayItems.reduce<Record<CategoryKey, number>>(
                    (acc, item) => {
                      acc[item.category] += 1;
                      return acc;
                    },
                    { work: 0, class: 0, personal: 0 }
                  );

                  return (
                    <div
                      key={cell.ymd}
                      role="button"
                      tabIndex={0}
                      style={{
                        ...styles.dayCell,
                        ...(cell.isCurrentMonth ? {} : styles.dayMuted),
                        ...(isSameCalendarWeek(cell.date, today) ? styles.dayThisWeek : {}),
                        ...(cell.isToday ? styles.dayToday : {}),
                        ...(calendarCreateForm.date === cell.ymd ? styles.daySelectedForInput : {})
                      }}
                      onClick={() => prepareCalendarDate(cell.ymd)}
                      onDoubleClick={() => openCalendarQuickInput(cell.ymd)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openCalendarQuickInput(cell.ymd);
                        }
                      }}
                    >
                      <div style={styles.dayNumber}>{cell.date.getDate()}</div>
                      <div style={styles.categoryStack}>
                        {(["work", "class", "personal"] as CategoryKey[]).map((key) => {
                          if (!visibleCategorySet.has(key)) return null;
                          if (!counts[key]) return null;
                          const meta = categoryMeta[key];
                          const active = selectedCalendar?.date === cell.ymd && selectedCalendar.category === key;
                          return (
                            <button
                              key={key}
                              style={{
                                ...styles.categoryButton,
                                color: meta.color,
                                borderColor: active ? meta.color : "#dbe3ef",
                                outline: active ? "2px solid rgba(15,23,42,.35)" : "none"
                              }}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedCalendar(active ? null : { date: cell.ymd, category: key });
                              }}
                            >
                              <span style={styles.categoryDot} />
                              <span style={styles.count}>{counts[key]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              {calendarQuickDate && (
                <div style={styles.calendarQuickOverlay}>
                  <div style={styles.calendarQuickHeader}>
                    <strong>{calendarQuickDate}</strong>
                    <button style={styles.iconButtonMini} onClick={() => setCalendarQuickDate("")} aria-label="닫기">
                      x
                    </button>
                  </div>
                  <div style={styles.calendarTargetButtons}>
                    {calendarCreateTargets.map((target) => (
                      <button
                        key={target.key}
                        style={{
                          ...styles.calendarTargetButton,
                          ...(calendarCreateForm.target === target.key ? styles.calendarTargetButtonActive : {})
                        }}
                        onClick={() => setCalendarCreateForm((current) => ({ ...current, target: target.key }))}
                      >
                        {target.label}
                      </button>
                    ))}
                  </div>
                  <input
                    style={styles.configInput}
                    value={calendarCreateForm.title}
                    placeholder="일정 제목"
                    onChange={(event) => setCalendarCreateForm((current) => ({ ...current, title: event.target.value }))}
                  />
                  <textarea
                    style={styles.calendarQuickMemoInput}
                    value={calendarCreateForm.memo}
                    placeholder="메모"
                    onChange={(event) => setCalendarCreateForm((current) => ({ ...current, memo: event.target.value }))}
                  />
                  <button style={styles.primaryButton} onClick={createCalendarItem}>
                    추가
                  </button>
                </div>
              )}
            </section>

            <aside style={styles.rightRail}>
              <section style={styles.panel}>
                <div style={styles.panelTitle}>선택한 일정</div>
                {!selectedCalendar && <div style={styles.emptyText}>달력에서 업무, 학급, 개인 버튼을 누르면 세부내역이 보입니다.</div>}
                {selectedCalendarItems.map((item) => (
                  <article key={item.id} style={styles.detailItem}>
                    <div style={styles.detailTitle}>
                      {calendarTimeLabel(item.start) && <span style={styles.detailTime}>{calendarTimeLabel(item.start)}</span>}
                      {item.title}
                    </div>
                  </article>
                ))}
              </section>
            </aside>
          </div>
        )}

        {activeView === "settings" && (
          <div style={styles.settingsStack}>
            <section style={styles.settingsTabs}>
              {(Object.keys(settingsSectionLabels) as SettingsSectionKey[]).map((section) => (
                <button
                  key={section}
                  style={{ ...styles.sectionTab, ...(activeSettingsSection === section ? styles.sectionTabActive : {}) }}
                  onClick={() => setActiveSettingsSection(section)}
                >
                  {settingsSectionLabels[section]}
                </button>
              ))}
            </section>

            {activeSettingsSection === "calendar" && (
              <section style={styles.settingsPanel}>
                <div>
                  <div style={styles.panelTitle}>캘린더 연결 설정</div>
                  <div style={styles.settingHint}>처음 한 번만 입력해두면 통합 달력에서 계속 사용합니다.</div>
                </div>
                <div style={styles.configGrid}>
                  {calendarConfigFields.map((field) => (
                    <label key={field.key} style={styles.configField}>
                      <span style={{ ...styles.configLabel, color: field.color }}>{field.label}</span>
                      <input
                        style={styles.configInput}
                        value={calendarConfig[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setCalendarConfig((current) => ({
                            ...current,
                            [field.key]: event.target.value
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
                <div style={styles.settingsActionRow}>
                  <button style={styles.saveButton} onClick={saveCalendarConfig}>
                    저장
                  </button>
                  <button style={styles.lightButton} onClick={checkCalendarConnection}>
                    연결 확인
                  </button>
                </div>
                {settingsMessage && <div style={styles.settingsMessage}>{settingsMessage}</div>}
              </section>
            )}

            {activeSettingsSection === "class" && (
              <section style={styles.settingsPanel}>
                <div>
                  <div style={styles.panelTitle}>학급경영 설정</div>
                  <div style={styles.settingHint}>학생 명렬표와 학급미션 목표점수를 관리합니다.</div>
                </div>
                <div style={styles.classSettingGrid}>
                  <label style={styles.configField}>
                    <span style={styles.configLabel}>학급미션 목표점수</span>
                    <input
                      style={styles.configInput}
                      type="number"
                      value={classTotalTarget}
                      onChange={(event) => setClassTotalTarget(event.target.value)}
                      placeholder="예: 1000"
                    />
                  </label>
                </div>
                <div>
                  <div style={styles.panelTitle}>학생 명렬표 설정</div>
                  <div style={styles.settingHint}>엑셀에서 번호와 이름 두 열을 복사해 붙여넣거나, CSV 파일로 저장해 업로드합니다.</div>
                </div>
                <div style={styles.rosterActions}>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) loadRosterFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  <button style={styles.lightButton} onClick={saveRoster}>
                    명렬표 저장
                  </button>
                </div>
                <textarea
                  style={styles.rosterTextarea}
                  value={rosterText}
                  onChange={(event) => setRosterText(event.target.value)}
                  placeholder={"번호,이름\n1,김민지\n2,박서연"}
                />
                {settingsMessage && <div style={styles.settingsMessage}>{settingsMessage}</div>}
              </section>
            )}

            {activeSettingsSection === "assessment" && (
              <div style={styles.assessmentSettingsStack}>
                <section style={styles.settingsPanel}>
                  <div style={styles.panelHeader}>
                    <div>
                      <div style={styles.panelTitle}>수행평가 가져오기</div>
                      <div style={styles.settingHint}>한글 표를 엑셀에 붙여넣은 뒤 CSV로 저장하거나, 엑셀 표를 복사해서 아래에 붙여넣습니다.</div>
                    </div>
                    <div style={styles.rosterActions}>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) loadAssessmentFile(file);
                          event.currentTarget.value = "";
                        }}
                      />
                      <button style={styles.lightButton} onClick={previewAssessmentImport}>
                        자동 추출
                      </button>
                      <button style={styles.primaryActionButton} onClick={saveAssessmentDrafts}>
                        항목 저장
                      </button>
                    </div>
                  </div>
                  <textarea
                    style={styles.assessmentImportBox}
                    value={assessmentImportText}
                    onChange={(event) => setAssessmentImportText(event.target.value)}
                    placeholder={"엑셀에서 복사한 수행평가 표를 붙여넣거나 CSV 내용을 넣으세요.\n성취기준, 단원명, 평가영역, 평가 요소, 수업·평가 방법, 성취 수준, 평가시기 열을 우선 인식합니다."}
                  />
                  {assessmentMessage && <div style={styles.messagePanel}>{assessmentMessage}</div>}
                </section>

                {assessmentDrafts.length > 0 && (
                  <section style={styles.settingsPanel}>
                    <div style={styles.panelTitle}>추출 결과 확인</div>
                    <div style={styles.assessmentTableWrap}>
                      <table style={styles.assessmentTable}>
                        <thead>
                          <tr>
                            {["과목", "성취기준", "단원", "영역", "평가요소", "방법", "시기", "매우잘함", "잘함", "보통", "노력요함", "나이스명", ""].map((head) => (
                              <th key={head} style={styles.assessmentHead}>{head}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {assessmentDrafts.map((item) => (
                            <tr key={item.id}>
                              {(["subject", "standard", "unit", "domain", "element", "method", "period", "excellent", "good", "basic", "needsHelp", "neisName"] as Array<keyof AssessmentItem>).map((field) => (
                                <td key={field} style={styles.assessmentCell}>
                                  <input
                                    style={styles.tableInput}
                                    value={String(item[field] || "")}
                                    onChange={(event) => updateAssessmentDraft(item.id, field, event.target.value)}
                                  />
                                </td>
                              ))}
                              <td style={styles.assessmentCell}>
                                <button style={styles.dangerButton} onClick={() => removeAssessmentDraft(item.id)}>
                                  삭제
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            )}

            {activeSettingsSection === "work" && (
              <section style={styles.settingsPanel}>
                <div>
                  <div style={styles.panelTitle}>학교업무 설정</div>
                  <div style={styles.settingHint}>업무 게시판, 자료 제출, 자주 쓰는 링크 설정을 이곳에 모을 예정입니다.</div>
                </div>
                <div style={styles.emptyText}>아직 연결된 학교업무 설정이 없습니다.</div>
              </section>
            )}
          </div>
        )}

        {activeView === "assessment" && (
          <section style={styles.assessmentEntryPanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.sectionTitle}>수행평가 입력</h2>
                <div style={styles.panelHint}>설정에서 저장한 평가 양식과 학급경영 명부를 바탕으로 입력합니다.</div>
              </div>
              {selectedAssessment && (
                <button style={styles.dangerButton} onClick={() => deleteAssessment(selectedAssessment.id)}>
                  항목 삭제
                </button>
              )}
            </div>
            {assessmentMessage && <div style={styles.messagePanel}>{assessmentMessage}</div>}
            {assessmentItems.length === 0 && <div style={styles.emptyText}>저장된 수행평가 항목이 없습니다. 설정의 수행평가 탭에서 먼저 가져오세요.</div>}
            {selectedAssessment && (
              <>
                <div style={styles.assessmentFilterBox}>
                  <label style={styles.configField}>
                    <span style={styles.configLabel}>과목</span>
                    <select style={styles.assessmentSelect} value={selectedAssessment.subject} onChange={(event) => selectAssessmentBy("subject", event.target.value)}>
                      {assessmentSubjects.map((subject) => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.configField}>
                    <span style={styles.configLabel}>단원</span>
                    <select style={styles.assessmentSelect} value={selectedAssessment.unit} onChange={(event) => selectAssessmentBy("unit", event.target.value)}>
                      {assessmentUnits.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.configField}>
                    <span style={styles.configLabel}>평가영역</span>
                    <select style={styles.assessmentSelect} value={selectedAssessment.domain} onChange={(event) => selectAssessmentBy("domain", event.target.value)}>
                      {assessmentDomains.map((domain) => (
                        <option key={domain} value={domain}>{domain}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={styles.assessmentMetaRow}>
                  <label style={styles.configField}>
                    <span style={styles.configLabel}>평가요소</span>
                    <select style={styles.assessmentSelect} value={selectedAssessment.id} onChange={(event) => setSelectedAssessmentId(event.target.value)}>
                      {assessmentElements.map((item) => (
                        <option key={item.id} value={item.id}>{item.element || item.neisName || item.standard}</option>
                      ))}
                    </select>
                  </label>
                  <div style={styles.assessmentPlanSchedule}>
                    <span style={styles.configLabel}>계획 평가일정</span>
                    <strong>{selectedAssessment.period || "-"}</strong>
                  </div>
                  <label style={styles.configField}>
                    <span style={styles.configLabel}>평가일</span>
                    <input style={styles.assessmentSelect} type="date" value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} />
                  </label>
                </div>

                <div style={styles.assessmentStandardBox}>
                  <span style={styles.configLabel}>성취기준</span>
                  <strong>{selectedAssessment.standard || "-"}</strong>
                  <div style={styles.assessmentLevelGuideRows}>
                    {[
                      { level: "매우잘함", text: selectedAssessment.excellent },
                      { level: "잘함", text: selectedAssessment.good },
                      { level: "보통", text: selectedAssessment.basic },
                      { level: "노력요함", text: selectedAssessment.needsHelp }
                    ].map((item) => (
                      <div key={item.level} style={styles.assessmentLevelGuideRow}>
                        <span style={styles.assessmentLevelGuideLabel}>{item.level}</span>
                        <span>{item.text || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.assessmentApplyBox}>
                  <label style={{ ...styles.configField, flex: 1 }}>
                    <span style={styles.configLabel}>공통 성취수준</span>
                    <select style={styles.assessmentSelect} value={commonAssessmentLevel} onChange={(event) => setCommonAssessmentLevel(event.target.value)}>
                      {assessmentLevels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </label>
                  <button style={styles.lightButton} onClick={() => applyAssessmentLevelToStudents(false)}>전체 적용</button>
                  <button style={styles.lightButton} onClick={() => applyAssessmentLevelToStudents(true)}>빈칸만 적용</button>
                  <button style={styles.lightButton} onClick={exportSelectedAssessmentForNeis}>나이스 CSV</button>
                  <button style={styles.primaryActionButton} onClick={startNeisAutoInput}>나이스 자동입력</button>
                  <label style={styles.fileActionButton}>
                    CSV 입력
                    <input
                      type="file"
                      accept=".csv"
                      style={styles.hiddenFileInput}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) startNeisAutoInputFromFile(file);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                <div style={styles.assessmentInputLayout}>
                  <div style={styles.assessmentRosterTable}>
                    <div style={styles.assessmentRosterHeaderRow}>
                      <div style={styles.assessmentRosterHead}>번호</div>
                      <div style={styles.assessmentRosterHead}>이름</div>
                      <div style={styles.assessmentRosterHead}>성취수준</div>
                      <div style={styles.assessmentRosterHead}>비고</div>
                    </div>
                    {students.map((student) => {
                      const result = assessmentResultMap.get(`${selectedAssessment.id}:${student.id}`);
                      return (
                        <div key={student.id} style={styles.assessmentRosterRow}>
                          <div>{student.number}</div>
                          <strong>{student.name}</strong>
                          <div style={styles.assessmentLevelButtonGroup}>
                            {assessmentLevels.map((level) => (
                              <button
                                key={level}
                                style={{ ...styles.assessmentLevelButton, ...(result?.level === level ? styles.assessmentLevelButtonActive : {}) }}
                                onClick={() => setAssessmentResultValue(selectedAssessment.id, student.id, level, result?.memo || "")}
                              >
                                {level.replace(" ", "")}
                              </button>
                            ))}
                          </div>
                          <input
                            style={styles.assessmentMemoInput}
                            defaultValue={result?.memo || ""}
                            placeholder="비고"
                            onBlur={(event) => setAssessmentResultValue(selectedAssessment.id, student.id, result?.level || "", event.target.value)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {activeView === "work" && (
          <section style={styles.panel}>
            <div style={styles.panelTitle}>준비 중</div>
            <div style={styles.emptyText}>이 영역은 다음 단계에서 기존 기능을 옮겨 붙이면 됩니다.</div>
          </section>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    display: "grid",
    gridTemplateColumns: "220px 1fr",
    background: "#f4f7fb",
    color: "#0f172a",
    fontFamily: "system-ui, Malgun Gothic, sans-serif"
  },
  sidebar: { background: "#111827", color: "#fff", padding: 20, display: "flex", flexDirection: "column", gap: 24 },
  appName: { fontSize: 22, fontWeight: 900 },
  appSub: { color: "#cbd5e1", fontSize: 13, marginTop: 4 },
  nav: { display: "flex", flexDirection: "column", gap: 6 },
  navButton: {
    border: 0,
    borderRadius: 8,
    padding: "11px 12px",
    background: "transparent",
    color: "#d1d5db",
    textAlign: "left",
    fontWeight: 800,
    cursor: "pointer"
  },
  navActive: { background: "#2563eb", color: "#fff" },
  sidePanel: { marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 },
  panelTitleDark: { fontSize: 14, fontWeight: 900, color: "#e5e7eb" },
  studentLink: { color: "#bfdbfe", fontWeight: 900, textDecoration: "none", fontSize: 13 },
  statusPill: { background: "#1f2937", color: "#bfdbfe", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 800 },
  content: { padding: 22, minWidth: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 16 },
  h1: { margin: 0, fontSize: 26, lineHeight: 1.2 },
  headerMeta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  monthControls: { display: "flex", alignItems: "center", gap: 8 },
  iconButton: { width: 34, height: 34, border: "1px solid #dbe3ef", borderRadius: 8, background: "#fff", cursor: "pointer", fontWeight: 900 },
  monthTitle: { minWidth: 130, textAlign: "center", fontWeight: 900 },
  classGrid: { display: "grid", gridTemplateColumns: "minmax(620px, 1fr) 360px", gap: 16, alignItems: "start" },
  sectionTabs: { display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: 8 },
  sectionTab: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "11px 12px",
    fontWeight: 900,
    cursor: "pointer"
  },
  sectionTabActive: { background: "#111827", color: "#fff", border: "1px solid #111827" },
  panel: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14 },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" },
  panelTitle: { fontSize: 14, fontWeight: 900, marginBottom: 10 },
  panelHint: { color: "#64748b", fontSize: 12, marginTop: -6 },
  scoreGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 },
  scoreCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    background: "#fbfdff",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit"
  },
  scoreCardActive: { border: "1px solid #2563eb", boxShadow: "inset 0 0 0 2px #2563eb", background: "#eff6ff" },
  studentNo: { color: "#64748b", fontSize: 12, fontWeight: 800 },
  studentName: { fontSize: 18, fontWeight: 900, marginTop: 4 },
  scoreValue: { fontSize: 24, fontWeight: 900, marginTop: 8 },
  selectedPointPanel: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    background: "#fbfdff",
    marginTop: 12
  },
  selectedPointGrid: { display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 },
  pointTypeCards: { display: "grid", gridTemplateColumns: "repeat(2, minmax(120px, 1fr))", gap: 8, marginBottom: 8 },
  pointTypeCard: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    alignItems: "flex-start",
    cursor: "pointer",
    font: "inherit",
    textAlign: "left"
  },
  pointTypeCardActive: { border: "1px solid #111827", background: "#f8fafc", boxShadow: "inset 0 0 0 2px #111827" },
  pointValueRow: { display: "grid", gridTemplateColumns: "1fr 110px", gap: 8, marginBottom: 8 },
  pointQuickButtons: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  pointQuickButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "10px 8px",
    fontWeight: 900,
    cursor: "pointer"
  },
  pointQuickButtonActive: { border: "1px solid #16a34a", background: "#16a34a", color: "#fff" },
  pointDirectInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "10px 8px",
    font: "inherit",
    fontWeight: 900,
    textAlign: "center"
  },
  observationNotice: { color: "#2563eb", background: "#eff6ff", borderRadius: 8, padding: "9px 10px", fontSize: 12, fontWeight: 800, marginBottom: 8 },
  lifeRecordComposer: {
    display: "grid",
    gridTemplateColumns: "160px 1fr 140px",
    gap: 8,
    marginBottom: 12,
    alignItems: "center"
  },
  rightRail: { display: "flex", flexDirection: "column", gap: 14 },
  inlineCreate: { display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" },
  inlineInput: {
    width: 180,
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "8px 10px",
    font: "inherit",
    fontSize: 13
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "10px 11px",
    marginBottom: 8,
    font: "inherit",
    fontSize: 13
  },
  primaryButton: { width: "100%", border: 0, borderRadius: 8, background: "#111827", color: "#fff", padding: "11px 12px", fontWeight: 900, cursor: "pointer" },
  primaryActionButton: { border: 0, borderRadius: 8, background: "#111827", color: "#fff", padding: "8px 12px", fontWeight: 900, cursor: "pointer" },
  lightButton: { border: "1px solid #dbe3ef", borderRadius: 8, background: "#fff", padding: "8px 10px", fontWeight: 900, cursor: "pointer" },
  fileActionButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center"
  },
  hiddenFileInput: { display: "none" },
  ghostButton: { border: "1px solid #dbe3ef", borderRadius: 8, background: "#f8fafc", padding: "8px 10px", fontWeight: 900, cursor: "pointer" },
  dangerButton: { border: "1px solid #fecaca", borderRadius: 8, background: "#fff5f5", color: "#b91c1c", padding: "8px 10px", fontWeight: 900, cursor: "pointer" },
  messagePanel: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, color: "#1d4ed8", padding: "10px 12px", fontSize: 13, fontWeight: 900 },
  classTotalBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    background: "#fbfdff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  classTotalBoxCompact: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 12px",
    background: "#fbfdff",
    display: "flex",
    gap: 12,
    alignItems: "center",
    fontSize: 13
  },
  missionInputGrid: { display: "grid", gridTemplateColumns: "1fr 120px 160px", gap: 8, alignItems: "start" },
  missionSetPanel: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) 140px 150px",
    gap: 8,
    alignItems: "start",
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#eff6ff",
    padding: 10,
    marginBottom: 10
  },
  missionTargetSummary: {
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    background: "#fff",
    padding: "8px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    fontSize: 12
  },
  classMissionList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  classMissionItem: {
    display: "grid",
    gridTemplateColumns: "74px 58px minmax(160px, 1fr) 128px",
    gap: 6,
    alignItems: "center",
    color: "#475569",
    fontSize: 12,
    borderTop: "1px solid #eef2f7",
    paddingTop: 6
  },
  classMissionEditItem: {
    display: "grid",
    gridTemplateColumns: "74px 90px minmax(160px, 1fr) 128px",
    gap: 6,
    alignItems: "center",
    color: "#475569",
    fontSize: 12,
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: 8,
    background: "#eff6ff"
  },
  recordList: { display: "flex", flexDirection: "column", gap: 8 },
  recordItem: {
    display: "grid",
    gridTemplateColumns: "84px 80px 70px minmax(120px, 1fr) 150px 128px",
    gap: 10,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 13
  },
  recordEditItem: {
    display: "grid",
    gridTemplateColumns: "120px 80px 80px minmax(160px, 1fr) 128px",
    gap: 8,
    alignItems: "center",
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    background: "#eff6ff"
  },
  compactInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "8px 9px",
    font: "inherit",
    fontSize: 12,
    fontWeight: 800,
    background: "#fff"
  },
  rowActions: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 },
  recordBadge: { color: "#fff", borderRadius: 999, padding: "4px 8px", textAlign: "center", fontSize: 11, fontWeight: 900 },
  recordReason: { color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  recordMeta: { color: "#64748b", fontSize: 12, textAlign: "right" },
  studentRecordList: { display: "flex", flexDirection: "column", gap: 8 },
  studentRecordItem: {
    display: "grid",
    gridTemplateColumns: "90px 80px 84px minmax(140px, 1fr) 90px 128px",
    gap: 10,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    background: "#fbfdff"
  },
  recordDate: { color: "#111827", fontWeight: 900 },
  recordSearchInput: {
    width: 180,
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "8px 10px",
    font: "inherit",
    fontSize: 13
  },
  submissionTableWrap: { overflowX: "auto" },
  submissionTable: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  submissionStudentHead: { width: 120, textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 12 },
  submissionHead: { minWidth: 110, textAlign: "center", padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 12 },
  submissionHeaderEditInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #93c5fd",
    borderRadius: 7,
    padding: "7px 8px",
    font: "inherit",
    fontWeight: 900,
    textAlign: "center"
  },
  submissionStudentCell: { padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900, fontSize: 13 },
  submissionCell: { padding: 8, borderBottom: "1px solid #f1f5f9", textAlign: "center", verticalAlign: "middle" },
  submissionFooterLabel: {
    padding: 10,
    borderTop: "1px solid #e5e7eb",
    background: "#f8fafc",
    fontSize: 12,
    fontWeight: 900,
    color: "#475569",
    verticalAlign: "top"
  },
  submissionFooterCell: {
    padding: 8,
    borderTop: "1px solid #e5e7eb",
    background: "#f8fafc",
    verticalAlign: "top"
  },
  submissionColumnTools: { display: "flex", flexDirection: "column", gap: 6 },
  submissionCountText: { color: "#64748b", fontSize: 11, fontWeight: 900, textAlign: "center" },
  checkbox: { width: 20, height: 20, cursor: "pointer" },
  checkMeta: { color: "#64748b", fontSize: 10, marginTop: 3 },
  submissionAwardPanel: { display: "flex", flexDirection: "column", gap: 8, marginTop: 12 },
  submissionAwardRow: {
    display: "grid",
    gridTemplateColumns: "1fr 90px 150px 150px",
    gap: 8,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    background: "#fbfdff"
  },
  submissionAwardTitle: { display: "flex", flexDirection: "column", gap: 2, fontSize: 13 },
  submissionEditActions: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(54px, 1fr))", gap: 6 },
  submissionEditInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #93c5fd",
    borderRadius: 8,
    padding: "8px 9px",
    font: "inherit",
    fontWeight: 900
  },
  submissionAwardInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "8px 9px",
    font: "inherit",
    fontWeight: 900,
    textAlign: "center"
  },
  archivedList: { display: "flex", flexDirection: "column", gap: 8, marginTop: 14, borderTop: "1px solid #eef2f7", paddingTop: 12 },
  archivedItem: {
    display: "grid",
    gridTemplateColumns: "minmax(160px, 1fr) 90px 90px 70px",
    gap: 8,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    background: "#f8fafc",
    fontSize: 13
  },
  mainGrid: { display: "grid", gridTemplateColumns: "minmax(620px, 1fr) 340px", gap: 16, alignItems: "start" },
  assessmentStack: { display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: { margin: "0 0 7px", fontSize: 24, lineHeight: 1.2 },
  assessmentEntryPanel: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 18, display: "flex", flexDirection: "column", gap: 12 },
  assessmentGrid: { display: "grid", gridTemplateColumns: "minmax(420px, 1fr) minmax(480px, 1.2fr)", gap: 16, alignItems: "start" },
  assessmentSettingsStack: { display: "flex", flexDirection: "column", gap: 12 },
  assessmentImportBox: {
    width: "100%",
    minHeight: 180,
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: 12,
    font: "inherit",
    fontSize: 13,
    lineHeight: 1.5,
    resize: "vertical",
    background: "#fbfdff",
    marginBottom: 10
  },
  assessmentTableWrap: { overflowX: "auto" },
  assessmentTable: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  assessmentHead: { minWidth: 120, textAlign: "left", padding: 8, borderBottom: "1px solid #e5e7eb", fontSize: 12, background: "#f8fafc" },
  assessmentCell: { padding: 6, borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  tableInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 7,
    padding: "7px 8px",
    font: "inherit",
    fontSize: 12,
    background: "#fff"
  },
  assessmentItemList: { display: "flex", flexDirection: "column", gap: 8 },
  assessmentItemButton: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fbfdff",
    padding: 10,
    textAlign: "left",
    cursor: "pointer",
    font: "inherit",
    display: "flex",
    flexDirection: "column",
    gap: 4
  },
  assessmentItemActive: { border: "1px solid #2563eb", boxShadow: "inset 0 0 0 2px #2563eb", background: "#eff6ff" },
  assessmentInputStack: { display: "flex", flexDirection: "column", gap: 12 },
  assessmentFilterBox: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#f8fbff",
    padding: 12,
    display: "grid",
    gridTemplateColumns: "minmax(180px, .8fr) minmax(260px, 1.1fr) minmax(180px, .8fr)",
    gap: 12
  },
  assessmentMetaRow: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#f8fbff",
    padding: 12,
    display: "grid",
    gridTemplateColumns: "minmax(360px, 1fr) 160px 190px",
    gap: 12
  },
  assessmentSelect: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cfe0f5",
    borderRadius: 8,
    padding: "10px 12px",
    font: "inherit",
    fontSize: 13,
    background: "#fff",
    minHeight: 42
  },
  assessmentPlanSchedule: {
    border: "1px solid #cfe0f5",
    borderRadius: 8,
    background: "#fff",
    minHeight: 42,
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 3
  },
  assessmentApplyBox: {
    border: "1px solid #dbeafe",
    borderRadius: 8,
    background: "#f8fbff",
    padding: 12,
    display: "flex",
    gap: 8,
    alignItems: "flex-end"
  },
  assessmentStandardBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    background: "#fbfdff",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 12,
    lineHeight: 1.45
  },
  assessmentLevelGuideRows: { display: "flex", flexDirection: "column", gap: 6, marginTop: 4 },
  assessmentLevelGuideRow: {
    display: "grid",
    gridTemplateColumns: "86px 1fr",
    gap: 8,
    alignItems: "start",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    padding: 8
  },
  assessmentLevelGuideLabel: {
    borderRadius: 7,
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "5px 7px",
    fontWeight: 900,
    textAlign: "center"
  },
  assessmentInputLayout: { display: "block" },
  assessmentStandardSide: { display: "flex", flexDirection: "column", gap: 10 },
  assessmentInfoGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(110px, 1fr))", gap: 8, marginBottom: 10 },
  assessmentInfoItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fbfdff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontSize: 12
  },
  levelGuideGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 1fr))", gap: 8 },
  levelGuideItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    fontSize: 12,
    lineHeight: 1.45
  },
  levelGuideButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 5,
    font: "inherit",
    fontSize: 12,
    lineHeight: 1.45,
    textAlign: "left",
    cursor: "pointer",
    minHeight: 94
  },
  levelGuideButtonActive: { border: "1px solid #2563eb", boxShadow: "inset 0 0 0 2px #2563eb", background: "#eff6ff" },
  assessmentInputList: { display: "flex", flexDirection: "column", gap: 8 },
  assessmentRosterTable: { display: "flex", flexDirection: "column", gap: 6, maxWidth: 900 },
  assessmentRosterHeaderRow: { display: "grid", gridTemplateColumns: "70px 120px 430px minmax(160px, 1fr)", gap: 8, padding: "4px 2px" },
  assessmentRosterHead: { fontSize: 13, fontWeight: 900, color: "#111827" },
  assessmentRosterRow: { display: "grid", gridTemplateColumns: "70px 120px 430px minmax(160px, 1fr)", gap: 8, alignItems: "center" },
  assessmentLevelButtonGroup: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 },
  assessmentLevelButton: {
    border: "1px solid #cfe0f5",
    borderRadius: 8,
    background: "#fff",
    padding: "9px 6px",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer"
  },
  assessmentLevelButtonActive: { border: "1px solid #2563eb", background: "#2563eb", color: "#fff" },
  assessmentLevelSelect: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cfe0f5",
    borderRadius: 8,
    padding: "9px 10px",
    font: "inherit",
    fontSize: 13,
    background: "#fff"
  },
  assessmentMemoInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cfe0f5",
    borderRadius: 8,
    padding: "9px 10px",
    font: "inherit",
    fontSize: 13,
    background: "#fff"
  },
  assessmentStudentRow: {
    display: "grid",
    gridTemplateColumns: "120px 1fr",
    gap: 10,
    alignItems: "center",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    background: "#fbfdff"
  },
  levelButtons: { display: "grid", gridTemplateColumns: "repeat(4, minmax(74px, 1fr))", gap: 6 },
  levelButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "8px 6px",
    fontWeight: 900,
    cursor: "pointer",
    fontSize: 12
  },
  levelButtonActive: { background: "#16a34a", border: "1px solid #16a34a", color: "#fff" },
  calendarArea: { position: "relative", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "visible" },
  calendarLegend: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: 12,
    fontWeight: 900,
    color: "#475569"
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    border: "1px solid #e5e7eb",
    borderRadius: 999,
    background: "#fff",
    padding: "4px 8px",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    color: "#475569",
    cursor: "pointer"
  },
  legendItemMuted: { opacity: 0.35 },
  legendDot: { width: 8, height: 8, borderRadius: 999, display: "inline-block" },
  weekHeader: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" },
  weekCell: { padding: "10px 6px", textAlign: "center", fontSize: 12, fontWeight: 900, color: "#475569" },
  monthGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)" },
  dayCell: {
    position: "relative",
    minHeight: 118,
    padding: 7,
    borderRight: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    background: "#fff",
    overflow: "visible",
    cursor: "pointer"
  },
  dayMuted: { background: "#f8fafc", color: "#94a3b8" },
  dayThisWeek: { background: "#f8fbff" },
  dayToday: { boxShadow: "inset 0 0 0 2px #93c5fd", background: "#eff6ff" },
  daySelectedForInput: { boxShadow: "inset 0 0 0 2px #2563eb" },
  dayNumber: { fontSize: 12, fontWeight: 900, marginBottom: 5 },
  categoryStack: { display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" },
  categoryButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 999,
    background: "#fff",
    color: "#0f172a",
    minHeight: 22,
    minWidth: 38,
    padding: "2px 7px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    fontSize: 11,
    fontWeight: 900,
    cursor: "pointer"
  },
  categoryDot: { width: 7, height: 7, borderRadius: 999, background: "currentColor", display: "inline-block" },
  count: { fontSize: 11, lineHeight: 1 },
  emptyText: { color: "#64748b", fontSize: 13, lineHeight: 1.5 },
  detailItem: { border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 10px", background: "#fbfdff", marginBottom: 6 },
  detailTitle: { display: "flex", alignItems: "baseline", gap: 6, fontWeight: 900, fontSize: 13, lineHeight: 1.35 },
  detailTime: { color: "#2563eb", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap" },
  detailMemo: { color: "#475569", fontSize: 12, lineHeight: 1.45, marginTop: 6, whiteSpace: "pre-wrap" },
  detailSource: { color: "#94a3b8", fontSize: 10, marginTop: 8, wordBreak: "break-all" },
  calendarCreateGrid: { display: "flex", flexDirection: "column", gap: 8, marginTop: 10 },
  calendarQuickOverlay: {
    position: "absolute",
    top: 58,
    right: 14,
    width: 280,
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    border: "1px solid #bfdbfe",
    borderRadius: 8,
    background: "#fff",
    boxShadow: "0 16px 36px rgba(15, 23, 42, .18)",
    padding: 10,
    color: "#111827"
  },
  calendarQuickHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12 },
  iconButtonMini: {
    border: "1px solid #e5e7eb",
    borderRadius: 7,
    background: "#fff",
    width: 24,
    height: 24,
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer"
  },
  calendarTargetButtons: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 },
  calendarTargetButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "9px 8px",
    font: "inherit",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer"
  },
  calendarTargetButtonActive: { border: "1px solid #2563eb", background: "#2563eb", color: "#fff" },
  calendarMemoInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 76,
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "9px 10px",
    font: "inherit",
    fontSize: 12,
    resize: "vertical"
  },
  calendarQuickMemoInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 54,
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "8px 9px",
    font: "inherit",
    fontSize: 12,
    resize: "vertical"
  },
  settingsStack: { display: "flex", flexDirection: "column", gap: 14, maxWidth: 1180 },
  settingsTabs: { display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: 8 },
  settingsPanel: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 14 },
  settingHint: { color: "#64748b", fontSize: 13, marginTop: -4 },
  configGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 },
  settingsActionRow: { display: "grid", gridTemplateColumns: "minmax(160px, 1fr) minmax(120px, 180px)", gap: 8 },
  classSettingGrid: { display: "grid", gridTemplateColumns: "minmax(180px, 240px)", gap: 10 },
  configField: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },
  configLabel: { fontSize: 12, fontWeight: 900 },
  configInput: { width: "100%", boxSizing: "border-box", border: "1px solid #dbe3ef", borderRadius: 8, padding: "9px 10px", font: "inherit", fontSize: 12 },
  saveButton: { border: 0, borderRadius: 8, background: "#111827", color: "#fff", padding: "10px 12px", fontWeight: 900, cursor: "pointer" },
  rosterActions: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  rosterTextarea: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 160,
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: 11,
    font: "inherit",
    fontSize: 13,
    resize: "vertical"
  },
  settingsMessage: { background: "#eff6ff", color: "#1d4ed8", borderRadius: 8, padding: "9px 10px", fontSize: 13, fontWeight: 800 }
};
