import { useEffect, useRef, useState } from "react";
import { LANGUAGES, useLang, type LangCode } from "@/lib/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const [lang, setLang, t] = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className="lang-switch" ref={ref}>
      <style>{CSS}</style>
      <button
        className="lang-trigger"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t("language")}
      >
        <span className="lang-globe" aria-hidden>🌐</span>
        <span className="lang-label">{compact ? current.code.toUpperCase() : current.native}</span>
        <span className="lang-caret">▾</span>
      </button>
      {open && (
        <div className="lang-menu" role="listbox">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              className={`lang-item${l.code === lang ? " active" : ""}`}
              onClick={() => {
                setLang(l.code as LangCode);
                setOpen(false);
              }}
            >
              <span className="lang-native">{l.native}</span>
              <span className="lang-en">{l.label}</span>
              {l.code === lang && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.lang-switch { position:relative; display:inline-block; }
.lang-trigger {
  display:inline-flex; align-items:center; gap:6px;
  background:rgba(255,255,255,.04);
  border:1px solid #2a2a2a;
  color:#E0E0E0;
  border-radius:999px;
  padding:7px 12px;
  font:inherit; font-size:13px; font-weight:600;
  cursor:pointer; transition:all .2s;
  white-space:nowrap;
}
.lang-trigger:hover { border-color:#6B8E23; color:#fff; background:rgba(107,142,35,.12); }
.lang-globe { font-size:14px; }
.lang-caret { font-size:10px; opacity:.7; }
.lang-menu {
  position:absolute; top:calc(100% + 8px); right:0;
  min-width:200px; max-height:340px; overflow-y:auto; overflow-x:hidden;
  background:#1a1a1a; border:1px solid #2a2a2a; border-radius:14px;
  box-shadow:0 18px 40px rgba(0,0,0,.55);
  z-index:120; padding:6px;
  animation:langIn .18s cubic-bezier(.34,1.2,.64,1) both;
  scrollbar-width:thin;
  scrollbar-color:#3a3a3a transparent;
}
.lang-menu::-webkit-scrollbar { width:6px; }
.lang-menu::-webkit-scrollbar-track { background:transparent; }
.lang-menu::-webkit-scrollbar-thumb { background:#3a3a3a; border-radius:3px; }
@keyframes langIn { from{opacity:0; transform:translateY(-6px) scale(.96);} to{opacity:1; transform:none;} }
.lang-item {
  display:flex; align-items:center; gap:10px;
  width:100%; background:transparent; border:none; color:#E0E0E0;
  text-align:left; font:inherit; font-size:13px;
  padding:10px 12px; border-radius:10px; cursor:pointer; transition:all .15s;
}
.lang-item:hover { background:rgba(107,142,35,.12); color:#fff; }
.lang-item.active { background:rgba(76,175,80,.12); color:#5cc85c; }
.lang-native { font-weight:700; flex:1; }
.lang-en { color:#9E9E9E; font-size:11px; }
.lang-check { color:#5cc85c; font-weight:900; }
@media (max-width:600px) {
  .lang-trigger { padding:6px 10px; font-size:12px; }
  .lang-menu {
    position:fixed;
    top:auto;
    left:12px;
    right:12px;
    min-width:0;
    max-height:60vh;
  }
}
`;
