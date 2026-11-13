import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { code, language = "python" } = await req.json();

    const pistonLangs: Record<string, { language: string; version: string }> = {
      python: { language: "python", version: "3.10.0" },
      javascript: { language: "javascript", version: "18.15.0" },
      cpp: { language: "c++", version: "10.2.0" },
    };
    const cfg = pistonLangs[language] || pistonLangs.python;

    // Try Piston first
    try {
      const pRes = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: cfg.language,
          version: cfg.version,
          files: [{ content: code }],
        }),
      });
      const pData = await pRes.json();
      if (pData.run) {
        return NextResponse.json({
          output: pData.run.stdout || "",
          error: pData.run.stderr || "",
          exitCode: pData.run.code ?? 0,
        });
      }
    } catch {
      // Fall through to Judge0
    }

    // Fallback: Judge0 CE
    const judge0Ids: Record<string, number> = { python: 71, javascript: 63, cpp: 54 };
    const jRes = await fetch(
      "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: judge0Ids[language] || 71,
        }),
      }
    );
    const jData = await jRes.json();
    return NextResponse.json({
      output: jData.stdout || "",
      error: jData.stderr || jData.compile_output || jData.message || "",
      exitCode: jData.status?.id === 3 ? 0 : 1,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Execution failed" },
      { status: 500 }
    );
  }
}
