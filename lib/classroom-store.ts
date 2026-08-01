import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { optionalEnv } from "./env";
import { createSupabaseAdmin } from "./supabase-admin";

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

export type ClassroomState = {
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
  schooltaskClassroomStorage?: "supabase" | "disk";
};

const classroomDataPath = join(process.cwd(), "data", "classroom.json");
const classroomWorkspaceKey = optionalEnv("SCHOOLTASK_WORKSPACE_KEY") || "default";

function canUseSupabaseStore() {
  return Boolean(optionalEnv("NEXT_PUBLIC_SUPABASE_URL") && optionalEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

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

async function loadStateFromSupabase() {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("schooltask_classroom_states")
    .select("state")
    .eq("workspace_key", classroomWorkspaceKey)
    .maybeSingle();

  if (error) throw error;
  if (data?.state) return normalizeState(data.state as ClassroomState);

  const state = createDefaultState();
  const { error: insertError } = await supabase
    .from("schooltask_classroom_states")
    .upsert({
      workspace_key: classroomWorkspaceKey,
      state,
      updated_at: new Date().toISOString()
    });

  if (insertError) throw insertError;
  return state;
}

function saveStateToDisk(state: ClassroomState) {
  mkdirSync(dirname(classroomDataPath), { recursive: true });
  writeFileSync(classroomDataPath, JSON.stringify(state, null, 2), "utf8");
}

async function saveState(state: ClassroomState) {
  if (globalStore.schooltaskClassroomStorage === "supabase") {
    const supabase = createSupabaseAdmin();
    const { error } = await supabase
      .from("schooltask_classroom_states")
      .upsert({
        workspace_key: classroomWorkspaceKey,
        state,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    return;
  }

  saveStateToDisk(state);
}

async function getState() {
  if (!globalStore.schooltaskClassroomState) {
    if (canUseSupabaseStore()) {
      try {
        globalStore.schooltaskClassroomState = await loadStateFromSupabase();
        globalStore.schooltaskClassroomStorage = "supabase";
      } catch {
        globalStore.schooltaskClassroomState = loadStateFromDisk();
        globalStore.schooltaskClassroomStorage = "disk";
      }
    } else {
      globalStore.schooltaskClassroomState = loadStateFromDisk();
      globalStore.schooltaskClassroomStorage = "disk";
    }
  }

  return normalizeState(globalStore.schooltaskClassroomState);
}

export async function getClassroomState() {
  const state = await getState();
  if (globalStore.schooltaskClassroomStorage === "disk" && !existsSync(classroomDataPath)) {
    await saveState(state);
  }
  return state;
}

export async function replaceStudents(students: Array<{ number: number; name: string }>) {
  const state = await getState();
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
  await saveState(state);
  return state.students;
}

export async function addPointRecord(input: Omit<PointRecord, "id" | "createdAt">) {
  const state = await getState();
  const record: PointRecord = {
    ...input,
    id: `r-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString()
  };
  state.records.unshift(record);
  await saveState(state);
  return record;
}

export async function updatePointRecord(recordId: string, input: { points: number; reason: string; type: PointType }) {
  const state = await getState();
  const record = state.records.find((item) => item.id === recordId);
  if (!record) return null;

  record.points = input.points;
  record.reason = input.reason;
  record.type = input.type;
  await saveState(state);
  return record;
}

export async function deletePointRecord(recordId: string) {
  const state = await getState();
  const beforeCount = state.records.length;
  state.records = state.records.filter((item) => item.id !== recordId);
  await saveState(state);
  return state.records.length !== beforeCount;
}

export async function addMission(title: string, points: number) {
  const state = await getState();
  const mission: Mission = {
    id: `m-${Date.now()}`,
    title,
    points,
    createdAt: new Date().toISOString()
  };
  state.missions.unshift(mission);
  await saveState(state);
  return mission;
}

export async function updateMission(missionId: string, input: { title: string; points: number }) {
  const state = await getState();
  const mission = state.missions.find((item) => item.id === missionId);
  if (!mission) return null;

  mission.title = input.title;
  mission.points = input.points;
  await saveState(state);
  return mission;
}

export async function deleteMission(missionId: string) {
  const state = await getState();
  const beforeCount = state.missions.length;
  state.missions = state.missions.filter((item) => item.id !== missionId);
  await saveState(state);
  return state.missions.length !== beforeCount;
}

export async function addSubmissionTask(title: string) {
  const state = await getState();
  const task: SubmissionTask = {
    id: `sub-${Date.now()}`,
    title,
    createdAt: new Date().toISOString()
  };
  state.submissions.unshift(task);
  await saveState(state);
  return task;
}

export async function updateSubmissionTask(taskId: string, title: string) {
  const state = await getState();
  const task = state.submissions.find((item) => item.id === taskId);
  if (!task) return null;

  task.title = title;
  await saveState(state);
  return task;
}

export async function setSubmissionArchived(taskId: string, archived: boolean) {
  const state = await getState();
  const task = state.submissions.find((item) => item.id === taskId);
  if (!task) return null;

  task.archivedAt = archived ? new Date().toISOString() : undefined;
  await saveState(state);
  return task;
}

export async function deleteSubmissionTask(taskId: string) {
  const state = await getState();
  const beforeCount = state.submissions.length;
  state.submissions = state.submissions.filter((item) => item.id !== taskId);
  state.submissionChecks = state.submissionChecks.filter((item) => item.taskId !== taskId);
  await saveState(state);
  return state.submissions.length !== beforeCount;
}

export async function setSubmissionCheck(input: {
  taskId: string;
  studentId: string;
  checked: boolean;
  actor: string;
}) {
  const state = await getState();
  const existing = state.submissionChecks.find(
    (item) => item.taskId === input.taskId && item.studentId === input.studentId
  );

  if (existing) {
    existing.checked = input.checked;
    existing.actor = input.actor;
    existing.updatedAt = new Date().toISOString();
    await saveState(state);
    return existing;
  }

  const next: SubmissionCheck = {
    ...input,
    updatedAt: new Date().toISOString()
  };
  state.submissionChecks.push(next);
  await saveState(state);
  return next;
}

export async function replaceAssessmentItems(items: Array<Omit<AssessmentItem, "createdAt"> & { createdAt?: string }>) {
  const state = await getState();
  const now = new Date().toISOString();
  const nextItems = items.map((item) => ({
    ...item,
    id: item.id || `a-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: item.createdAt || now
  }));
  const validItemIds = new Set(nextItems.map((item) => item.id));
  state.assessmentItems = nextItems;
  state.assessmentResults = state.assessmentResults.filter((result) => validItemIds.has(result.itemId));
  await saveState(state);
  return state.assessmentItems;
}

export async function deleteAssessmentItem(itemId: string) {
  const state = await getState();
  const beforeCount = state.assessmentItems.length;
  state.assessmentItems = state.assessmentItems.filter((item) => item.id !== itemId);
  state.assessmentResults = state.assessmentResults.filter((result) => result.itemId !== itemId);
  await saveState(state);
  return state.assessmentItems.length !== beforeCount;
}

export async function setAssessmentResult(input: {
  itemId: string;
  studentId: string;
  level: string;
  memo: string;
}) {
  const state = await getState();
  const existing = state.assessmentResults.find(
    (result) => result.itemId === input.itemId && result.studentId === input.studentId
  );

  if (existing) {
    existing.level = input.level;
    existing.memo = input.memo;
    existing.updatedAt = new Date().toISOString();
    await saveState(state);
    return existing;
  }

  const next: AssessmentResult = {
    ...input,
    updatedAt: new Date().toISOString()
  };
  state.assessmentResults.push(next);
  await saveState(state);
  return next;
}
