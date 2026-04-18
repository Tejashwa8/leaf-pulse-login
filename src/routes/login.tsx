import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Login — LeafRx | AI Plant Disease Detection" },
      {
        name: "description",
        content:
          "Login to LeafRx — AI-powered plant disease detection for farmers. 38+ disease classes, 96.4% accuracy.",
      },
      { property: "og:title", content: "Login — LeafRx" },
      {
        property: "og:description",
        content: "AI-powered plant disease detection platform.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
});

/* LeafRx logo — leaf + midrib veins + stethoscope arc + Rx */
function LeafRxLogo({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="LeafRx logo"
    >
      <defs>
        <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fa328" />
          <stop offset="100%" stopColor="#4CAF50" />
        </linearGradient>
      </defs>
      {/* Leaf */}
      <path
        d="M52 8C28 8 10 22 10 42c0 8 4 14 10 14 18 0 36-16 36-40 0-3-1-6-4-8z"
        fill="url(#leafGrad)"
        opacity="0.95"
      />
      {/* Midrib */}
      <path
        d="M50 12C36 22 24 36 16 54"
        stroke="#0d1f06"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Veins */}
      <path d="M44 18C40 22 38 26 36 30" stroke="#0d1f06" strokeWidth="1" opacity=".55" />
      <path d="M38 24C34 28 32 32 30 36" stroke="#0d1f06" strokeWidth="1" opacity=".55" />
      <path d="M32 30C28 34 26 38 24 42" stroke="#0d1f06" strokeWidth="1" opacity=".55" />
      {/* Stethoscope arc */}
      <path
        d="M14 46c0 6 5 11 11 11s11-5 11-11"
        stroke="#FAF3E0"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="38" cy="46" r="3" fill="#FAF3E0" />
      {/* Rx */}
      <text
        x="44"
        y="58"
        fontFamily="Poppins, sans-serif"
        fontSize="12"
        fontWeight="800"
        fill="#7fa328"
      >
        Rx
      </text>
    </svg>
  );
}

