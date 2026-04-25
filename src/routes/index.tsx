import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LeafRxLogo } from "@/components/LeafRxLogo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Always show the buffer for ~1.4s, then send to login first.
    // If a session exists, login route itself will redirect onward to /app.
    const start = Date.now();
    const minDelay = 1400;
    supabase.auth.getSession().then(() => {
      const wait = Math.max(0, minDelay - (Date.now() - start));
      setTimeout(() => {
        navigate({ to: "/login", replace: true });
      }, wait);
    });
  }, [navigate]);

  return (
    <>
      <style>{BOOT_CSS}</style>
      <div className="lrx-boot">
        <div className="lrx-boot-inner">
          <div className="lrx-boot-logo">
            <LeafRxLogo size={108} />
            <div className="lrx-boot-ring" />
            <div className="lrx-boot-ring lrx-boot-ring-2" />
          </div>
          <div className="lrx-boot-wordmark">
            <span className="lrx-boot-leaf">Leaf</span>
            <span className="lrx-boot-rx">Rx</span>
          </div>
          <div className="lrx-boot-tag">Your Plant's Digital Doctor</div>
          <div className="lrx-boot-bar">
            <div className="lrx-boot-bar-fill" />
          </div>
          <div className="lrx-boot-hint">Loading…</div>
        </div>
      </div>
    </>
  );
}

const BOOT_CSS = `
.lrx-boot {
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at center, #1a2e1a 0%, #0e1a0c 60%, #050a04 100%);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Nunito','Poppins',system-ui,sans-serif;
  color: #E0E0E0;
  z-index: 9999;
  animation: lrxBootFade .5s ease both;
}
@keyframes lrxBootFade { from { opacity: 0; } to { opacity: 1; } }
.lrx-boot-inner { display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 0 24px; }
.lrx-boot-logo { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; animation: lrxBootPop .8s cubic-bezier(.34,1.4,.64,1) both; }
@keyframes lrxBootPop { from { transform: scale(.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.lrx-boot-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(127,163,40,.4);
  border-top-color: #7fa328;
  animation: lrxBootSpin 1.4s linear infinite;
}
.lrx-boot-ring-2 {
  inset: -14px;
  border-color: rgba(76,175,80,.18);
  border-top-color: rgba(76,175,80,.7);
  animation-duration: 2.2s;
  animation-direction: reverse;
}
@keyframes lrxBootSpin { to { transform: rotate(360deg); } }
.lrx-boot-wordmark {
  font-weight: 900;
  font-size: 34px;
  letter-spacing: -1px;
  line-height: 1;
  margin-top: 6px;
  animation: lrxBootSlide .7s ease .2s both;
}
.lrx-boot-leaf { color: #ffffff; }
.lrx-boot-rx { color: #5cc85c; }
@keyframes lrxBootSlide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.lrx-boot-tag {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 13px;
  color: #9bb18f;
  letter-spacing: .5px;
  animation: lrxBootSlide .7s ease .35s both;
}
.lrx-boot-bar {
  margin-top: 14px;
  width: min(260px, 70vw);
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  overflow: hidden;
}
.lrx-boot-bar-fill {
  height: 100%;
  width: 40%;
  background: linear-gradient(90deg, #6B8E23, #7fa328, #5cc85c);
  border-radius: 999px;
  animation: lrxBootBar 1.2s ease-in-out infinite;
}
@keyframes lrxBootBar {
  0%   { transform: translateX(-100%); width: 40%; }
  50%  { width: 60%; }
  100% { transform: translateX(260%); width: 40%; }
}
.lrx-boot-hint {
  font-family: 'Open Sans', system-ui, sans-serif;
  font-size: 12px;
  color: #6b7763;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-top: 4px;
  animation: lrxBootPulse 1.4s ease-in-out infinite;
}
@keyframes lrxBootPulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
`;
