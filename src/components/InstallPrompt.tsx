import { useEffect, useState } from "react";
import { LeafRxLogo } from "@/components/LeafRxLogo";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "leafrx_install_dismissed_at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

function recentlyDismissed() {
  if (typeof localStorage === "undefined") return false;
  const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!t) return false;
  return Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function InstallPrompt() {
  const [bip, setBip] = useState<BIPEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setBip(e as BIPEvent);
      if (!recentlyDismissed()) setOpen(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
      setShowIosHint(false);
    };
    // Allow any UI (e.g., navbar button) to force-open the banner
    const onForceOpen = () => {
      if (isIOS()) setShowIosHint(true);
      setOpen(true);
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("leafrx:open-install", onForceOpen);

    // iOS has no beforeinstallprompt — show after a short delay (only if not dismissed)
    let iosTimer: ReturnType<typeof setTimeout> | null = null;
    if (isIOS() && !isStandalone() && !recentlyDismissed()) {
      iosTimer = setTimeout(() => {
        setShowIosHint(true);
        setOpen(true);
      }, 2500);
    }

    return () => {
      if (iosTimer) clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("leafrx:open-install", onForceOpen);
    };
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  }

  async function install() {
    if (!bip) return;
    await bip.prompt();
    const choice = await bip.userChoice;
    if (choice.outcome === "accepted") {
      setOpen(false);
      setInstalled(true);
    } else {
      dismiss();
    }
    setBip(null);
  }

  if (installed || (!bip && !showIosHint) || !open) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="ipx-banner" role="dialog" aria-live="polite" aria-label="Install LeafRx">
        <button className="ipx-close" onClick={dismiss} aria-label="Dismiss">✕</button>
        <div className="ipx-icon">
          <LeafRxLogo size={56} />
        </div>
        <div className="ipx-body">
          <div className="ipx-title">Install LeafRx</div>
          {showIosHint ? (
            <div className="ipx-text">
              Tap <span className="ipx-share">⬆︎</span> <strong>Share</strong>, then{" "}
              <strong>Add to Home Screen</strong> to install.
            </div>
          ) : (
            <div className="ipx-text">
              Get the full app experience — works offline-friendly, fullscreen, and one-tap from your
              home screen.
            </div>
          )}
        </div>
        {!showIosHint && bip && (
          <button className="ipx-cta" onClick={install}>
            Install
          </button>
        )}
        {showIosHint && (
          <button className="ipx-cta ipx-cta-ghost" onClick={dismiss}>
            Got it
          </button>
        )}
      </div>
    </>
  );
}

const CSS = `
.ipx-banner {
  position: fixed;
  z-index: 9998;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 14px;
  width: min(560px, calc(100vw - 24px));
  background: linear-gradient(135deg, #1a2e1a 0%, #1e3310 100%);
  border: 1px solid #2e4310;
  border-radius: 18px;
  padding: 14px 16px 14px 14px;
  box-shadow: 0 18px 48px rgba(0,0,0,.55), 0 0 0 1px rgba(76,175,80,.12);
  color: #E0E0E0;
  font-family: 'Open Sans', system-ui, sans-serif;
  animation: ipxIn .45s cubic-bezier(.34,1.2,.64,1) both;
}
@keyframes ipxIn {
  from { opacity: 0; transform: translate(-50%, 24px) scale(.96); }
  to   { opacity: 1; transform: translate(-50%, 0)    scale(1); }
}
.ipx-icon { flex-shrink: 0; display: flex; }
.ipx-body { flex: 1; min-width: 0; }
.ipx-title {
  font-family: 'Nunito','Poppins', sans-serif;
  font-weight: 900;
  font-size: 15px;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 3px;
}
.ipx-text { font-size: 12.5px; line-height: 1.45; color: #b8c5b0; }
.ipx-text strong { color: #fff; font-weight: 700; }
.ipx-share {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px; height: 20px;
  border-radius: 5px;
  background: #4CAF50;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  margin: 0 2px;
  vertical-align: -3px;
}
.ipx-cta {
  flex-shrink: 0;
  background: linear-gradient(135deg, #6B8E23, #7fa328);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 10px 18px;
  font-weight: 700;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all .25s cubic-bezier(.34,1.2,.64,1);
  white-space: nowrap;
}
.ipx-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(107,142,35,.45); }
.ipx-cta-ghost {
  background: transparent;
  border: 1px solid #4CAF50;
  color: #4CAF50;
}
.ipx-cta-ghost:hover { background: rgba(76,175,80,.1); }
.ipx-close {
  position: absolute;
  top: 6px;
  right: 8px;
  background: none;
  border: none;
  color: #6b7763;
  font-size: 14px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: all .2s;
}
.ipx-close:hover { color: #fff; background: rgba(255,255,255,.08); }

/* Phone layout */
@media (max-width: 560px) {
  .ipx-banner {
    left: 12px;
    right: 12px;
    bottom: 12px;
    transform: none;
    width: auto;
    flex-wrap: wrap;
    padding: 14px;
    gap: 10px;
    border-radius: 16px;
  }
  @keyframes ipxIn {
    from { opacity: 0; transform: translateY(24px) scale(.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .ipx-banner { animation-name: ipxIn; }
  .ipx-body { flex: 1 1 calc(100% - 70px); min-width: 0; }
  .ipx-cta { width: 100%; padding: 12px 18px; font-size: 14px; flex: 1 1 100%; }
  .ipx-text { font-size: 12px; }
}
`;
