"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import {
  Play,
  Mic,
  Square,
  Sparkles,
  Volume2,
  CheckCircle2,
  Share2,
  Bug,
  Code2,
  Loader2,
} from "lucide-react";

const SAMPLE_BUGS = {
  indexError: {
    label: "Bug 1: IndexError",
    code: `# Buggy shopping cart total calculator
prices = [120, 250, 80]
total = 0

for i in range(4):
    total += prices[i]

print("Total:", total)`,
  },
  recursionError: {
    label: "Bug 2: RecursionError",
    code: `# Buggy factorial calculator
def factorial(n):
    return n * factorial(n - 1)

print("Factorial of 5:", factorial(5))`,
  },
};

export default function RoomPage() {
  const [roomId, setRoomId] = useState("reva-hack-1");
  const [userName, setUserName] = useState("Developer");
  const [progLang, setProgLang] = useState("python");
  const [indicLang, setIndicLang] = useState("kn-IN");
  const [code, setCode] = useState(SAMPLE_BUGS.indexError.code);

  const [output, setOutput] = useState("");
  const [errorOutput, setErrorOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [audioBase64, setAudioBase64] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [copied, setCopied] = useState(false);

  const editorRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const idFromUrl = parts[1] || "reva-hack-1";
    setRoomId(decodeURIComponent(idFromUrl));

    const query = new URLSearchParams(window.location.search);
    const u = query.get("user");
    if (u) setUserName(u);
  }, []);

  const handleEditorDidMount = async (editor: any) => {
    editorRef.current = editor;
    try {
      const Y = await import("yjs");
      const { WebsocketProvider } = await import("y-websocket");

      const parts = window.location.pathname.split("/").filter(Boolean);
      const activeRoom = parts[1] || "reva-hack-1";
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:1234";
      const doc = new Y.Doc();
      const provider = new WebsocketProvider(wsUrl, `codemitra-${activeRoom}`, doc);
      const yText = doc.getText("monaco");

      let isRemoteUpdate = false;
      yText.observe(() => {
        const synced = yText.toString();
        if (editor.getValue() !== synced) {
          isRemoteUpdate = true;
          editor.setValue(synced);
          isRemoteUpdate = false;
        }
      });

      editor.onDidChangeModelContent(() => {
        if (isRemoteUpdate) return;
        const current = editor.getValue();
        if (yText.toString() !== current) {
          doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, current);
          });
        }
      });

      provider.on("status", (event: any) => {
        if (event.status === "connected" && yText.toString() === "" && editor.getValue()) {
          yText.insert(0, editor.getValue());
        }
      });
    } catch {
      // Editor continues working locally if sync server is offline
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput("");
    setErrorOutput("");
    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: progLang }),
      });
      const data = await res.json();
      setOutput(data.output || "");
      setErrorOutput(data.error || "");
    } catch {
      setErrorOutput("Failed to reach code execution server.");
    } finally {
      setIsRunning(false);
    }
  };

  const playAudio = (b64: string) => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(`data:audio/wav;base64,${b64}`);
    audioPlayerRef.current = audio;
    audio.play().catch(() => {});
  };

  const explainWithSarvam = async () => {
    setIsExplaining(true);
    setExplanation("");
    setFixedCode("");
    setAudioBase64(null);
    try {
      const res = await fetch("/api/explain-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          error: errorOutput,
          languageCode: indicLang,
        }),
      });
      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        setFixedCode(data.fixedCode || "");
        if (data.audioBase64) {
          setAudioBase64(data.audioBase64);
          playAudio(data.audioBase64);
        }
      } else {
        setExplanation(data.error || "Could not get explanation.");
      }
    } catch {
      setExplanation("Network error calling Sarvam AI.");
    } finally {
      setIsExplaining(false);
    }
  };

  const applyFix = () => {
    if (!fixedCode) return;
    setCode(fixedCode);
    if (editorRef.current) {
      editorRef.current.setValue(fixedCode);
    }
    setErrorOutput("");
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsTranscribing(true);

        try {
          const formData = new FormData();
          formData.append("audio", blob, "voice.webm");
          formData.append("language", progLang);

          const res = await fetch("/api/voice-to-code", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.transcript) setVoiceTranscript(data.transcript);
          if (data.code) {
            setCode(data.code);
            if (editorRef.current) {
              editorRef.current.setValue(data.code);
            }
          }
        } catch {
          setVoiceTranscript("Voice-to-code request failed.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Please allow microphone access in your browser.");
    }
  };

  const shareRoom = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen bg-[#0d1117] text-slate-100 flex flex-col overflow-hidden">
      <header className="border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 bg-[#161b22]">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-white">
            <Code2 className="w-5 h-5 text-sky-400" />
            <span>CodeMitra AI</span>
          </Link>
          <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            Room: #{roomId}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            ● {userName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setProgLang("python");
              setCode(SAMPLE_BUGS.indexError.code);
              if (editorRef.current) editorRef.current.setValue(SAMPLE_BUGS.indexError.code);
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Bug className="w-3.5 h-3.5" /> {SAMPLE_BUGS.indexError.label}
          </button>

          <button
            onClick={() => {
              setProgLang("python");
              setCode(SAMPLE_BUGS.recursionError.code);
              if (editorRef.current) editorRef.current.setValue(SAMPLE_BUGS.recursionError.code);
            }}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 flex items-center gap-1.5 cursor-pointer"
          >
            <Bug className="w-3.5 h-3.5" /> {SAMPLE_BUGS.recursionError.label}
          </button>

          <select
            value={progLang}
            onChange={(e) => setProgLang(e.target.value)}
            className="text-xs bg-[#0d1117] border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
          </select>

          <button
            onClick={runCode}
            disabled={isRunning}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Code
          </button>

          <button
            onClick={shareRoom}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col border-r border-slate-800 overflow-hidden">
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={progLang}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || "")}
              onMount={handleEditorDidMount}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                padding: { top: 12 },
              }}
            />
          </div>

          <div className="h-44 border-t border-slate-800 bg-[#0b0f14] p-3 overflow-y-auto font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">
                Terminal Output
              </span>
              {errorOutput && (
                <button
                  onClick={explainWithSarvam}
                  className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 px-2.5 py-1 rounded-md text-xs font-sans font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Explain Error in Native Voice
                </button>
              )}
            </div>
            {!output && !errorOutput && (
              <p className="text-slate-600">Click "Run Code" to see output...</p>
            )}
            {output && <pre className="text-emerald-400 whitespace-pre-wrap">{output}</pre>}
            {errorOutput && <pre className="text-rose-400 whitespace-pre-wrap">{errorOutput}</pre>}
          </div>
        </div>

        <aside className="lg:col-span-4 bg-[#161b22] p-4 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 font-bold text-white">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Sarvam AI Co-Pilot</span>
            </div>
            <select
              value={indicLang}
              onChange={(e) => setIndicLang(e.target.value)}
              className="text-xs bg-[#0d1117] border border-slate-700 rounded-lg px-2.5 py-1.5 text-sky-300"
            >
              <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="ta-IN">Tamil (தமிழ்)</option>
              <option value="te-IN">Telugu (తెలుగు)</option>
              <option value="en-IN">English (India)</option>
            </select>
          </div>

          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Voice-to-Code (Saaras v4 Codemix)
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Speak in Kannada, Hindi, Kanglish, or Hinglish to generate code directly in the editor.
            </p>
            <button
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                isRecording
                  ? "bg-rose-500 hover:bg-rose-400 text-white animate-pulse"
                  : "bg-sky-500 hover:bg-sky-400 text-slate-950"
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating Code...
                </>
              ) : isRecording ? (
                <>
                  <Square className="w-4 h-4" /> Stop & Generate Code
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" /> Speak Logic (Mic)
                </>
              )}
            </button>
            {voiceTranscript && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <span className="text-sky-400 font-semibold">Heard: </span>
                "{voiceTranscript}"
              </div>
            )}
          </div>

          <div className="bg-[#0d1117] border border-slate-800 rounded-xl p-4 flex-1 flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Spoken Error Mentor (Sarvam 105B + Bulbul)
            </h3>

            <button
              onClick={explainWithSarvam}
              disabled={isExplaining}
              className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {isExplaining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing with Sarvam...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4" /> Explain & Hear Fix
                </>
              )}
            </button>

            {explanation && (
              <div className="mt-4 space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 leading-relaxed">
                  {explanation}
                </div>

                <div className="flex flex-wrap gap-2">
                  {audioBase64 && (
                    <button
                      onClick={() => playAudio(audioBase64)}
                      className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> Replay Audio
                    </button>
                  )}

                  {fixedCode && (
                    <button
                      onClick={applyFix}
                      className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> 1-Click Apply Fix
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
