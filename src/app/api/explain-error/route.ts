import { NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

const LANG_MAP: Record<string, { name: string; code: string }> = {
  "kn-IN": { name: "Kannada", code: "kn-IN" },
  "hi-IN": { name: "Hindi", code: "hi-IN" },
  "ta-IN": { name: "Tamil", code: "ta-IN" },
  "te-IN": { name: "Telugu", code: "te-IN" },
  "en-IN": { name: "English", code: "en-IN" },
};

export async function POST(req: Request) {
  try {
    const { code, error, languageCode = "kn-IN" } = await req.json();
    const lang = LANG_MAP[languageCode] || LANG_MAP["kn-IN"];

    const client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY!,
    });

    const prompt = `You are CodeMitra, a friendly coding mentor.
Code:
${code}

Error:
${error || "Review this code and fix any bug."}

Reply in this exact format:
EXPLANATION: <Write 2 simple sentences in ${lang.name} explaining the bug and fix>
FIXED_CODE:
<Write ONLY the complete corrected code here, no markdown backticks>`;

    const chatRes = await client.chat.completions({
      model: "sarvam-105b",
      reasoning_effort: "low",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    } as any);

    const raw = chatRes.choices?.[0]?.message?.content || "";
    let explanation = raw;
    let fixedCode = "";

    if (raw.includes("FIXED_CODE:")) {
      const parts = raw.split("FIXED_CODE:");
      explanation = parts[0].replace("EXPLANATION:", "").trim();
      fixedCode = parts[1].replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "").trim();
    }

    let audioBase64: string | null = null;
    if (explanation) {
      try {
        const ttsRes = await client.textToSpeech.convert({
          text: explanation.slice(0, 500),
          target_language_code: lang.code as any,
          model: "bulbul:v3",
          speaker: "shubh",
        });
        audioBase64 = ttsRes.audios?.[0] || null;
      } catch (ttsErr) {
        console.error("TTS warning:", ttsErr);
      }
    }

    return NextResponse.json({
      explanation: explanation || "No explanation returned.",
      fixedCode,
      audioBase64,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Sarvam AI request failed" },
      { status: 500 }
    );
  }
}
