import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeafRxLogo, LeafRxWordmark } from "@/components/LeafRxLogo";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset Password — LeafRx" },
      { name: "description", content: "Set a new password for your LeafRx account." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&family=Open+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase parses the recovery hash automatically; just check we have a session
  useEffect(() => {
    // The recovery token in URL hash gets exchanged into a session by supabase-js
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== pw2) return setErr("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return setErr(error.message);
    setOk(true);
    setTimeout(() => navigate({ to: "/login" }), 1500);
  }

  return (
    <div className="rp-page">
      <style>{CSS}</style>
      <div className="rp-card">
        <div className="rp-brand">
          <LeafRxWordmark iconSize={36} fontSize={22} />
        </div>
        <div className="rp-icon"><LeafRxLogo size={56} /></div>
        <h1>Reset your password</h1>
        <p className="rp-sub">Choose a new password for your LeafRx account.</p>

        {!ready && (
          <div className="rp-info">
            ⏳ Validating reset link… If this stays, the link may be expired.
            <Link to="/login" className="rp-link"> Back to login</Link>
          </div>
        )}

        {ready && !ok && (
          <form onSubmit={onSubmit}>
            <label>New password</label>
            <div className="rp-field">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
              <button type="button" className="rp-eye" onClick={() => setShow((s) => !s)}>
                {show ? "🙈" : "👁️"}
              </button>
            </div>

            <label>Confirm password</label>
            <div className="rp-field">
              <input
                type={show ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Re-enter password"
                required
              />
            </div>

            {err && <div className="rp-err">⚠️ {err}</div>}

            <button type="submit" className="rp-submit" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </button>
            <Link to="/login" className="rp-link rp-back">← Back to login</Link>
          </form>
        )}

        {ok && (
          <div className="rp-ok">
            ✅ Password updated! Redirecting to login…
          </div>
        )}
      </div>
    </div>
  );
}

const CSS = `
.rp-page { min-height:100vh; background:#121212; color:#E0E0E0; display:flex; align-items:center; justify-content:center; padding:24px; font-family:'Open Sans',system-ui,sans-serif; }
.rp-card { width:100%; max-width:440px; background:#1E1E1E; border:1px solid #2a2a2a; border-radius:20px; padding:32px; text-align:center; }
.rp-brand { display:flex; justify-content:center; margin-bottom:18px; }
.rp-icon { display:flex; justify-content:center; margin-bottom:14px; }
.rp-card h1 { font-family:'Nunito',sans-serif; font-weight:900; font-size:24px; margin:0 0 6px; }
.rp-sub { color:#9E9E9E; font-size:14px; margin:0 0 22px; }
.rp-card label { display:block; text-align:left; font-size:13px; color:#9E9E9E; margin:12px 0 6px; }
.rp-field { position:relative; }
.rp-field input { width:100%; background:#252525; border:1px solid #2e2e2e; border-radius:12px; padding:12px 44px 12px 14px; color:#E0E0E0; font-size:14px; outline:none; transition:border-color .2s; }
.rp-field input:focus { border-color:#6B8E23; }
.rp-eye { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:none; border:none; color:#9E9E9E; padding:6px 8px; cursor:pointer; }
.rp-err { background:rgba(239,83,80,.1); border:1px solid rgba(239,83,80,.4); color:#ffb4b1; padding:10px 12px; border-radius:10px; font-size:13px; margin-top:14px; text-align:left; }
.rp-info { background:rgba(107,142,35,.08); border:1px solid rgba(107,142,35,.3); color:#b8d27a; padding:14px; border-radius:12px; font-size:13px; }
.rp-ok { background:rgba(76,175,80,.1); border:1px solid rgba(76,175,80,.4); color:#a5d6a7; padding:14px; border-radius:12px; font-size:14px; }
.rp-submit { width:100%; margin-top:20px; padding:14px; background:linear-gradient(135deg,#6B8E23,#7fa328); color:#fff; border:none; border-radius:12px; font-weight:700; font-size:15px; cursor:pointer; transition:all .2s; }
.rp-submit:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 8px 24px rgba(107,142,35,.4); }
.rp-submit:disabled { opacity:.6; cursor:not-allowed; }
.rp-link { color:#4CAF50; text-decoration:none; font-size:13px; }
.rp-link:hover { color:#7fa328; }
.rp-back { display:inline-block; margin-top:14px; }
`;
