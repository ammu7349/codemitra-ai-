"use client";

import { useState } from "react";
import { Code2, Mic, Volume2, Users, ArrowRight, Sparkles } from "lucide-react";

export default function HomePage() {
  const [roomName, setRoomName] = useState("reva-hack-1");
  const [userName, setUserName] = useState("");

  const handleJoin = () => {
    const cleanRoom = roomName.trim() || "reva-hack-1";
    const cleanUser = userName.trim() || "Developer";
    window.location.href = `/room/${encodeURIComponent(cleanRoom)}?user=${encodeURIComponent(cleanUser)}`;
  };

  return (
    <main className="min-h-screen bg-[#0d1117] text-slate-100 flex flex-col justify-between">
      <nav className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-sky-500/20 border border-sky-500/40 p-2 rounded-lg text-sky-400">
            <Code2 className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">CodeMitra AI</span>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Powered by Sarvam AI
        </span>
      </nav>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-sm font-medium mb-6">
          <Sparkles className="w-4 h-4" />
          Indic-First Collaborative IDE • Kannada • Hindi • Tamil • Telugu
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Code Together. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-purple-400">
            Debug in Your Native Voice.
          </span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10">
          Real-time multi-cursor coding workspace with Kanglish & Hinglish voice-to-code,
          regional compiler error explanations, and spoken AI mentorship.
        </p>

        <div className="max-w-xl mx-auto bg-[#161b22] border border-slate-800 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            className="flex-1 bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room ID"
            className="flex-1 bg-[#0d1117] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={handleJoin}
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
          >
            Start Coding <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 text-left">
          <div className="bg-[#161b22] border border-slate-800 p-6 rounded-2xl">
            <Mic className="w-6 h-6 text-sky-400 mb-3" />
            <h3 className="font-bold text-white mb-1">Codemix Voice-to-Code</h3>
            <p className="text-sm text-slate-400">
              Speak logic in Kannada, Hindi, or Kanglish using Sarvam Saaras v4 and watch runnable code appear.
            </p>
          </div>
          <div className="bg-[#161b22] border border-slate-800 p-6 rounded-2xl">
            <Volume2 className="w-6 h-6 text-purple-400 mb-3" />
            <h3 className="font-bold text-white mb-1">Spoken Error Mentor</h3>
            <p className="text-sm text-slate-400">
              Turns cryptic tracebacks into simple regional voice explanations with a 1-click Apply Fix button.
            </p>
          </div>
          <div className="bg-[#161b22] border border-slate-800 p-6 rounded-2xl">
            <Users className="w-6 h-6 text-emerald-400 mb-3" />
            <h3 className="font-bold text-white mb-1">Live Multi-Cursor Sync</h3>
            <p className="text-sm text-slate-400">
              Edit simultaneously with teammates using CRDT WebSockets with zero overwritten code.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        Built for Build With Sarvam Hackathon • REVA University
      </footer>
    </main>
  );
}
