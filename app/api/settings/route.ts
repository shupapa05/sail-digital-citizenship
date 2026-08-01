import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { z } from "zod";

const settingsSchema = z.object({
  userId: z.string().uuid(),
  spreadsheetUrl: z.string().optional().default(""),
  calendarEmail: z.string().optional().default(""),
  readCalendarIds: z.array(z.string()).optional().default([]),
  csvFolderHint: z.string().optional().default("")
});

export async function POST(req: Request) {
  try {
    const body = settingsSchema.parse(await req.json());
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from("schooltask_teacher_settings")
      .upsert({
        user_id: body.userId,
        spreadsheet_url: body.spreadsheetUrl,
        calendar_email: body.calendarEmail,
        read_calendar_ids: body.readCalendarIds,
        csv_folder_hint: body.csvFolderHint,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return Response.json({ ok: true, settings: data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }
}
