import { useEffect, useRef, useState } from "react";
import { askDrLeafRx, type ChatMessage } from "@/utils/chat.functions";

type Props = { open: boolean; onClose: () => void };

export function DrLeafRxChat({ open, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "👨‍⚕️ Hi, I'm Dr. LeafRx — your plant doctor. Ask me anything about plant diseases, crop care, watering, soil, pests or natural remedies.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { reply } = await askDrLeafRx({
        data: { messages: next.filter((m) => m.role === "user" || m.role === "assistant").slice(-12) },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  const SUGGESTED = [
    "How do I treat tomato early blight?",
    "Best way to prevent fungus on grapes?",
    "How often should I water pepper plants?",
    "Natural remedies for aphids?",
  ];

  if (!open) return null;

  return (
    <div className="drlx-wrap" role="dialog" aria-label="Dr. LeafRx chat">
      <style>{CSS}</style>
      <div className="drlx-card">
        <div className="drlx-head">
          <div className="drlx-avatar">🌿</div>
          <div>
            <div className="drlx-name">Dr. LeafRx</div>
            <div className="drlx-role">Your plant's digital doctor</div>
          </div>
          <button className="drlx-close" onClick={onClose} aria-label="Close chat">✕</button>
        </div>

        <div className="drlx-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`drlx-msg drlx-${m.role}`}>
              <div className="drlx-bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="drlx-msg drlx-assistant">
              <div className="drlx-bubble drlx-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="drlx-suggest">
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>
        )}

        <form
          className="drlx-input"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Dr. LeafRx anything about plants…"
            disabled={loading}
            maxLength={1000}
          />
          <button type="submit" disabled={loading || !input.trim()}>↑</button>
        </form>
      </div>
    </div>
  );
}

const CSS = `
.drlx-wrap { position:fixed; bottom:24px; right:24px; z-index:9998; width:min(380px, calc(100vw - 32px)); max-height:min(620px, calc(100vh - 48px)); animation: drlxIn .3s cubic-bezier(.34,1.2,.64,1) both; }
@keyframes drlxIn { from{opacity:0; transform:translateY(20px) scale(.95);} to{opacity:1;transform:none;} }
.drlx-card { background:#1E1E1E; border:1px solid #2a4010; border-radius:20px; box-shadow:0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(107,142,35,.2); display:flex; flex-direction:column; height:560px; max-height:calc(100vh - 48px); overflow:hidden; font-family:'Open Sans',system-ui,sans-serif; color:#E0E0E0; }
.drlx-head { display:flex; align-items:center; gap:12px; padding:14px 16px; background:linear-gradient(135deg,#1a2810,#1e3310); border-bottom:1px solid #2a4010; }
.drlx-avatar { width:38px; height:38px; border-radius:50%; background:#4CAF50; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 0 0 3px rgba(76,175,80,.2); }
.drlx-name { font-family:'Nunito',sans-serif; font-weight:800; font-size:15px; color:#fff; }
.drlx-role { font-size:11px; color:#9E9E9E; }
.drlx-close { margin-left:auto; background:transparent; border:none; color:#9E9E9E; font-size:18px; cursor:pointer; padding:6px 10px; border-radius:8px; }
.drlx-close:hover { background:rgba(255,255,255,.05); color:#fff; }
.drlx-body { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; scrollbar-width:thin; scrollbar-color:#6B8E23 #1a1a1a; }
.drlx-body::-webkit-scrollbar { width:5px; }
.drlx-body::-webkit-scrollbar-thumb { background:#6B8E23; border-radius:3px; }
.drlx-msg { display:flex; }
.drlx-user { justify-content:flex-end; }
.drlx-assistant { justify-content:flex-start; }
.drlx-bubble { max-width:82%; padding:10px 14px; border-radius:14px; font-size:14px; line-height:1.5; white-space:pre-wrap; word-wrap:break-word; animation: drlxBubble .25s ease both; }
@keyframes drlxBubble { from{opacity:0; transform:translateY(4px);} to{opacity:1;transform:none;} }
.drlx-user .drlx-bubble { background:linear-gradient(135deg,#6B8E23,#7fa328); color:#fff; border-bottom-right-radius:4px; }
.drlx-assistant .drlx-bubble { background:#252525; border:1px solid #2e2e2e; color:#E0E0E0; border-bottom-left-radius:4px; }
.drlx-typing { display:inline-flex; gap:4px; padding:14px; }
.drlx-typing span { width:6px; height:6px; border-radius:50%; background:#6B8E23; animation: drlxBlink 1.2s infinite; }
.drlx-typing span:nth-child(2) { animation-delay:.2s; }
.drlx-typing span:nth-child(3) { animation-delay:.4s; }
@keyframes drlxBlink { 0%,80%,100%{opacity:.3;} 40%{opacity:1;} }
.drlx-suggest { display:flex; flex-wrap:wrap; gap:6px; padding:8px 14px 0; }
.drlx-suggest button { background:#252525; border:1px solid #2e2e2e; color:#9E9E9E; font-size:11px; padding:6px 10px; border-radius:14px; cursor:pointer; font-family:inherit; transition:all .2s; }
.drlx-suggest button:hover { border-color:#6B8E23; color:#E0E0E0; }
.drlx-input { display:flex; gap:8px; padding:12px; border-top:1px solid #2a2a2a; }
.drlx-input input { flex:1; background:#252525; border:1px solid #2e2e2e; border-radius:12px; padding:10px 14px; color:#E0E0E0; font-size:14px; outline:none; font-family:inherit; transition:border-color .2s; }
.drlx-input input:focus { border-color:#6B8E23; }
.drlx-input button { background:linear-gradient(135deg,#6B8E23,#7fa328); color:#fff; border:none; border-radius:12px; width:42px; cursor:pointer; font-size:18px; font-weight:700; transition:all .2s; }
.drlx-input button:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 18px rgba(107,142,35,.4); }
.drlx-input button:disabled { opacity:.5; cursor:not-allowed; }

.drlx-fab { position:fixed; bottom:24px; right:24px; z-index:9997; background:linear-gradient(135deg,#6B8E23,#4CAF50); color:#fff; border:none; border-radius:50%; width:64px; height:64px; padding:0; cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,.4); display:flex; align-items:center; justify-content:center; font-size:28px; transition:transform .2s ease, box-shadow .2s ease; }
.drlx-fab:hover { transform:translateY(-2px) scale(1.05); box-shadow:0 12px 28px rgba(0,0,0,.5); }
`;

export function DrLeafRxFab({ onClick }: { onClick: () => void }) {
  return (
    <>
      <style>{CSS}</style>
      <button className="drlx-fab" onClick={onClick} aria-label="Open Dr. LeafRx chat" title="Ask Dr. LeafRx">
        <span aria-hidden="true">👨‍⚕️</span>
      </button>
    </>
  );
}