type Toast = { id: number; message: string; type: "success" | "error" | "info" };

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Restore remembered email
  useEffect(() => {
    try {
      const saved = localStorage.getItem("leafrx_remember_email");
      if (saved) {
        setEmail(saved);
        setRemember(true);
      }
    } catch {}
  }, []);

  const pushToast = (message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const onEmailBlur = () => {
    if (!email) return;
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      setEmailValid(false);
    } else {
      setEmailError("");
      setEmailValid(true);
    }
  };

  const onPasswordBlur = () => {
    if (!password) return;
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      setPasswordValid(false);
    } else {
      setPasswordError("");
      setPasswordValid(true);
    }
  };

  const triggerShake = () => {
    // 7-step shake via setInterval per spec
    let step = 0;
    const offsets = [-7, 7, -6, 6, -4, 4, 0];
    const el = cardRef.current;
    if (!el) return;
    setShake(true);
    const id = setInterval(() => {
      if (!el || step >= offsets.length) {
        clearInterval(id);
        if (el) el.style.transform = "";
        setShake(false);
        return;
      }
      el.style.transform = `translateX(${offsets[step]}px)`;
      step++;
    }, 60);
  };

  const handleForgot = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email || !validateEmail(email)) {
      setEmailError("Enter your email first to reset password");
      pushToast("Please enter a valid email first", "error");
      return;
    }
    pushToast(`Reset link sent to ${email}`, "success");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      triggerShake();
      return;
    }
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      triggerShake();
      return;
    }

    setLoading(true);

    /*
     * BACKEND INTEGRATION
     * POST /login
     * Headers: { 'Content-Type': 'application/json' }
     * Body: { email, password }
     * Success -> localStorage.setItem('leafrx_token', data.token)
     * Error   -> show data.message in global error banner
     *
     * Example:
     * const res = await fetch('/login', {
     *   method: 'POST',
     *   headers: { 'Content-Type': 'application/json' },
     *   body: JSON.stringify({ email, password }),
     * });
     * const data = await res.json();
     * if (!res.ok) throw new Error(data.message || 'Login failed');
     * localStorage.setItem('leafrx_token', data.token);
     */

    // Simulated request with demo credentials
    await new Promise((r) => setTimeout(r, 1100));

    const isDemo = email === "demo@leafrx.com" && password === "leafrx123";
    if (!isDemo) {
      setLoading(false);
      setGlobalError("Invalid email or password. Try demo@leafrx.com / leafrx123");
      pushToast("Login failed", "error");
      triggerShake();
      return;
    }

    try {
      localStorage.setItem("leafrx_token", "demo.jwt.token");
      if (remember) localStorage.setItem("leafrx_remember_email", email);
      else localStorage.removeItem("leafrx_remember_email");
    } catch {}

    setLoading(false);
    setSuccess(true);
    pushToast("Welcome back to LeafRx 🌿", "success");
  };

  const canSubmit = email.length > 0 && password.length > 0 && !loading;

  return (
    <>
      <style>{css}</style>

      <div className="leafrx-page">
        {/* LEFT — Brand panel */}
        <aside className="brand-panel">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />

          <div className="brand-inner">
            <div className="brand-top">
              <div className="brand-logo-row">
                <LeafRxLogo size={48} />
                <span className="brand-wordmark">LeafRx</span>
              </div>

              <div className="hero-badge">🌱 AI Plant Health · v2.0</div>

              <h1 className="hero-title">
                Your Plant's <br />
                <span className="hero-title-accent">Digital Doctor</span>
              </h1>

              <p className="hero-desc">
                AI-powered plant disease detection for every farmer. Snap a leaf, get an instant
                diagnosis and treatment plan in seconds.
              </p>

              <div className="feature-pills">
                <div className="pill pill-1">
                  <span className="pill-icon">🔬</span>
                  <span>Deep Learning</span>
                </div>
                <div className="pill pill-2">
                  <span className="pill-icon">💊</span>
                  <span>Instant Prescription</span>
                </div>
                <div className="pill pill-3">
                  <span className="pill-icon">🌾</span>
                  <span>38+ Diseases</span>
                </div>
              </div>
            </div>

            <div className="stats-bar">
              <div className="stat">
                <div className="stat-num">54K+</div>
                <div className="stat-label">Training Images</div>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <div className="stat-num">38</div>
                <div className="stat-label">Disease Classes</div>
              </div>
              <div className="stat-divider" />
              <div className="stat">
                <div className="stat-num">96.4%</div>
                <div className="stat-label">Accuracy</div>
              </div>
            </div>
          </div>

          <div className="panel-edge-glow" />
        </aside>

        {/* RIGHT — Login card */}
        <main className="login-panel">
          <div ref={cardRef} className={`login-card ${shake ? "is-shaking" : ""}`}>
            <div className="card-logo">
              <LeafRxLogo size={36} />
            </div>

            <h2 className="card-title">Welcome Back 👋</h2>
            <p className="card-subtitle">Login to your LeafRx account</p>

            {globalError && (
              <div className="global-error" role="alert">
                <span>⚠️</span>
                <span>{globalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="form-group fade-up delay-1">
                <label htmlFor="email">Email Address</label>
                <div
                  className={`input-wrap ${emailError ? "is-error" : ""} ${
                    emailValid ? "is-valid" : ""
                  }`}
                >
                  <span className="input-icon">✉️</span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                      setEmailValid(false);
                      setGlobalError("");
                    }}
                    onBlur={onEmailBlur}
                  />
                </div>
                {emailError && <div className="field-error">{emailError}</div>}
              </div>

              {/* Password */}
              <div className="form-group fade-up delay-2">
                <label htmlFor="password">Password</label>
                <div
                  className={`input-wrap ${passwordError ? "is-error" : ""} ${
                    passwordValid ? "is-valid" : ""
                  }`}
                >
                  <span className="input-icon">🔒</span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError("");
                      setPasswordValid(false);
                      setGlobalError("");
                    }}
                    onBlur={onPasswordBlur}
                  />
                  <button
                    type="button"
                    className="toggle-pass"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                {passwordError && <div className="field-error">{passwordError}</div>}
              </div>

              {/* Remember + forgot */}
              <div className="form-row fade-up delay-3">
                <label className="remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="check-box" />
                  <span>Remember me</span>
                </label>
                <a href="#" className="forgot" onClick={handleForgot}>
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="login-btn fade-up delay-4"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Login to LeafRx</span>
                )}
              </button>

              <p className="signup-line fade-up delay-5">
                Don't have an account?{" "}
                <a href="#" className="signup-link">
                  Create one free →
                </a>
              </p>

              <p className="demo-hint fade-up delay-5">
                Demo: <code>demo@leafrx.com</code> / <code>leafrx123</code>
              </p>
            </form>

            {/* Success overlay */}
            {success && (
              <div className="success-overlay">
                <div className="success-check">
                  <svg viewBox="0 0 52 52" width="64" height="64">
                    <circle cx="26" cy="26" r="24" fill="none" stroke="#4CAF50" strokeWidth="2" />
                    <path
                      d="M14 27l8 8 16-18"
                      fill="none"
                      stroke="#4CAF50"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="success-title">Welcome back!</div>
                <div className="success-sub">Redirecting to your dashboard…</div>
              </div>
            )}
          </div>
        </main>

        {/* Toasts */}
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span className="toast-dot" />
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* All styles scoped in a <style> tag — preserves the single-file feel */
/* ------------------------------------------------------------------ */
const css = `
  :root {
    --bg: #121212;
    --surface: #1E1E1E;
    --surface-2: #252525;
    --olive: #6B8E23;
    --olive-hover: #7fa328;
    --green: #4CAF50;
    --brown: #8D6E63;
    --beige: #FAF3E0;
    --text: #E0E0E0;
    --muted: #9E9E9E;
    --border: #2e2e2e;
    --error: #ef5350;
  }

  .leafrx-page {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, sans-serif;
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    animation: pageFade .6s ease both;
  }

  @keyframes pageFade { from { opacity: 0 } to { opacity: 1 } }

  /* ---------- LEFT BRAND PANEL ---------- */
  .brand-panel {
    position: relative;
    overflow: hidden;
    padding: 56px 64px;
    background: linear-gradient(145deg, #0d1f06, #121f08, #0a1a10);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    isolation: isolate;
  }
  .brand-panel::before {
    content: '';
    position: absolute; inset: -20%;
    background:
      radial-gradient(40% 35% at 20% 25%, rgba(107,142,35,.35), transparent 60%),
      radial-gradient(35% 30% at 75% 20%, rgba(76,175,80,.25), transparent 65%),
      radial-gradient(45% 40% at 60% 80%, rgba(141,110,99,.22), transparent 65%);
    filter: blur(10px);
    z-index: -2;
    animation: meshPulse 8s ease-in-out infinite alternate;
  }
  .brand-panel::after {
    content: '';
    position: absolute; inset: 0;
    background-image: radial-gradient(rgba(107,142,35,.12) 1.2px, transparent 1.4px);
    background-size: 28px 28px;
    z-index: -1;
    pointer-events: none;
  }
  @keyframes meshPulse {
    0%   { opacity: .8; transform: scale(1); }
    100% { opacity: 1;  transform: scale(1.04); }
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(40px);
    opacity: .55;
    z-index: -1;
    will-change: transform;
  }
  .orb-1 {
    width: 280px; height: 280px; top: -60px; left: -40px;
    background: radial-gradient(circle, rgba(107,142,35,.7), transparent 70%);
    animation: orbFloat 11s ease-in-out infinite;
  }
  .orb-2 {
    width: 220px; height: 220px; bottom: 80px; right: -40px;
    background: radial-gradient(circle, rgba(76,175,80,.55), transparent 70%);
    animation: orbFloat 14s ease-in-out infinite reverse;
  }
  .orb-3 {
    width: 180px; height: 180px; top: 45%; left: 55%;
    background: radial-gradient(circle, rgba(141,110,99,.45), transparent 70%);
    animation: orbFloat 9s ease-in-out infinite;
  }
  @keyframes orbFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50%      { transform: translateY(-20px) scale(1.05); }
  }

  .brand-inner { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 40px; height: 100%; }

  .brand-logo-row {
    display: flex; align-items: center; gap: 12px;
    animation: slideRight .6s ease both;
  }
  .brand-wordmark {
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    font-size: 24px;
    color: #fff;
    letter-spacing: -.5px;
  }

  .hero-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(107,142,35,.15);
    border: 1px solid rgba(107,142,35,.4);
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    color: var(--beige);
    width: fit-content;
    margin-top: 24px;
    animation: badgePop .6s cubic-bezier(.34,1.56,.64,1) both;
    animation-delay: .15s;
  }
  @keyframes badgePop {
    from { opacity: 0; transform: translateY(-8px) scale(.85); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  .hero-title {
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    font-size: clamp(40px, 4.4vw, 60px);
    line-height: 1.05;
    color: #fff;
    margin: 16px 0 0;
    letter-spacing: -1.5px;
    animation: heroTitle .7s cubic-bezier(.22,1,.36,1) both;
    animation-delay: .25s;
  }
  .hero-title-accent {
    background: linear-gradient(120deg, #7fa328, #4CAF50);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  @keyframes heroTitle {
    from { opacity: 0; transform: translateX(-20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideRight {
    from { opacity: 0; transform: translateX(-16px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .hero-desc {
    color: #cfd6c4;
    font-size: 16px;
    line-height: 1.6;
    max-width: 460px;
    animation: slideRight .7s ease both;
    animation-delay: .4s;
  }

  .feature-pills {
    display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;
  }
  .pill {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 14px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 12px;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--beige);
    animation: slideRight .6s ease both;
  }
  .pill-1 { animation-delay: .55s; }
  .pill-2 { animation-delay: .65s; }
  .pill-3 { animation-delay: .75s; }
  .pill-icon { font-size: 16px; }

  .stats-bar {
    display: flex; align-items: center; gap: 18px;
    padding: 20px 24px;
    background: rgba(0,0,0,.3);
    border: 1px solid rgba(107,142,35,.18);
    border-radius: 16px;
    backdrop-filter: blur(6px);
    animation: slideRight .7s ease both;
    animation-delay: .9s;
  }
  .stat { flex: 1; }
  .stat-num {
    font-family: 'Poppins', sans-serif;
    font-weight: 800;
    font-size: 22px;
    color: #fff;
  }
  .stat-label { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .stat-divider { width: 1px; height: 30px; background: rgba(255,255,255,.1); }

  .panel-edge-glow {
    position: absolute;
    top: 10%; bottom: 10%;
    right: -1px; width: 1px;
    background: linear-gradient(180deg, transparent, rgba(107,142,35,.6), transparent);
    box-shadow: 0 0 18px rgba(107,142,35,.5);
    pointer-events: none;
  }

  /* ---------- RIGHT LOGIN PANEL ---------- */
  .login-panel {
    display: flex; align-items: center; justify-content: center;
    padding: 48px 32px;
    position: relative;
  }

  .login-card {
    position: relative;
    width: 100%;
    max-width: 440px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 40px 38px;
    box-shadow: 0 30px 80px rgba(0,0,0,.55);
    animation: cardSlideUp .65s cubic-bezier(.22,1,.36,1) both;
    animation-delay: .2s;
    overflow: hidden;
  }
  @keyframes cardSlideUp {
    from { opacity: 0; transform: translateY(32px) scale(.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .login-card::before {
    content: '';
    position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
    background: linear-gradient(90deg, transparent, var(--olive-hover), transparent);
    box-shadow: 0 0 14px rgba(127,163,40,.7);
  }

  .card-logo { display: flex; justify-content: center; margin-bottom: 14px; }

  .card-title {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 26px;
    color: #fff;
    text-align: center;
    margin: 0 0 6px;
  }
  .card-subtitle {
    text-align: center;
    color: var(--muted);
    font-size: 14px;
    margin: 0 0 26px;
  }

  .global-error {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px;
    background: rgba(239,83,80,.1);
    border: 1px solid rgba(239,83,80,.35);
    border-radius: 10px;
    color: #ffb4b1;
    font-size: 13.5px;
    margin-bottom: 18px;
    animation: fadeUp .35s ease both;
  }

  .form-group { margin-bottom: 16px; }
  .form-group label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
    letter-spacing: .2px;
  }

  .input-wrap {
    position: relative;
    display: flex; align-items: center;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    transition: all .25s ease;
  }
  .input-wrap .input-icon {
    padding-left: 14px;
    font-size: 15px;
    opacity: .8;
  }
  .input-wrap input {
    flex: 1;
    background: transparent;
    border: 0; outline: 0;
    padding: 14px 14px 14px 12px;
    color: var(--text);
    font-family: 'Inter', sans-serif;
    font-size: 14.5px;
  }
  .input-wrap input::placeholder { color: #6e6e6e; }
  .input-wrap:focus-within {
    border-color: var(--olive);
    background: #1e2a10;
    box-shadow: 0 0 0 3px rgba(107,142,35,.15), 0 0 16px rgba(107,142,35,.1);
  }
  .input-wrap.is-error { border-color: var(--error); box-shadow: 0 0 0 3px rgba(239,83,80,.12); }
  .input-wrap.is-valid { border-color: var(--green); }

  .toggle-pass {
    background: transparent;
    border: 0;
    padding: 0 14px;
    font-size: 16px;
    cursor: pointer;
    color: var(--muted);
  }

  .field-error {
    margin-top: 6px;
    color: var(--error);
    font-size: 12.5px;
  }

  .form-row {
    display: flex; align-items: center; justify-content: space-between;
    margin: 6px 0 22px;
  }
  .remember {
    display: inline-flex; align-items: center; gap: 9px;
    font-size: 13.5px;
    color: var(--text);
    cursor: pointer;
    user-select: none;
  }
  .remember input { position: absolute; opacity: 0; pointer-events: none; }
  .check-box {
    width: 18px; height: 18px;
    border-radius: 5px;
    border: 1.5px solid #555;
    background: var(--surface-2);
    display: inline-flex; align-items: center; justify-content: center;
    transition: all .2s ease;
    position: relative;
  }
  .remember input:checked + .check-box {
    background: var(--olive);
    border-color: var(--olive);
    box-shadow: 0 0 0 3px rgba(107,142,35,.18);
  }
  .remember input:checked + .check-box::after {
    content: '';
    width: 5px; height: 9px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
  }

  .forgot {
    font-size: 13px;
    color: var(--olive-hover);
    text-decoration: none;
    font-weight: 500;
  }
  .forgot:hover { text-decoration: underline; }

  .login-btn {
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, var(--olive), var(--olive-hover));
    color: #fff;
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 15px;
    border: 0;
    border-radius: 12px;
    cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    transition: transform .2s ease, box-shadow .25s ease, opacity .2s ease;
    box-shadow: 0 4px 18px rgba(107,142,35,.28);
  }
  .login-btn:hover:not(:disabled) {
    transform: scale(1.03) translateY(-2px);
    box-shadow: 0 8px 28px rgba(107,142,35,.45);
  }
  .login-btn:active:not(:disabled) { transform: scale(.97); }
  .login-btn:disabled { opacity: .55; cursor: not-allowed; }

  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .signup-line {
    margin: 22px 0 0;
    text-align: center;
    font-size: 13.5px;
    color: var(--muted);
  }
  .signup-link {
    color: var(--olive-hover);
    font-weight: 600;
    text-decoration: none;
  }
  .signup-link:hover { text-decoration: underline; }

  .demo-hint {
    margin: 14px 0 0;
    text-align: center;
    font-size: 11.5px;
    color: #707070;
  }
  .demo-hint code {
    background: var(--surface-2);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--beige);
    font-size: 11px;
  }

  /* fade-up stagger */
  .fade-up { animation: fadeUp .55s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .delay-1 { animation-delay: .4s; }
  .delay-2 { animation-delay: .55s; }
  .delay-3 { animation-delay: .7s; }
  .delay-4 { animation-delay: .8s; }
  .delay-5 { animation-delay: .9s; }

  /* Success overlay */
  .success-overlay {
    position: absolute; inset: 0;
    background: rgba(30,30,30,.96);
    backdrop-filter: blur(6px);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px;
    animation: fadeUp .35s ease both;
    border-radius: 20px;
  }
  .success-check {
    width: 88px; height: 88px;
    background: rgba(76,175,80,.12);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    animation: popIn .55s cubic-bezier(.34,1.56,.64,1) both;
  }
  @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .success-title {
    font-family: 'Poppins', sans-serif;
    font-weight: 700;
    font-size: 22px;
    color: #fff;
  }
  .success-sub { color: var(--muted); font-size: 13.5px; }

  /* Toasts */
  .toast-stack {
    position: fixed;
    top: 22px; right: 22px;
    display: flex; flex-direction: column; gap: 10px;
    z-index: 999;
  }
  .toast {
    display: inline-flex; align-items: center; gap: 10px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 16px;
    color: var(--text);
    font-size: 13.5px;
    box-shadow: 0 12px 30px rgba(0,0,0,.45);
    animation: toastIn .45s cubic-bezier(.34,1.56,.64,1) both;
    min-width: 220px;
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(100%); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .toast-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--olive-hover);
  }
  .toast-success .toast-dot { background: var(--green); }
  .toast-error   .toast-dot { background: var(--error); }

  /* Responsive */
  @media (max-width: 860px) {
    .leafrx-page { grid-template-columns: 1fr; }
    .brand-panel { padding: 40px 28px; min-height: auto; }
    .login-panel { padding: 32px 20px; }
    .panel-edge-glow { display: none; }
    .hero-title { font-size: 36px; }
  }
  @media (max-width: 480px) {
    .login-card { padding: 28px 22px; border-radius: 16px; }
    .stats-bar { flex-direction: column; align-items: flex-start; gap: 12px; }
    .stat-divider { display: none; }
    .feature-pills { flex-direction: column; align-items: flex-start; }
  }
`;
