"use client";

import { useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  number: number;
  name: string;
  total: number;
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
};

export default function StudentPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionTask[]>([]);
  const [submissionChecks, setSubmissionChecks] = useState<SubmissionCheck[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [points, setPoints] = useState("1");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("제출은 자기 칸을 체크하고, 칭찬 점수는 받을 친구를 선택하세요.");
  const [showPastSubmissions, setShowPastSubmissions] = useState(false);

  useEffect(() => {
    loadClassroom();
  }, []);

  async function loadClassroom() {
    const res = await fetch("/api/classroom", { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) return;
    setStudents(data.totals || []);
    setSubmissions(data.submissions || []);
    setSubmissionChecks(data.submissionChecks || []);
  }

  const allTargetsSelected = students.length > 0 && students.every((student) => selectedIds.includes(student.id));
  const submissionCheckMap = useMemo(() => {
    return new Map(submissionChecks.map((item) => [`${item.taskId}:${item.studentId}`, item]));
  }, [submissionChecks]);
  const sortedSubmissions = useMemo(() => {
    return [...submissions].filter((task) => !task.archivedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [submissions]);
  const latestSubmissions = sortedSubmissions.slice(0, 4);
  const pastSubmissions = sortedSubmissions.slice(4);
  const visibleSubmissions = showPastSubmissions ? sortedSubmissions : latestSubmissions;

  function toggleTarget(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  function toggleAllTargets() {
    setSelectedIds(allTargetsSelected ? [] : students.map((student) => student.id));
  }

  async function toggleSubmission(taskId: string, student: Student, checked: boolean) {
    const res = await fetch("/api/classroom", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "toggle-submission",
        taskId,
        studentId: student.id,
        checked,
        actor: `${student.name} 학생`
      })
    });
    const data = await res.json();
    if (!data.ok) {
      setMessage(data.error || "제출 체크를 저장하지 못했습니다.");
      return;
    }
    setMessage(checked ? `${student.name} 제출 완료로 체크했습니다.` : `${student.name} 제출 체크를 해제했습니다.`);
    await loadClassroom();
  }

  async function submitPraise() {
    const value = Number(points);
    if (selectedIds.length === 0) {
      setMessage("칭찬 점수를 줄 친구를 한 명 이상 선택하세요.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("점수는 1점 이상으로 입력하세요.");
      return;
    }

    const results = await Promise.all(
      selectedIds.map((targetId) =>
        fetch("/api/classroom", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "add-record",
            studentId: targetId,
            type: "praise",
            points: value,
            reason: reason.trim() || "친구 칭찬",
            actor: "학생"
          })
        })
      )
    );

    if (results.some((res) => !res.ok)) {
      setMessage("일부 점수를 기록하지 못했습니다.");
      return;
    }

    const count = selectedIds.length;
    setReason("");
    setSelectedIds([]);
    setMessage(`${count}명에게 칭찬 점수 ${value}점을 보냈습니다.`);
    await loadClassroom();
  }

  return (
    <main style={styles.shell}>
      <section style={styles.panel}>
        <div style={styles.eyebrow}>SchoolTask 2.0 학생용</div>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>제출 확인과 칭찬 점수</h1>
            <p style={styles.help}>모든 학생의 현재 점수를 보고, 여러 명에게 한 번에 칭찬 점수를 줄 수 있습니다.</p>
          </div>
          <button style={styles.secondaryButton} onClick={loadClassroom}>
            새로고침
          </button>
        </header>

        <section style={styles.box}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.h2}>제출 목록</h2>
              <div style={styles.hint}>최신 제출을 먼저 보여줍니다.</div>
            </div>
            {pastSubmissions.length > 0 && (
              <button style={styles.secondaryButton} onClick={() => setShowPastSubmissions((current) => !current)}>
                {showPastSubmissions ? "지난 제출 숨기기" : `지난 제출 ${pastSubmissions.length}개`}
              </button>
            )}
          </div>
          {submissions.length === 0 && <div style={styles.empty}>아직 제출 항목이 없습니다.</div>}
          {submissions.length > 0 && (
            <div style={styles.submissionTableWrap}>
              <table style={styles.submissionTable}>
                <thead>
                  <tr>
                    <th style={styles.studentHead}>학생</th>
                    {visibleSubmissions.map((task) => (
                      <th key={task.id} style={styles.submissionHead}>
                        {task.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td style={styles.studentCell}>
                        {student.number}번 {student.name}
                      </td>
                      {visibleSubmissions.map((task) => {
                        const check = submissionCheckMap.get(`${task.id}:${student.id}`);
                        return (
                          <td key={task.id} style={styles.submissionCell}>
                            <input
                              type="checkbox"
                              checked={Boolean(check?.checked)}
                              onChange={(event) => toggleSubmission(task.id, student, event.target.checked)}
                              style={styles.checkbox}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={styles.box}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.h2}>칭찬 받을 친구</h2>
            <button style={styles.secondaryButton} onClick={toggleAllTargets}>
              {allTargetsSelected ? "전체 해제" : "전체 선택"}
            </button>
          </div>

          <div style={styles.studentGrid}>
            {students.map((student) => {
              const active = selectedIds.includes(student.id);
              return (
                <button
                  key={student.id}
                  style={{ ...styles.studentCard, ...(active ? styles.studentCardActive : {}) }}
                  onClick={() => toggleTarget(student.id)}
                >
                  <span style={styles.studentNo}>{student.number}번</span>
                  <strong>{student.name}</strong>
                  <span style={styles.studentScore}>{student.total}점</span>
                </button>
              );
            })}
          </div>

          <label style={styles.label}>
            점수
            <div style={styles.pointRow}>
              <div style={styles.pointButtons}>
                {["1", "3", "5", "10"].map((value) => (
                  <button
                    key={value}
                    style={{ ...styles.pointButton, ...(points === value ? styles.pointActive : {}) }}
                    onClick={() => setPoints(value)}
                  >
                    +{value}
                  </button>
                ))}
              </div>
              <input
                style={styles.pointInput}
                type="number"
                min="1"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                placeholder="직접"
              />
            </div>
          </label>

          <label style={styles.label}>
            칭찬 이유
            <textarea
              style={{ ...styles.input, minHeight: 82, resize: "vertical" }}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="예: 모둠 활동에서 설명을 잘 도와줬어요."
            />
          </label>

          <button style={styles.submitButton} onClick={submitPraise}>
            선택한 친구에게 보내기
          </button>
        </section>

        <div style={styles.message}>{message}</div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#0f172a",
    display: "grid",
    placeItems: "center",
    padding: 16,
    fontFamily: "system-ui, Malgun Gothic, sans-serif"
  },
  panel: {
    width: "min(980px, 100%)",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 18,
    boxShadow: "0 18px 40px rgba(15, 23, 42, .08)"
  },
  eyebrow: { color: "#2563eb", fontSize: 13, fontWeight: 900 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 },
  h1: { margin: "6px 0 6px", fontSize: 28, lineHeight: 1.2 },
  h2: { margin: 0, fontSize: 17 },
  help: { margin: 0, color: "#64748b", fontSize: 14 },
  hint: { color: "#64748b", fontSize: 12, marginTop: 3 },
  box: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, marginTop: 12, background: "#fbfdff" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 },
  submissionTableWrap: { overflowX: "auto", marginTop: 10 },
  submissionTable: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", background: "#fff" },
  studentHead: { width: 120, textAlign: "left", padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 12 },
  submissionHead: { textAlign: "center", padding: 10, borderBottom: "1px solid #e5e7eb", fontSize: 12 },
  studentCell: { padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900, fontSize: 13 },
  submissionCell: { padding: 8, borderBottom: "1px solid #f1f5f9", textAlign: "center" },
  checkbox: { width: 22, height: 22, cursor: "pointer" },
  empty: { color: "#64748b", fontSize: 13, marginTop: 8 },
  studentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(116px, 1fr))", gap: 8, marginBottom: 12 },
  studentCard: {
    minHeight: 86,
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
    cursor: "pointer",
    font: "inherit",
    textAlign: "left"
  },
  studentCardActive: { borderColor: "#16a34a", background: "#f0fdf4", boxShadow: "inset 0 0 0 2px #16a34a" },
  studentNo: { color: "#64748b", fontSize: 12, fontWeight: 900 },
  studentScore: { color: "#2563eb", fontSize: 12, fontWeight: 900 },
  label: { display: "flex", flexDirection: "column", gap: 7, fontWeight: 900, fontSize: 13, marginBottom: 10 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "11px 12px",
    font: "inherit",
    fontSize: 15,
    background: "#fff"
  },
  pointRow: { display: "grid", gridTemplateColumns: "1fr 110px", gap: 8 },
  pointButtons: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  pointButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "11px 8px",
    fontWeight: 900,
    cursor: "pointer"
  },
  pointActive: { background: "#16a34a", color: "#fff", borderColor: "#16a34a" },
  pointInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    padding: "10px 8px",
    font: "inherit",
    fontWeight: 900,
    textAlign: "center"
  },
  secondaryButton: {
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#fff",
    padding: "8px 10px",
    fontWeight: 900,
    cursor: "pointer"
  },
  submitButton: {
    width: "100%",
    border: 0,
    borderRadius: 8,
    background: "#111827",
    color: "#fff",
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 900,
    cursor: "pointer"
  },
  message: {
    marginTop: 12,
    borderRadius: 8,
    background: "#eff6ff",
    color: "#1d4ed8",
    padding: "11px 12px",
    fontSize: 13,
    fontWeight: 800
  }
};
