import { google } from "googleapis";
import { requireEnv } from "@/lib/env";

function html(body: string, status = 200) {
  return new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>SchoolTask Google OAuth</title><style>body{font-family:system-ui,sans-serif;margin:40px;line-height:1.6}code,textarea{font-family:ui-monospace,Consolas,monospace}textarea{width:min(760px,100%);height:120px}</style></head><body>${body}</body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return html("<h1>No authorization code</h1><p>Please start the OAuth flow again.</p>", 400);
    }

    const oauth2Client = new google.auth.OAuth2(
      requireEnv("GOOGLE_CLIENT_ID"),
      requireEnv("GOOGLE_CLIENT_SECRET"),
      requireEnv("GOOGLE_REDIRECT_URI")
    );

    const { tokens } = await oauth2Client.getToken(code);
    const refreshToken = tokens.refresh_token;

    if (!refreshToken) {
      return html(
        "<h1>No refresh token returned</h1><p>If this Google account already approved the app, Google may not return a new refresh token. Remove the app from your Google account security settings, then try again.</p>",
        400
      );
    }

    return html(`<h1>Google Calendar token created</h1><p>Put this value into <code>GOOGLE_REFRESH_TOKEN</code>.</p><textarea readonly>${refreshToken}</textarea>`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return html(
      `<h1>OAuth callback failed</h1><p>The Google token exchange failed.</p><pre>${message}</pre><p>Check that <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>, and <code>GOOGLE_REDIRECT_URI</code> match the OAuth client in Google Cloud.</p>`,
      500
    );
  }
}
