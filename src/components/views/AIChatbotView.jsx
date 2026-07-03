import React, { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = import.meta.env?.VITE_API_BASE || `http://${window.location.hostname === "localhost" ? "127.0.0.1" : window.location.hostname}:3001/api`;
const SESSION  = "default";


// ── Offline HR knowledge base ─────────────────────────────────────────────────
const HR_KB = [
  {
    keys: ["leave balance", "how many leaves", "how many days", "remaining leave", "leave left"],
    reply: "📊 **Leave Balance**: As per policy, full-time employees receive **12 casual leaves**, **15 paid leaves**, and **7 sick leaves** per calendar year. You can check your exact remaining balance in the **Leave Management** tab on the left sidebar.",
  },
  {
    keys: ["apply leave", "request leave", "submit leave", "take leave", "book leave"],
    reply: "📝 **Applying for Leave**: Go to the **Leave Management** tab → click **Request Leave** → fill in the dates, type, and reason → submit for manager approval. Requests are reviewed within 1–2 business days.",
  },
  {
    keys: ["wfh", "work from home", "remote work", "hybrid", "home office"],
    reply: "🏠 **WFH Policy**: Employees can work from home up to **3 days per week** (hybrid model). WFH days must be logged by 9:00 AM. Full-remote roles require manager + HR approval. On-site presence is mandatory on Tuesdays and Thursdays.",
  },
  {
    keys: ["payroll", "salary", "pay day", "payday", "payment date", "when do we get paid"],
    reply: "💰 **Payroll**: Salaries are processed on the **last working day of each month**. Pay slips are emailed by the 25th. For discrepancies, contact payroll@company.com within 5 days of receiving your slip.",
  },
  {
    keys: ["health insurance", "medical insurance", "health benefit", "insurance plan", "medical cover"],
    reply: "🏥 **Health Insurance**: All full-time employees are covered under the **Group Health Plan** — up to ₹5 lakh/year per family. Includes spouse, children, and parents (optional top-up available). Claim via the HR portal or email insurance@company.com.",
  },
  {
    keys: ["performance review", "performance rating", "appraisal", "review cycle", "goals"],
    reply: "📈 **Performance Reviews**: Reviews occur **bi-annually** — in June and December. Ratings range from 1–5. You set goals in Q1/Q3; self-appraisal opens 2 weeks before review. Check the **Performance** tab to see your current goals and ratings.",
  },
  {
    keys: ["onboarding", "new joiner", "joining formalities", "first day", "orientation"],
    reply: "🎉 **Onboarding**: New joiners complete a 3-day orientation covering company culture, tools setup, IT access, and team intros. Documents needed: ID proof, degree certificates, previous pay slips, and PAN card. HR will reach out 3 days before your start date.",
  },
  {
    keys: ["expense", "reimbursement", "claim", "travel expense", "receipt"],
    reply: "🧾 **Expense Reimbursement**: Submit receipts via the HR portal within **30 days** of the expense. Business travel, client meals, and approved equipment are reimbursable. Claims are processed within 10 working days after manager approval.",
  },
  {
    keys: ["resignation", "notice period", "quit", "leaving", "last day"],
    reply: "📋 **Resignation & Notice Period**: Standard notice period is **60 days** for all roles. Submit your resignation via email to your manager CC'd to HR. Notice can be bought out at current CTC. Exit interviews are mandatory and help improve company culture.",
  },
  {
    keys: ["harassment", "posh", "discrimination", "complaint", "misconduct", "grievance"],
    reply: "🛡️ **Grievance & POSH Policy**: PeopleCore has a zero-tolerance policy against harassment. Report concerns to the Internal Complaints Committee (ICC) at icc@company.com or anonymously via the HR portal. All complaints are handled with strict confidentiality.",
  },
  {
    keys: ["overtime", "extra hours", "compensatory off", "comp off", "weekend work"],
    reply: "⏰ **Overtime & Comp-Off**: Working beyond 8 hours or on weekends entitles you to **compensatory leave** (comp-off). Log extra hours in the portal. Comp-off must be availed within 60 days. Monetary overtime is not applicable for salaried employees.",
  },
  {
    keys: ["training", "learning", "course", "upskill", "certification", "l&d"],
    reply: "📚 **Learning & Development**: Employees get an annual **₹20,000 L&D budget** for courses, certifications, and conferences. Apply through the HR portal. Udemy, Coursera, and LinkedIn Learning subscriptions are also provided.",
  },
  {
    keys: ["birthday", "anniversary", "celebration", "work anniversary"],
    reply: "🎂 **Celebrations**: Birthdays and work anniversaries are celebrated monthly in the company all-hands. You'll receive a ₹500 Amazon gift voucher on your birthday and a special recognition letter on your work anniversary!",
  },
  {
    keys: ["office timing", "working hours", "shift", "flexi", "flexible hours"],
    reply: "🕘 **Office Hours**: Core hours are **10:00 AM – 6:00 PM IST**, Monday–Friday. Flexi-hours (8 AM–10 AM start window) are available with manager approval. Night shifts are compensated with a shift allowance.",
  },
  {
    keys: ["probation", "confirmation", "probation period", "trial period"],
    reply: "📌 **Probation Period**: New employees have a **3-month probation period**. Confirmation is based on performance review by your manager and HR. During probation, notice period is 15 days.",
  },
  {
    keys: ["recruitment", "refer", "referral", "job opening", "hiring", "vacancy"],
    reply: "🎯 **Referrals & Jobs**: Check open positions in the **Recruitment** tab. Refer candidates via the referral portal. Successful hires earn you a **₹10,000 referral bonus** after the candidate completes 3 months.",
  },
  {
    keys: ["hello", "hi", "hey", "good morning", "good afternoon", "greetings"],
    reply: "👋 **Hello!** I'm Pep, your Virtual HR Assistant. I can help with leave policies, payslips, WFH rules, performance reviews, insurance, and more. What would you like to know today?",
  },
  {
    keys: ["help", "what can you do", "what do you know", "topics", "menu"],
    reply: "🤖 **I can help with:**\n• 🏖️ Leave balance & applications\n• 🏠 WFH & hybrid policy\n• 💰 Payroll & salary\n• 🏥 Health insurance\n• 📈 Performance & goals\n• 🎯 Recruitment & referrals\n• 📚 Training & L&D budget\n• 🛡️ POSH & grievances\n• 📋 Resignation & notice period\n\nJust ask me anything!",
  },
];

function offlineReply(text) {
  const lower = text.toLowerCase();
  for (const entry of HR_KB) {
    if (entry.keys.some(k => lower.includes(k))) return entry.reply;
  }
  return "🤔 I don't have a specific answer for that right now (offline mode). Please check with your HR team or try again when the server is back online. I can help with **leave, payroll, WFH policy, health insurance, performance reviews**, and more — just ask!";
}

async function simulateTyping(text, onChunk, delayMs = 18) {
  const words = text.split(" ");
  let built = "";
  for (const word of words) {
    built += (built ? " " : "") + word;
    onChunk(built);
    await new Promise(r => setTimeout(r, delayMs));
  }
  return text;
}

// ── Auth helper — always read fresh token from localStorage ──────────────────
function authHeaders() {
  const token = localStorage.getItem("pc_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Time formatter ────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  try {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// ── TTS helper ────────────────────────────────────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate  = 1.05;
  utt.pitch = 1.0;
  const voices    = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /google|natural|premium|samantha|zira/i.test(v.name)) || voices[0];
  if (preferred) utt.voice = preferred;
  window.speechSynthesis.speak(utt);
}

// ── Audio waveform ────────────────────────────────────────────────────────────
function useAudioWaveform(canvasRef, isActive) {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef   = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);

  const startWave = useCallback(async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const ctx      = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.75;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current   = source;

      const canvas = canvasRef.current;
      const draw = () => {
        if (!canvas) return;
        const ctx2d  = canvas.getContext("2d");
        const bufLen = analyser.frequencyBinCount;
        const data   = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);
        const W = canvas.width, H = canvas.height;
        ctx2d.clearRect(0, 0, W, H);
        const barW = (W / bufLen) * 1.8;
        let x = 0;
        for (let i = 0; i < bufLen; i++) {
          const barH = (data[i] / 255) * H * 0.9;
          const hue  = 220 + (data[i] / 255) * 60;
          ctx2d.fillStyle = `hsla(${hue},80%,65%,0.85)`;
          ctx2d.beginPath();
          ctx2d.roundRect(x, H - barH, barW - 2, barH, 3);
          ctx2d.fill();
          x += barW + 1;
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, [canvasRef]);

  const stopWave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    audioCtxRef.current = null; analyserRef.current = null;
    sourceRef.current   = null; streamRef.current   = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }, [canvasRef]);

  useEffect(() => {
    if (isActive) startWave(); else stopWave();
    return () => stopWave();
  }, [isActive, startWave, stopWave]);
}

