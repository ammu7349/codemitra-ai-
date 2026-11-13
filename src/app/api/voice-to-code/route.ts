import { NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

export async function POST(req: Request) {
  try {
    const incomingForm = await req.formData();
    const audioFile = incomingForm.get("audio") as File | null;
    const progLang = (incomingForm.get("language") as string) || "python";
    if (!audioFile) return NextResponse.json({ error: "No audio" }, { status: 400 });

    const sarvamForm = new FormData();
    sarvamForm.append("file", audioFile, "recording.webm");
    sarvamForm.append("model", "saaras:v4");
    sarvamForm.append("mode", "codemix");

    const sttRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": process.env.SARVAM_API_KEY! },
      body: sarvamForm,
    });
    const sttData = await sttRes.json();
    const transcript = sttData.transcript || "";
    if (!transcript) return NextResponse.json({ error: "Could not transcribe" }, { status: 400 });

    const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY! });
    const chatRes = await client.chat.completions({
      model: "sarvam-105b",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `Convert this into runnable ${progLang} code:\n"${transcript}"\nDo NOT use input() or cin—use sample values (like a=5, b=10) and print the output. Return ONLY raw code, no backticks.`,
      }],
    });

    const msg: any = chatRes.choices?.[0]?.message || {};
    let generatedCode = (msg.content || "").replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "").trim();
    return NextResponse.json({ transcript, code: generatedCode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Voice-to-Code failed" }, { status: 500 });
  }
}
