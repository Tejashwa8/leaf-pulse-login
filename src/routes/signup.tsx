import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Sign up — LeafRx | AI Plant Disease Detection" },
      { name: "description", content: "Create your free LeafRx account and start diagnosing plant diseases with AI." },
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

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address");
    if (password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: name || email.split("@")[0] },
      },
    });
    setLoading(false);

    if (err) return setError(err.message);
    if (data.session) {
      navigate({ to: "/app" });
    } else {
      // Email confirmation required
      setSent(true);
    }
  };

  return (
    <div className="signup-page">
      <style>{css}</style>
      <div className="card">
        <Link to="/" className="brand">
          <LeafRxWordmark iconSize={36} fontSize={22} />
        </Link>

        {sent ? (
          <>
            <h1>Check your email 📬</h1>
            <p className="sub">
              We sent a confirmation link to <strong style={{ color: "#7fa328" }}>{email}</strong>.
              Click it to verify your account, then come back and sign in.
            </p>
            <Link to="/login" className="link" style={{ display: "block", textAlign: "center", marginTop: 22, padding: "12px", border: "1px solid #2e2e2e", borderRadius: 10 }}>
              ← Back to login
            </Link>
          </>
        ) : (
          <>
            <h1>Create your account</h1>
            <p className="sub">Start diagnosing plant diseases with AI in seconds.</p>

            {error && <div className="err">⚠️ {error}</div>}

            <form onSubmit={handleSubmit}>
              <label>Full name (optional)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Patel" />

              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />

              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />

              <button type="submit" disabled={loading}>
                {loading ? "Creating account…" : "Create account →"}
              </button>
            </form>

            <p className="signin">
              Already have an account?{" "}
              <Link to="/login" className="link">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const css = `
  .signup-page {
    min-height: 100vh;
    background: radial-gradient(ellipse at top, #1a2810 0%, #121212 60%);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    font-family: 'Inter', sans-serif;
    color: #E0E0E0;
  }
  .card {
    width: 100%; max-width: 440px;
    background: #1E1E1E;
    border: 1px solid #2e2e2e;
    border-radius: 20px;
    padding: 40px 36px;
    box-shadow: 0 30px 80px rgba(0,0,0,.55);
    position: relative;
  }
  .card::before {
    content: ''; position: absolute; top: 0; left: 8%; right: 8%; height: 1px;
    background: linear-gradient(90deg, transparent, #7fa328, transparent);
    box-shadow: 0 0 14px rgba(127,163,40,.7);
  }
  .brand {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none; color: #fff;
    font-family: 'Poppins', sans-serif; font-weight: 800; font-size: 22px;
    margin-bottom: 18px; justify-content: center;
  }
  .brand .leaf { font-size: 24px; }
  .brand .rx { color: #4CAF50; }
  h1 {
    font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 24px;
    color: #fff; margin: 0 0 6px; text-align: center;
  }
  .sub { color: #9E9E9E; font-size: 14px; text-align: center; margin: 0 0 22px; }
  .err {
    background: rgba(239,83,80,.1); border: 1px solid rgba(239,83,80,.35);
    color: #ffb4b1; padding: 10px 12px; border-radius: 10px;
    font-size: 13.5px; margin-bottom: 16px;
  }
  label {
    display: block; font-size: 12.5px; font-weight: 600; color: #E0E0E0;
    margin: 12px 0 6px;
  }
  input {
    width: 100%; box-sizing: border-box;
    background: #252525; border: 1px solid #2e2e2e;
    color: #E0E0E0; padding: 12px 14px;
    border-radius: 10px; font-size: 14px;
    font-family: 'Inter', sans-serif;
    transition: all .2s ease;
  }
  input:focus {
    outline: 0; border-color: #6B8E23;
    background: #1e2a10;
    box-shadow: 0 0 0 3px rgba(107,142,35,.15);
  }
  button {
    width: 100%; margin-top: 22px;
    padding: 14px; border: 0; border-radius: 12px;
    background: linear-gradient(135deg, #6B8E23, #7fa328);
    color: #fff; font-family: 'Poppins', sans-serif; font-weight: 700;
    font-size: 15px; cursor: pointer;
    box-shadow: 0 4px 18px rgba(107,142,35,.28);
    transition: transform .2s ease, box-shadow .25s ease, opacity .2s ease;
  }
  button:hover:not(:disabled) {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 8px 28px rgba(107,142,35,.45);
  }
  button:disabled { opacity: .55; cursor: not-allowed; }
  .signin { text-align: center; color: #9E9E9E; font-size: 13.5px; margin: 18px 0 0; }
  .link { color: #7fa328; font-weight: 600; text-decoration: none; }
  .link:hover { text-decoration: underline; }
`;
