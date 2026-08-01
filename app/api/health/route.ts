export async function GET() {
  return Response.json({
    ok: true,
    app: "schooltask-2",
    version: "2.0.0-alpha.1"
  });
}
