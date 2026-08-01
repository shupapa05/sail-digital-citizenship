import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type PointType = "observation" | "praise" | "penalty" | "mission" | "submissionAward";

export type Student = {
  id: string;
  number: number;
  name: string;
};

export type PointRecord = {
  id: string;
  studentId: string;
  studentName: string;
  type: PointType;
  points: number;
  reason: string;
  actor: string;
  createdAt: string;
};

export type Mission = {
  id: string;
  title: string;
  points: number;
  createdAt: string;
};

export type SubmissionTask = {
  id: string;
  title: string;
  createdAt: string;
  archivedAt?: string;
};

export type SubmissionCheck = {
  taskId: string;
  studentId: string;
  checked: boolean;
  actor: string;
  updatedAt: string;
};

export type AssessmentItem = {
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
  createdAt: string;
};

export type AssessmentResult = {
  itemId: string;
  studentId: string;
  level: string;
  memo: string;
  updatedAt: string;
};

type ClassroomState = {
  students: Student[];
  records: PointRecord[];
  missions: Mission[];
  submissions: SubmissionTask[];
  submissionChecks: SubmissionCheck[];
  assessmentItems: AssessmentItem[];
  assessmentResults: AssessmentResult[];
};

const defaultStudents: Student[] = [
  { id: "s1", number: 1, name: "민지" },
  { id: "s2", number: 2, name: "서연" },
  { id: "s3", number: 3, name: "지후" },
  { id: "s4", number: 4, name: "하준" },
  { id: "s5", number: 5, name: "윤아" }
];

const globalStore = globalThis as typeof globalThis & {
  schooltaskClassroomState?: ClassroomState;
};

const classroomDataPath = join(process.cwd(), "data", "classroom.json");

function createDefaultState(): ClassroomState {
  return {
    students: defaultStudents,
    records: [
      {
        id: "r1",
        studentId: "s1",
        studentName: "민지",
        type: "praise",
        points: 5,
        reason: "친구 활동을 도와줌",
        actor: "교사",
        createdAt: new Date().toISOString()
      },
      {
        id: "r2",
        studentId: "s2",
        studentName: "서연",
        type: "observation",
        points: 0,
        reason: "발표 참여 관찰",
        actor: "교사",
        createdAt: new Date().toISOString()
      }
    ],
    missions: [],
    submissions: [
      {
        id: "sub-1",
        title: "독서록 제출",
        createdAt: new Date().toISOString()
      }
    ],
    submissionChecks: [
      {
        taskId: "sub-1",
        studentId: "s1",
        checked: true,
        actor: "교사",
        updatedAt: new Date().toISOString()
      }
    ],
    assessmentItems: [],
    assessmentResults: []
  };
}

function normalizeState(state: ClassroomState) {
  state.students ||= defaultStudents;
  state.records ||= [];
  state.missions ||= [];
  state.submissions ||= [];
  state.submissionChecks ||= [];
  state.assessmentItems ||= [];
  state.assessmentResults ||= [];
  return state;
}

function loadStateFromDisk() {
  if (!existsSync(classroomDataPath)) return createDefaultState();
  try {
    return normalizeState(JSON.parse(readFileSync(classroomDataPath, "utf8")) as ClassroomState);
  } catch {
    return createDefaultState();
  }
}

function saveState() {
  const state = getState();
  mkdirSync(dirname(classroomDataPath), { recursive: true });
  writeFileSync(classroomDataPath, JSON.stringify(state, null, 2), "utf8");
}

function getState() {
  if (!globalStore.schooltaskClassroomState) {
    globalStore.schooltaskClassroomState = loadStateFromDisk();
  }

  return normalizeState(globalStore.schooltaskClassroomState);
}

export function getClassroomState() {
  const state = getState();
  if (!existsSync(classroomDataPath)) saveState();
  return state;
}

export function replaceStudents(students: Array<{ number: number; name: string }>) {
  const state = getState();
  const nextStudents = students
    .filter((student) => Number.isFinite(student.number) && student.name.trim())
    .sort((a, b) => a.number - b.number)
    .map((student) => ({
      id: `s-${student.number}`,
      number: student.number,
      name: student.name.trim()
    }));

  const validIds = new Set(nextStudents.map((student) => student.id));
  state.students = nextStudents;
  state.records = state.records.filter((record) => validIds.has(record.studentId));
  state.submissionChecks = state.submissionChecks.filter((check) => validIds.has(check.studentId));
  state.assessmentResults = state.assessmentResults.filter((result) => validIds.has(result.studentId));
  saveState();
  return state.students;
}

