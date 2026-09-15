"use client";
import { useState } from "react";
import { API_URL } from "@/lib/api";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: "Ask me about Showaib’s education, leadership, experience, projects or technical background." }
  ]);
  const [loading, setLoading] = useState(false);

  async function send(text?: string) {
    const question = (text ?? message).trim();
    if (!question || loading) return;
    setMessage("");
    setMessages(v => [...v, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question }) });
      const json = await res.json();
      setMessages(v => [...v, { role: "assistant", text: json.answer || json.error || "AI assistant is unavailable." }]);
    } catch {
      setMessages(v => [...v, { role: "assistant", text: "The assistant could not connect right now." }]);
    } finally { setLoading(false); }
  }

  return <>
    <button className="chat-fab" onClick={() => setOpen(v => !v)} aria-label="Ask AI about Showaib">AI</button>
    {open && <aside className="chat-panel">
      <div className="chat-head"><div><small>PORTFOLIO ASSISTANT</small><strong>Ask about Showaib</strong></div><button onClick={() => setOpen(false)}>×</button></div>
      <div className="chat-messages">
        {messages.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
        {loading && <div className="chat-msg assistant">Thinking…</div>}
      </div>
      <div className="quick-prompts">
        {['What did he study?','Tell me about his leadership.','What roles is he interested in?'].map(q => <button key={q} onClick={() => send(q)}>{q}</button>)}
      </div>
      <div className="chat-input"><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask a question…"/><button onClick={() => send()}>Send</button></div>
    </aside>}
  </>;
}
