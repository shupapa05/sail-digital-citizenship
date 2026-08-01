import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getClassroomState } from "@/lib/classroom-store";

export const runtime = "nodejs";

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "cache-control": "no-store",
      ...(init?.headers || {})
    }
  });
}

function safeFilenamePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_").trim();
}

function csvEscape(value: string) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

function defaultNeisAppDir() {
  return path.join(
    process.env.USERPROFILE || "C:\\Users\\user",
    "Documents",
    "Codex",
    "2026-05-18",
    "neis 성적입력",
    "성적나이스입력(개인)"
  );
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const res = await fetchWithTimeout("http://127.0.0.1:5055/health", undefined, 1200);
      if (res.ok) return true;
    } catch {
      // The NEIS helper may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return false;
}

async function ensureNeisServer(neisAppDir: string) {
  try {
    const res = await fetchWithTimeout("http://127.0.0.1:5055/health", undefined, 1200);
    if (res.ok) return true;
  } catch {
    // Start below.
  }

  const exePath = path.join(neisAppDir, "NEISGradeInput.exe");
  const appPath = path.join(neisAppDir, "app.py");

  if (existsSync(exePath)) {
    const child = spawn(exePath, [], {
      cwd: neisAppDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  } else if (existsSync(appPath)) {
    const child = spawn("python", [appPath], {
      cwd: neisAppDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
  } else {
    return false;
  }

  return waitForHealth();
}

async function getNeisSaveDir(fallbackSaveDir: string) {
  try {
    const res = await fetchWithTimeout("http://127.0.0.1:5055/health", undefined, 1500);
    if (!res.ok) return fallbackSaveDir;
    const data = await res.json();
    const saveDir = typeof data.saveDir === "string" ? data.saveDir.trim() : "";
    return saveDir || fallbackSaveDir;
  } catch {
    return fallbackSaveDir;
  }
}

async function startNeisInput(filename: string, saveDir: string, neisAppDir: string) {
  const ready = await ensureNeisServer(neisAppDir);
  if (!ready) {
    return json({
      ok: false,
      filename,
      saveDir,
      message: "CSV는 저장했지만 나이스 입력프로그램을 실행하지 못했습니다. NEISGradeInput.exe 위치를 확인해 주세요."
    }, { status: 500 });
  }

  const startRes = await fetchWithTimeout("http://127.0.0.1:5055/start_nice_input", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename })
  }, 5000);
  const payload = await startRes.json().catch(() => ({}));

  if (!startRes.ok) {
    return json({
      ok: false,
      filename,
      saveDir,
      message: payload.message || "나이스 자동입력 시작 요청에 실패했습니다."
    }, { status: startRes.status });
  }

  return json({
    ok: true,
    filename,
    saveDir,
    message: payload.message || `${filename} 나이스 자동입력을 시작했습니다.`
  });
}

export async function POST(req: Request) {
  try {
    const neisAppDir = process.env.SCHOOLTASK_NEIS_APP_DIR?.trim() || defaultNeisAppDir();
    const fallbackSaveDir = process.env.SCHOOLTASK_NICE_DATA_DIR?.trim() || path.join(neisAppDir, "saved_data");
    const ready = await ensureNeisServer(neisAppDir);
    if (!ready) {
      return json({
        ok: false,
        message: "나이스 입력프로그램을 실행하지 못했습니다. NEISGradeInput.exe 위치를 확인해 주세요."
      }, { status: 500 });
    }
    const saveDir = await getNeisSaveDir(fallbackSaveDir);
    mkdirSync(saveDir, { recursive: true });

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return json({ ok: false, message: "불러올 CSV 파일이 없습니다." }, { status: 400 });
      }

      const originalName = safeFilenamePart(file.name || "나이스입력.csv") || "나이스입력.csv";
      const filename = originalName.toLowerCase().endsWith(".csv") ? originalName : `${originalName}.csv`;
      const bytes = Buffer.from(await file.arrayBuffer());
      writeFileSync(path.join(saveDir, filename), bytes);
      return startNeisInput(filename, saveDir, neisAppDir);
    }

    const body = await req.json();
    const itemId = String(body.itemId || "");
    const state = await getClassroomState();
    const item = state.assessmentItems.find((entry) => entry.id === itemId);

    if (!item) {
      return json({ ok: false, message: "나이스로 보낼 수행평가 항목을 찾지 못했습니다." }, { status: 404 });
    }

    const resultMap = new Map(state.assessmentResults.map((result) => [`${result.itemId}:${result.studentId}`, result]));
    const filename = ([item.subject, item.domain, item.unit].map(safeFilenamePart).filter(Boolean).join("_") || "수행평가") + ".csv";
    const rows = [
      ["이름", "성취수준"],
      ...state.students.map((student) => [student.name, resultMap.get(`${item.id}:${student.id}`)?.level || ""])
    ];

    writeFileSync(path.join(saveDir, filename), `\uFEFF${toCsv(rows)}`, "utf8");
    return startNeisInput(filename, saveDir, neisAppDir);
  } catch (error) {
    return json({
      ok: false,
      message: error instanceof Error ? error.message : "나이스 자동입력 연동 중 오류가 발생했습니다."
    }, { status: 500 });
  }
}
