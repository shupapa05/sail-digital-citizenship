import { createCalendarEvent, listCalendarEvents } from "@/lib/google-calendar";

const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwHMmVJPPR-dOwuAeJlZudmHBen-UWoSEuQV9ZdRZiB4oKuQWpPNb6BeWsQchiTSthw/exec";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type"
};

type AppsScriptCalendarEvent = {
  id?: string;
  title?: string;
  date?: string;
  start?: string;
  end?: string;
  memo?: string;
  calendarId?: string;
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function splitCalendarIds(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildAppsScriptUrl(params: {
  calendarIds: string[];
  daysPast: number;
  daysFuture: number;
  forceRefresh?: boolean;
}) {
  const url = new URL(APPS_SCRIPT_URL);
  const mail =
    params.calendarIds.find((id) => /@gmail\.com$/i.test(id)) ||
    params.calendarIds.find((id) => !/@(?:group|import)\.calendar\.google\.com$/i.test(id)) ||
    params.calendarIds[0];
  const readIds = params.calendarIds.filter((id) => id !== mail);
  const [cal, tog] = readIds;

  url.searchParams.set("action", "calendarEvents");
  if (mail) url.searchParams.set("mail", mail);
  if (cal) url.searchParams.set("cal", cal);
  if (tog) url.searchParams.set("tog", tog);
  url.searchParams.set("daysPast", String(params.daysPast));
  url.searchParams.set("daysFuture", String(params.daysFuture));
  if (params.forceRefresh) url.searchParams.set("forceRefresh", "1");

  return url;
}

async function listCalendarEventsViaAppsScript(params: {
  calendarIds: string[];
  daysPast: number;
  daysFuture: number;
  forceRefresh?: boolean;
}) {
  if (params.calendarIds.length === 0) throw new Error("Apps Script calendar IDs are empty.");

  const url = buildAppsScriptUrl(params);
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();

  if (!res.ok) throw new Error(`Apps Script failed: ${res.status}`);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Apps Script did not return JSON.");
  }

  const events = Array.isArray(data.events)
    ? data.events.map((event: AppsScriptCalendarEvent) => ({
        id: String(event.id || `${event.calendarId || "apps"}-${event.date || ""}-${event.title || ""}`),
        title: String(event.title || "(제목 없음)"),
        date: String(event.date || ""),
        start: String(event.start || event.date || ""),
        end: String(event.end || event.date || ""),
        memo: String(event.memo || ""),
        calendarId: String(event.calendarId || "")
      }))
    : [];

  return {
    ok: Boolean(data.ok),
    events,
    count: events.length,
    calendarIds: Array.isArray(data.calendarIds) ? data.calendarIds : params.calendarIds,
    errors: Array.isArray(data.errors) ? data.errors : [],
    source: "apps-script"
  };
}

async function createCalendarEventViaAppsScript(params: {
  calendarId: string;
  title: string;
  date: string;
  memo: string;
  category: string;
}) {
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set("action", "calendarAdd");

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params)
  });
  const text = await res.text();

  if (!res.ok) throw new Error(`Apps Script failed: ${res.status}`);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Apps Script did not return JSON.");
  }

  if (!data.ok) throw new Error(data.error || "Apps Script calendar add failed.");
  return data.event;
}

export async function GET(req: Request) {
  const startedAt = Date.now();
  const url = new URL(req.url);
  const calendarId = url.searchParams.get("calendarId") || undefined;
  const calendarIds = splitCalendarIds(url.searchParams.get("calendarIds") || "");
  const daysPast = Number(url.searchParams.get("daysPast") || "3");
  const daysFuture = Number(url.searchParams.get("daysFuture") || "30");
  const normalizedDaysPast = Number.isFinite(daysPast) ? daysPast : 3;
  const normalizedDaysFuture = Number.isFinite(daysFuture) ? daysFuture : 30;
  const forceRefresh = url.searchParams.get("forceRefresh") === "1";

  try {
    const appsScriptResult = await listCalendarEventsViaAppsScript({
      calendarIds: calendarIds.length ? calendarIds : calendarId ? [calendarId] : [],
      daysPast: normalizedDaysPast,
      daysFuture: normalizedDaysFuture,
      forceRefresh
    });

    return Response.json(
      {
        ...appsScriptResult,
        elapsedMs: Date.now() - startedAt,
        generatedAt: new Date().toISOString()
      },
      { headers: corsHeaders }
    );
  } catch (appsScriptError) {
    try {
      const result = await listCalendarEvents({
        calendarId,
        calendarIds,
        daysPast: normalizedDaysPast,
        daysFuture: normalizedDaysFuture
      });

      return Response.json(
        {
          ok: result.errors.length === 0,
          events: result.events,
          count: result.events.length,
          calendarIds: result.calendarIds,
          errors: result.errors,
          fallbackError: appsScriptError instanceof Error ? appsScriptError.message : String(appsScriptError),
          source: "google-api",
          elapsedMs: Date.now() - startedAt,
          generatedAt: new Date().toISOString()
        },
        { headers: corsHeaders }
      );
    } catch (googleError) {
      return Response.json(
        {
          ok: false,
          events: [],
          count: 0,
          calendarIds,
          errors: [
            {
              calendarId: calendarId || calendarIds.join(","),
              error: googleError instanceof Error ? googleError.message : String(googleError)
            }
          ],
          fallbackError: appsScriptError instanceof Error ? appsScriptError.message : String(appsScriptError),
          elapsedMs: Date.now() - startedAt,
          generatedAt: new Date().toISOString()
        },
        { status: 500, headers: corsHeaders }
      );
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const calendarId = String(body.calendarId || "").trim();
    const title = String(body.title || "").trim();
    const date = String(body.date || "").trim();
    const memo = String(body.memo || "").trim();
    const category = String(body.category || "").trim();

    if (!calendarId) {
      return Response.json({ ok: false, error: "캘린더 ID가 필요합니다." }, { status: 400, headers: corsHeaders });
    }
    if (!title) {
      return Response.json({ ok: false, error: "일정 제목이 필요합니다." }, { status: 400, headers: corsHeaders });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ ok: false, error: "일정 날짜가 필요합니다." }, { status: 400, headers: corsHeaders });
    }

    try {
      const event = await createCalendarEventViaAppsScript({ calendarId, title, date, memo, category });
      return Response.json({ ok: true, event, source: "apps-script" }, { headers: corsHeaders });
    } catch (appsScriptError) {
      const event = await createCalendarEvent({ calendarId, title, date, memo });
      return Response.json(
        {
          ok: true,
          event,
          source: "google-api",
          fallbackError: appsScriptError instanceof Error ? appsScriptError.message : String(appsScriptError)
        },
        { headers: corsHeaders }
      );
    }
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