// ── Welcome message ───────────────────────────────────────────────────────────
const WELCOME = {
  id: "welcome",
  sender: "bot",
  text: "Hello! I'm Pep, your Virtual HR Assistant 🤖 Ask me about leave, WFH policy, payroll, insurance, or anything HR-related!",
  created_at: new Date().toISOString(),
};

// ── Main Component ────────────────────────────────────────────────────────────
function AIChatbotView() {
  const [messages,      setMessages]      = useState([WELCOME]);
  const [inputValue,    setInputValue]    = useState("");
  const [isRecording,   setIsRecording]   = useState(false);
  const [isThinking,    setIsThinking]    = useState(false);
  const [engineInfo,    setEngineInfo]    = useState("checking...");
  const [ttsEnabled,    setTtsEnabled]    = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [serverOnline,  setServerOnline]  = useState(true);

  const messagesEndRef = useRef(null);
  const canvasRef      = useRef(null);
  const recognitionRef = useRef(null);
  const inputRef       = useRef(null);

  useAudioWaveform(canvasRef, isRecording);

  // ── Load chat history + check engine ──────────────────────────────────────
  useEffect(() => {
    // Check server / engine
    fetch(`${API_BASE}/status`)
      .then(r => r.json())
      .then(d => {
        setServerOnline(true);
        setEngineInfo(d.engine === "ollama" ? "🟢 Ollama LLM" : "🟡 Local AI (fallback)");
      })
      .catch(() => {
        setServerOnline(false);
        setEngineInfo("🔴 Server offline");
      });

    // Load chat history (with auth)
    fetch(`${API_BASE}/chat/history?session=${SESSION}`, { headers: authHeaders() })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0) {
          setMessages(rows);
        } else {
          setMessages([WELCOME]);
        }
      })
      .catch(err => {
        console.warn("Chat history load failed:", err.message);
        setMessages([{
          ...WELCOME,
          text: serverOnline
            ? "Hello! I'm Pep 🤖 Chat history unavailable — make sure you're logged in."
            : "Hello! I'm Pep 🤖 (Start the backend: `npm run server`)",
        }]);
      });

    // Pre-load voices for TTS
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const trimmed = (text || inputValue).trim();
    if (!trimmed || isThinking) return;

    setInputValue("");
    setMessages(prev => [...prev, {
      id: `u-${Date.now()}`,
      sender: "user",
      text: trimmed,
      created_at: new Date().toISOString(),
    }]);
    setIsThinking(true);
    setStreamingText("");

    try {
      const res = await fetch(`${API_BASE}/chat/message`, {
        method: "POST",
        headers: authHeaders(),                              // ← auth token included
        body: JSON.stringify({ message: trimmed, session: SESSION }),
      });

      if (res.status === 401) {
        throw new Error("Not authenticated — please log in again.");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Server error ${res.status}`);
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer   = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.token) {
              fullText += payload.token;
              setStreamingText(fullText);
            }
            if (payload.done) {
              const botMsg = {
                id:         `b-${Date.now()}`,
                sender:     "bot",
                text:       payload.full || fullText,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, botMsg]);
              setStreamingText("");
              setIsThinking(false);
              if (ttsEnabled) speakText(botMsg.text);
            }
          } catch { /* partial JSON */ }
        }
      }

      // Safety net: if done event never fired
      if (fullText && isThinking) {
        setMessages(prev => [...prev, {
          id: `b-${Date.now()}`, sender: "bot",
          text: fullText, created_at: new Date().toISOString(),
        }]);
        setStreamingText("");
        setIsThinking(false);
      }

    } catch (err) {
      // If the server is offline, use the local HR knowledge base
      const isOffline = err.message === "Failed to fetch" || err.message?.includes("fetch") || err.message?.includes("NetworkError");
      if (isOffline) {
        setServerOnline(false);
        setEngineInfo("📴 Offline mode");
        const reply = offlineReply(trimmed);
        await simulateTyping(reply, (partial) => setStreamingText(partial));
        const botMsg = {
          id: `b-${Date.now()}`, sender: "bot",
          text: reply, created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, botMsg]);
        setStreamingText("");
        setIsThinking(false);
        if (ttsEnabled) speakText(reply);
      } else {
        console.error("Chat error:", err);
        setMessages(prev => [...prev, {
          id:         `err-${Date.now()}`,
          sender:     "bot",
          text:       `⚠️ ${err.message || "Could not reach the server."}`,
          created_at: new Date().toISOString(),
        }]);
        setStreamingText("");
        setIsThinking(false);
      }
    }
  }, [inputValue, isThinking, ttsEnabled]);

  // ── Voice recognition ─────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported. Use Chrome or Edge."); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInputValue(t);
      if (e.results[e.results.length - 1].isFinal) { setIsRecording(false); handleSend(t); }
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend   = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  }, [handleSend]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  // ── Clear history ─────────────────────────────────────────────────────────
  const clearHistory = async () => {
    try {
      await fetch(`${API_BASE}/chat/history?session=${SESSION}`, {
        method: "DELETE",
        headers: authHeaders(),                              // ← auth token included
      });
    } catch { /* non-critical */ }
    setMessages([{
      ...WELCOME,
      id: `welcome-${Date.now()}`,
      text: "Chat cleared! I'm Pep, ready to help with any HR questions 🤖",
      created_at: new Date().toISOString(),
    }]);
  };

  const templates = [
    {
      icon: "📋",
      title: "Draft Onboarding Checklist",
      desc: "Generate a 5-day schedule & task list for new hires",
      prompt: "Create a comprehensive 5-day onboarding schedule and task checklist for a new senior developer joiner."
    },
    {
      icon: "🏠",
      title: "Draft Hybrid WFH Policy",
      desc: "Create standard expectations and hybrid office rules",
      prompt: "Draft a detailed company policy document outlining expectations, core hours, security, and equipment rules for remote/hybrid employees."
    },
    {
      icon: "📈",
      title: "Appraisal Review Form",
      desc: "Generate evaluation questionnaire metrics",
      prompt: "Generate a performance review template with 5 evaluation metrics, self-appraisal questions, and manager feedback sections."
    },
    {
      icon: "⚠️",
      title: "Draft Warning Notice",
      desc: "Create a formal warning letter template",
      prompt: "Draft a formal, professional HR warning letter template addressing employee attendance issue and detailing next correction steps."
    }
  ];

  const quickReplies = ["WFH Policy", "Leave Balance", "Health Insurance", "Payroll Date", "Security Rules"];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", color: "white", padding: "20px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "var(--text-primary)" }}>Pep — AI HR Assistant</h2>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Engine: {engineInfo}</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => { window.speechSynthesis?.cancel(); setTtsEnabled(v => !v); }}
            title={ttsEnabled ? "Mute bot voice" : "Enable bot voice"}
            style={{
              padding: "7px 13px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
              background: ttsEnabled ? "rgba(0,200,150,0.15)" : "rgba(255,255,255,0.05)",
              color: ttsEnabled ? "#00c896" : "var(--text-muted)",
            }}
          >
            {ttsEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
          </button>
          <button
            onClick={clearHistory}
            style={{
              padding: "7px 13px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer", fontSize: "13px", fontFamily: "inherit",
              background: "rgba(255,255,255,0.05)", color: "var(--text-muted)",
            }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div style={{ display: "flex", gap: "20px", flex: 1, minHeight: 0, flexWrap: "wrap" }}>
        {/* Chat window */}
        <div style={{
          flex: 3, borderRadius: "16px", display: "flex", flexDirection: "column",
          background: "rgba(15,23,42,0.75)", border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden", minHeight: "450px",
        }}>

          {/* Messages list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  padding: "12px 16px",
                  borderRadius: msg.sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  maxWidth: "72%",
                  background: msg.sender === "bot"
                    ? "rgba(255,255,255,0.07)"
                    : "linear-gradient(135deg,#4f8cff,#7b61ff)",
                  color: "white", lineHeight: "1.55", fontSize: "14px", wordBreak: "break-word",
                }}>
                  {msg.text}
                </div>
                {msg.created_at && (
                  <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", paddingInline: "4px" }}>
                    {msg.sender === "bot" ? "🤖 Pep" : "You"} · {formatTime(msg.created_at)}
                  </span>
                )}
              </div>
            ))}

            {/* Streaming bubble */}
            {streamingText && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{
                  padding: "12px 16px", borderRadius: "16px 16px 16px 4px", maxWidth: "72%",
                  background: "rgba(255,255,255,0.07)", color: "white", lineHeight: "1.55", fontSize: "14px",
                }}>
                  {streamingText}
                  <span style={{ display: "inline-block", width: "8px", height: "14px", background: "#7b61ff", marginLeft: "3px", borderRadius: "2px", animation: "pepBlink 0.8s steps(1) infinite" }} />
                </div>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px", paddingInline: "4px" }}>🤖 Pep · typing...</span>
              </div>
            )}

            {/* Thinking dots */}
            {isThinking && !streamingText && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 4px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: "7px", height: "7px", borderRadius: "50%", background: "#7b61ff",
                      animation: `pepBounce 1s ease-in-out ${i * 0.15}s infinite`,
                      display: "inline-block",
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Pep is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Mic waveform */}
          {isRecording && (
            <>
              <div style={{ background: "rgba(0,0,0,0.2)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "4px 0" }}>
                <canvas ref={canvasRef} width={800} height={64} style={{ width: "100%", height: "64px", display: "block" }} />
              </div>
              <div style={{
                textAlign: "center", fontSize: "12px", color: "#ff6b6b", padding: "4px",
                background: "rgba(255,70,70,0.08)", borderBottom: "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff4d4f", display: "inline-block", animation: "pepBlink 1s steps(1) infinite" }} />
                Listening... speak now
              </div>
            </>
          )}

          {/* Quick replies */}
          <div style={{ padding: "10px 16px 0", display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {quickReplies.map(reply => (
              <button
                key={reply}
                onClick={() => handleSend(reply)}
                disabled={isThinking}
                style={{
                  padding: "6px 13px", borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: isThinking ? "not-allowed" : "pointer",
                  background: "rgba(255,255,255,0.05)", color: "white",
                  fontSize: "12px", opacity: isThinking ? 0.5 : 1,
                  transition: "background 0.2s", fontFamily: "inherit",
                }}
                onMouseEnter={e => { if (!isThinking) e.currentTarget.style.background = "rgba(123,97,255,0.25)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Input row */}
          <div style={{ display: "flex", gap: "10px", padding: "14px 16px" }}>
            <input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isRecording ? "Listening..." : "Ask anything about HR policies..."}
              disabled={isThinking}
              style={{
                flex: 1, padding: "13px 16px", borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)", outline: "none",
                background: "rgba(255,255,255,0.06)", color: "white",
                fontSize: "14px", transition: "border-color 0.2s", fontFamily: "inherit",
              }}
              onFocus={e => e.target.style.borderColor = "rgba(123,97,255,0.5)"}
              onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
            />
            <button
              onClick={() => isRecording ? stopRecording() : startRecording()}
              title={isRecording ? "Stop recording" : "Start voice input"}
              style={{
                padding: "13px 16px", borderRadius: "10px", border: "none",
                cursor: "pointer", fontSize: "18px",
                background: isRecording ? "linear-gradient(135deg,#ff4d4f,#c0392b)" : "rgba(123,97,255,0.2)",
                color: "white", transition: "all 0.2s",
                boxShadow: isRecording ? "0 0 12px rgba(255,77,79,0.5)" : "none",
              }}
            >
              {isRecording ? "⏹" : "🎤"}
            </button>
            <button
              onClick={() => handleSend()}
              disabled={isThinking || !inputValue.trim()}
              style={{
                padding: "13px 20px", borderRadius: "10px", border: "none",
                cursor: isThinking || !inputValue.trim() ? "not-allowed" : "pointer",
                background: isThinking || !inputValue.trim()
                  ? "rgba(255,255,255,0.08)"
                  : "linear-gradient(135deg,#4f8cff,#7b61ff)",
                color: "white", fontSize: "14px", fontWeight: "600",
                opacity: isThinking ? 0.7 : 1, transition: "all 0.2s",
                fontFamily: "inherit",
              }}
            >
              {isThinking ? "..." : "Send"}
            </button>
          </div>
        </div>

        {/* Templates Sidebar */}
        <div style={{
          flex: "1 1 260px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: "rgba(15,23,42,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          padding: "20px",
          maxHeight: "100%",
          overflowY: "auto",
        }}>
          <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", margin: 0 }}>
            ⚙️ AI HR Toolbox
          </h4>
          <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
            Click any shortcut to auto-generate structured HR assets and policy drafts.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            {templates.map(t => (
              <div 
                key={t.title}
                onClick={() => {
                  setInputValue(t.prompt);
                  handleSend(t.prompt);
                }}
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--glass-border)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  textAlign: "left"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  e.currentTarget.style.borderColor = "var(--glass-border)";
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "6px" }}>{t.icon}</div>
                <h5 style={{ fontSize: "12px", fontWeight: "600", color: "#fff", margin: 0 }}>{t.title}</h5>
                <p style={{ fontSize: "10px", color: "var(--text-secondary)", marginTop: "4px", lineHeight: "1.3" }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pepBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes pepBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
      `}</style>
    </div>
  );
}

export default AIChatbotView;