export function addPointRecord(input: Omit<PointRecord, "id" | "createdAt">) {
  const state = getState();
  const record: PointRecord = {
    ...input,
    id: `r-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString()
  };
  state.records.unshift(record);
  saveState();
  return record;
}

export function updatePointRecord(recordId: string, input: { points: number; reason: string; type: PointType }) {
  const state = getState();
  const record = state.records.find((item) => item.id === recordId);
  if (!record) return null;

  record.points = input.points;
  record.reason = input.reason;
  record.type = input.type;
  saveState();
  return record;
}

export function deletePointRecord(recordId: string) {
  const state = getState();
  const beforeCount = state.records.length;
  state.records = state.records.filter((item) => item.id !== recordId);
  saveState();
  return state.records.length !== beforeCount;
}

export function addMission(title: string, points: number) {
  const state = getState();
  const mission: Mission = {
    id: `m-${Date.now()}`,
    title,
    points,
    createdAt: new Date().toISOString()
  };
  state.missions.unshift(mission);
  saveState();
  return mission;
}

export function updateMission(missionId: string, input: { title: string; points: number }) {
  const state = getState();
  const mission = state.missions.find((item) => item.id === missionId);
  if (!mission) return null;

  mission.title = input.title;
  mission.points = input.points;
  saveState();
  return mission;
}

export function deleteMission(missionId: string) {
  const state = getState();
  const beforeCount = state.missions.length;
  state.missions = state.missions.filter((item) => item.id !== missionId);
  saveState();
  return state.missions.length !== beforeCount;
}

export function addSubmissionTask(title: string) {
  const state = getState();
  const task: SubmissionTask = {
    id: `sub-${Date.now()}`,
    title,
    createdAt: new Date().toISOString()
  };
  state.submissions.unshift(task);
  saveState();
  return task;
}

export function updateSubmissionTask(taskId: string, title: string) {
  const state = getState();
  const task = state.submissions.find((item) => item.id === taskId);
  if (!task) return null;

  task.title = title;
  saveState();
  return task;
}

export function setSubmissionArchived(taskId: string, archived: boolean) {
  const state = getState();
  const task = state.submissions.find((item) => item.id === taskId);
  if (!task) return null;

  task.archivedAt = archived ? new Date().toISOString() : undefined;
  saveState();
  return task;
}

export function deleteSubmissionTask(taskId: string) {
  const state = getState();
  const beforeCount = state.submissions.length;
  state.submissions = state.submissions.filter((item) => item.id !== taskId);
  state.submissionChecks = state.submissionChecks.filter((item) => item.taskId !== taskId);
  saveState();
  return state.submissions.length !== beforeCount;
}

export function setSubmissionCheck(input: {
  taskId: string;
  studentId: string;
  checked: boolean;
  actor: string;
}) {
  const state = getState();
  const existing = state.submissionChecks.find(
    (item) => item.taskId === input.taskId && item.studentId === input.studentId
  );

  if (existing) {
    existing.checked = input.checked;
    existing.actor = input.actor;
    existing.updatedAt = new Date().toISOString();
    saveState();
    return existing;
  }

  const next: SubmissionCheck = {
    ...input,
    updatedAt: new Date().toISOString()
  };
  state.submissionChecks.push(next);
  saveState();
  return next;
}

export function replaceAssessmentItems(items: Array<Omit<AssessmentItem, "createdAt"> & { createdAt?: string }>) {
  const state = getState();
  const now = new Date().toISOString();
  const nextItems = items.map((item) => ({
    ...item,
    id: item.id || `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: item.createdAt || now
  }));
  const validItemIds = new Set(nextItems.map((item) => item.id));
  state.assessmentItems = nextItems;
  state.assessmentResults = state.assessmentResults.filter((result) => validItemIds.has(result.itemId));
  saveState();
  return state.assessmentItems;
}

export function deleteAssessmentItem(itemId: string) {
  const state = getState();
  const beforeCount = state.assessmentItems.length;
  state.assessmentItems = state.assessmentItems.filter((item) => item.id !== itemId);
  state.assessmentResults = state.assessmentResults.filter((result) => result.itemId !== itemId);
  saveState();
  return state.assessmentItems.length !== beforeCount;
}

export function setAssessmentResult(input: {
  itemId: string;
  studentId: string;
  level: string;
  memo: string;
}) {
  const state = getState();
  const existing = state.assessmentResults.find(
    (result) => result.itemId === input.itemId && result.studentId === input.studentId
  );

  if (existing) {
    existing.level = input.level;
    existing.memo = input.memo;
    existing.updatedAt = new Date().toISOString();
    saveState();
    return existing;
  }

  const next: AssessmentResult = {
    ...input,
    updatedAt: new Date().toISOString()
  };
  state.assessmentResults.push(next);
  saveState();
  return next;
}
