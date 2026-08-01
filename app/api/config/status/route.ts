const requiredServerEnv = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
  "GOOGLE_REFRESH_TOKEN"
];

const optionalServerEnv = [
  "GOOGLE_CALENDAR_ID",
  "GOOGLE_CALENDAR_IDS",
  "SUPABASE_SERVICE_ROLE_KEY"
];

export async function GET() {
  const publicEnv = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
  };

  const missingRequired = requiredServerEnv.filter((key) => !process.env[key]);
  const missingOptional = optionalServerEnv.filter((key) => !process.env[key]);

  return Response.json({
    ok: missingRequired.length === 0,
    publicEnv,
    missingRequired,
    missingOptional,
    calendarReady: missingRequired.length === 0,
    settingsReady: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
}
