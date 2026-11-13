import { NextResponse } from "next/server";
import { SarvamAIClient } from "sarvamai";

export async function POST(req: Request) {
  try {
    const incomingForm = await req.formData();
    const audioFile = incomingForm.get("audio") as File | null;
    const progLang = (incomingForm.get("language") as string) || "python";

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const sarvamForm = new FormData();
    sarvamForm.append("file", audioFile, "recording.webm");
    sarvamForm.append("model", "saaras:v4");
    sarvamForm.append("mode", "codemix");

    const sttRes = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY!,
      },
      body: sarvamForm,
    });

    const sttData = await sttRes.json();
    const transcript = sttData.transcript || "";

    if (!transcript) {
      return NextResponse.json(
        { error: sttData.error?.message || "Could not transcribe audio" },
        { status: 400 }
      );
    }

    const client = new SarvamAIClient({
      apiSubscriptionKey: process.env.SARVAM_API_KEY!,
    });

    const chatRes = await client.chat.completions({
      model: "sarvam-105b",
      reasoning_effort: "low",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Convert this voice instruction into clean, runnable ${progLang} code:\n"${transcript}"\nReturn ONLY the raw ${progLang} code. No markdown backticks.`,
        },
      ],
    } as any);

    let generatedCode = chatRes.choices?.[0]?.message?.content || "";
    generatedCode = generatedCode
      .replace(/```[a-zA-Z]*\n?/g, "")
      .replace(/```/g, "")
      .trim();

    return NextResponse.json({
      transcript,
      code: generatedCode,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Voice-to-Code failed" },
      { status: 500 }
    );
  }
}
