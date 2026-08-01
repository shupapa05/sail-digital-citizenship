import { google } from "googleapis";
import { optionalEnv, requireEnv } from "./env";

export type CalendarEventDto = {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  memo: string;
  calendarId: string;
};

export type CalendarFetchError = {
  calendarId: string;
  error: string;
};

export type CalendarEventsResult = {
  events: CalendarEventDto[];
  errors: CalendarFetchError[];
  calendarIds: string[];
};

function toDateOnly(value: string | null | undefined): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseCalendarIds(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getConfiguredCalendarIds(): string[] {
  const plural = parseCalendarIds(optionalEnv("GOOGLE_CALENDAR_IDS"));
  if (plural.length > 0) return plural;

  const single = optionalEnv("GOOGLE_CALENDAR_ID").trim();
  return single ? [single] : ["primary"];
}

export async function listCalendarEvents(params: {
  calendarId?: string;
  calendarIds?: string[];
  daysPast?: number;
  daysFuture?: number;
}): Promise<CalendarEventsResult> {
  const auth = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI")
  );

  auth.setCredentials({
    refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN")
  });

  const calendar = google.calendar({ version: "v3", auth });
  const calendarIds =
    params.calendarIds && params.calendarIds.length > 0
      ? params.calendarIds
      : params.calendarId
        ? [params.calendarId]
        : getConfiguredCalendarIds();

  const now = new Date();
  const timeMin = new Date(now);
  timeMin.setDate(timeMin.getDate() - (params.daysPast ?? 3));
  const timeMax = new Date(now);
  timeMax.setDate(timeMax.getDate() + (params.daysFuture ?? 30));

  const settled = await Promise.allSettled(
    calendarIds.map(async (calendarId) => {
      const res = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250
      });

      return (res.data.items || []).map((event) => {
        const start = event.start?.date || event.start?.dateTime || "";
        const end = event.end?.date || event.end?.dateTime || "";

        return {
          id: event.id || "",
          title: event.summary || "",
          date: toDateOnly(start),
          start,
          end,
          memo: event.description || "",
          calendarId
        };
      });
    })
  );

  const events: CalendarEventDto[] = [];
  const errors: CalendarFetchError[] = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      events.push(...result.value);
      return;
    }

    errors.push({
      calendarId: calendarIds[index],
      error: result.reason instanceof Error ? result.reason.message : String(result.reason)
    });
  });

  events.sort((a, b) => {
    const dateCompare = a.start.localeCompare(b.start);
    if (dateCompare !== 0) return dateCompare;
    return a.title.localeCompare(b.title);
  });

  return { events, errors, calendarIds };
}

export async function createCalendarEvent(params: {
  calendarId: string;
  title: string;
  date: string;
  memo?: string;
}): Promise<CalendarEventDto> {
  const auth = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI")
  );

  auth.setCredentials({
    refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN")
  });

  const calendar = google.calendar({ version: "v3", auth });
  const startDate = params.date;
  const end = new Date(`${startDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const endDate = end.toISOString().slice(0, 10);

  const res = await calendar.events.insert({
    calendarId: params.calendarId,
    requestBody: {
      summary: params.title,
      description: params.memo || "",
      start: { date: startDate },
      end: { date: endDate }
    }
  });

  const event = res.data;
  const start = event.start?.date || event.start?.dateTime || startDate;
  const eventEnd = event.end?.date || event.end?.dateTime || endDate;

  return {
    id: event.id || "",
    title: event.summary || params.title,
    date: toDateOnly(start),
    start,
    end: eventEnd,
    memo: event.description || "",
    calendarId: params.calendarId
  };
}
