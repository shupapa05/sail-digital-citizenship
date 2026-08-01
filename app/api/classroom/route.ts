import {
  addMission,
  addPointRecord,
  addSubmissionTask,
  deleteAssessmentItem,
  deleteMission,
  deletePointRecord,
  deleteSubmissionTask,
  getClassroomState,
  replaceStudents,
  replaceAssessmentItems,
  setAssessmentResult,
  setSubmissionArchived,
  setSubmissionCheck,
  updateMission,
  updatePointRecord,
  updateSubmissionTask,
  type PointType
} from "@/lib/classroom-store";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers || {})
    }
  });
}

export async function GET() {
  const state = getClassroomState();
  const totals = state.students.map((student) => {
    const total = state.records
      .filter((record) => record.studentId === student.id)
      .reduce((sum, record) => sum + record.points, 0);
    return { ...student, total };
  });

  return json({
    ok: true,
    students: state.students,
    totals,
    classTotal: state.missions.reduce((sum, mission) => sum + mission.points, 0),
    records: state.records,
    missions: state.missions,
    submissions: state.submissions,
    submissionChecks: state.submissionChecks,
    assessmentItems: state.assessmentItems,
    assessmentResults: state.assessmentResults
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const state = getClassroomState();

    if (body.action === "add-record") {
      const student = state.students.find((item) => item.id === body.studentId);
      if (!student) return json({ ok: false, error: "학생을 찾을 수 없습니다." }, { status: 400 });

      const type = (body.type || "praise") as PointType;
      const points = type === "observation" ? Number(body.points || 0) : Number(body.points || 0);
      if (!Number.isFinite(points)) {
        return json({ ok: false, error: "점수를 입력해 주세요." }, { status: 400 });
      }

      const record = addPointRecord({
        studentId: student.id,
        studentName: student.name,
        type,
        points,
        reason: String(body.reason || "").trim() || "사유 없음",
        actor: String(body.actor || "교사").trim() || "교사"
      });

      return json({ ok: true, record });
    }

    if (body.action === "update-record") {
      const recordId = String(body.recordId || "");
      const type = (body.type || "praise") as PointType;
      const points = Number(body.points || 0);
      const reason = String(body.reason || "").trim() || "사유 없음";
      if (!Number.isFinite(points)) {
        return json({ ok: false, error: "점수를 입력해 주세요." }, { status: 400 });
      }

      const record = updatePointRecord(recordId, { type, points, reason });
      if (!record) return json({ ok: false, error: "점수 기록을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true, record });
    }

    if (body.action === "delete-record") {
      const recordId = String(body.recordId || "");
      const deleted = deletePointRecord(recordId);
      if (!deleted) return json({ ok: false, error: "점수 기록을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true });
    }

    if (body.action === "mission-all") {
      const title = String(body.title || "").trim() || "학급 점수 조정";
      const points = Number(body.points || 0);
      if (!Number.isFinite(points) || points === 0) {
        return json({ ok: false, error: "학급미션 점수를 입력해 주세요." }, { status: 400 });
      }

      const mission = addMission(title, points);
      return json({ ok: true, mission, classTotal: state.missions.reduce((sum, item) => sum + item.points, 0) });
    }

    if (body.action === "update-mission") {
      const missionId = String(body.missionId || "");
      const title = String(body.title || "").trim() || "학급 점수 조정";
      const points = Number(body.points || 0);
      if (!Number.isFinite(points) || points === 0) {
        return json({ ok: false, error: "학급미션 점수를 입력해 주세요." }, { status: 400 });
      }

      const mission = updateMission(missionId, { title, points });
      if (!mission) return json({ ok: false, error: "학급미션 기록을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true, mission });
    }

    if (body.action === "delete-mission") {
      const missionId = String(body.missionId || "");
      const deleted = deleteMission(missionId);
      if (!deleted) return json({ ok: false, error: "학급미션 기록을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true });
    }

    if (body.action === "add-submission") {
      const title = String(body.title || "").trim();
      if (!title) return json({ ok: false, error: "제출 항목을 입력해 주세요." }, { status: 400 });
      return json({ ok: true, submission: addSubmissionTask(title) });
    }

    if (body.action === "update-submission") {
      const taskId = String(body.taskId || "");
      const title = String(body.title || "").trim();
      if (!title) return json({ ok: false, error: "제출 항목 이름을 입력해 주세요." }, { status: 400 });

      const submission = updateSubmissionTask(taskId, title);
      if (!submission) return json({ ok: false, error: "제출 항목을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true, submission });
    }

    if (body.action === "archive-submission") {
      const taskId = String(body.taskId || "");
      const submission = setSubmissionArchived(taskId, Boolean(body.archived));
      if (!submission) return json({ ok: false, error: "제출 항목을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true, submission });
    }

    if (body.action === "delete-submission") {
      const taskId = String(body.taskId || "");
      const deleted = deleteSubmissionTask(taskId);
      if (!deleted) return json({ ok: false, error: "제출 항목을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true });
    }

    if (body.action === "toggle-submission") {
      const task = state.submissions.find((item) => item.id === body.taskId);
      const student = state.students.find((item) => item.id === body.studentId);
      if (!task) return json({ ok: false, error: "제출 항목을 찾을 수 없습니다." }, { status: 400 });
      if (!student) return json({ ok: false, error: "학생을 찾을 수 없습니다." }, { status: 400 });

      const check = setSubmissionCheck({
        taskId: task.id,
        studentId: student.id,
        checked: Boolean(body.checked),
        actor: String(body.actor || "교사").trim() || "교사"
      });

      return json({ ok: true, check });
    }

    if (body.action === "award-submission") {
      const task = state.submissions.find((item) => item.id === body.taskId);
      const points = Number(body.points || 0);
      if (!task) return json({ ok: false, error: "제출 항목을 찾을 수 없습니다." }, { status: 400 });
      if (!Number.isFinite(points) || points === 0) {
        return json({ ok: false, error: "제출 상점을 입력해 주세요." }, { status: 400 });
      }

      const checkedStudentIds = new Set(
        state.submissionChecks
          .filter((item) => item.taskId === task.id && item.checked)
          .map((item) => item.studentId)
      );
      const targets = state.students.filter((student) => checkedStudentIds.has(student.id));
      const records = targets.map((student) =>
        addPointRecord({
          studentId: student.id,
          studentName: student.name,
          type: "submissionAward",
          points,
          reason: `${task.title} 제출`,
          actor: "교사"
        })
      );

      return json({ ok: true, records, count: records.length });
    }

    if (body.action === "update-students") {
      const rows: Array<{ number?: unknown; name?: unknown }> = Array.isArray(body.students) ? body.students : [];
      const students = rows.map((row: { number?: unknown; name?: unknown }) => ({
        number: Number(row.number),
        name: String(row.name || "").trim()
      }));

      if (students.length === 0 || students.some((student: { number: number; name: string }) => !student.number || !student.name)) {
        return json({ ok: false, error: "번호와 이름이 있는 학생 명렬표가 필요합니다." }, { status: 400 });
      }

      return json({ ok: true, students: replaceStudents(students) });
    }

    if (body.action === "save-assessments") {
      const rows: any[] = Array.isArray(body.items) ? body.items : [];
      const items = rows
        .map((item) => ({
          id: String(item.id || ""),
          subject: String(item.subject || "").trim(),
          standard: String(item.standard || "").trim(),
          unit: String(item.unit || "").trim(),
          domain: String(item.domain || "").trim(),
          element: String(item.element || "").trim(),
          method: String(item.method || "").trim(),
          period: String(item.period || "").trim(),
          excellent: String(item.excellent || "").trim(),
          good: String(item.good || "").trim(),
          basic: String(item.basic || "").trim(),
          needsHelp: String(item.needsHelp || "").trim(),
          neisName: String(item.neisName || "").trim(),
          createdAt: String(item.createdAt || "")
        }))
        .filter((item) => item.subject || item.standard || item.unit || item.element);

      return json({ ok: true, assessmentItems: replaceAssessmentItems(items) });
    }

    if (body.action === "delete-assessment") {
      const itemId = String(body.itemId || "");
      const deleted = deleteAssessmentItem(itemId);
      if (!deleted) return json({ ok: false, error: "수행평가 항목을 찾을 수 없습니다." }, { status: 400 });
      return json({ ok: true });
    }

    if (body.action === "set-assessment-result") {
      const item = state.assessmentItems.find((assessment) => assessment.id === body.itemId);
      const student = state.students.find((entry) => entry.id === body.studentId);
      if (!item) return json({ ok: false, error: "수행평가 항목을 찾을 수 없습니다." }, { status: 400 });
      if (!student) return json({ ok: false, error: "학생을 찾을 수 없습니다." }, { status: 400 });

      const result = setAssessmentResult({
        itemId: item.id,
        studentId: student.id,
        level: String(body.level || "").trim(),
        memo: String(body.memo || "").trim()
      });
      return json({ ok: true, result });
    }

    return json({ ok: false, error: "알 수 없는 요청입니다." }, { status: 400 });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
