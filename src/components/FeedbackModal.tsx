import { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = ["General", "Bug report", "Feature request", "Diagnosis quality", "UI / UX"];

export function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open || typeof document === "undefined") return null;

  const reset = () => {
    setRating(0);
    setHover(0);
    setCategory("General");
    setMessage("");
  };

  const submit = async () => {
    if (rating < 1) {
      toast.error("Please select a star rating.");
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 5) {
      toast.error("Please write at least a few words of feedback.");
      return;
    }
    if (trimmed.length > 1000) {
      toast.error("Feedback must be under 1000 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        toast.error("Please sign in to submit feedback.");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("feedback").insert({
        user_id: uid,
        rating,
        category,
        message: trimmed,
      });
      if (error) throw error;
      toast.success("Thank you! Your feedback has been sent. 🌿");
      reset();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fb-overlay" onClick={onClose} data-i18n-skip>
      <div className="fb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fb-head">
          <div>
            <h3 className="fb-title">Share your feedback</h3>
            <p className="fb-sub">Help us make LeafRx better for everyone.</p>
          </div>
          <button className="fb-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="fb-body">
          <label className="fb-label">How would you rate your experience?</label>
          <div className="fb-stars" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (hover || rating) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  className={"fb-star" + (active ? " on" : "")}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              );
            })}
          </div>

          <label className="fb-label">Category</label>
          <div className="fb-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={"fb-chip" + (category === c ? " on" : "")}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <label className="fb-label" htmlFor="fb-msg">Your message</label>
          <textarea
            id="fb-msg"
            className="fb-text"
            placeholder="What did you love? What could be better?"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
            rows={5}
            maxLength={1000}
          />
          <div className="fb-count">{message.length}/1000</div>
        </div>

        <div className="fb-foot">
          <button className="fb-btn ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="fb-btn primary" onClick={submit} disabled={submitting}>
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </div>

      <style>{`
        .fb-overlay { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:20px; animation: fbFade .2s ease; }
        @keyframes fbFade { from { opacity:0 } to { opacity:1 } }
        .fb-modal { background:#1a1a1a; border:1px solid #2c2c2c; border-radius:18px; width:100%; max-width:520px; max-height:90vh; overflow:auto; box-shadow:0 20px 60px rgba(0,0,0,.5); animation: fbPop .25s cubic-bezier(.2,.9,.3,1.2); }
        @keyframes fbPop { from { transform:scale(.92); opacity:0 } to { transform:scale(1); opacity:1 } }
        .fb-head { display:flex; justify-content:space-between; align-items:flex-start; padding:22px 22px 8px; gap:12px; }
        .fb-title { color:#fff; font-size:20px; font-weight:700; margin:0 0 4px; font-family:'Nunito','Poppins',sans-serif; }
        .fb-sub { color:#9aa39a; font-size:13px; margin:0; }
        .fb-close { background:transparent; border:none; color:#9aa39a; font-size:28px; line-height:1; cursor:pointer; padding:0 4px; }
        .fb-close:hover { color:#fff; }
        .fb-body { padding:8px 22px 12px; }
        .fb-label { display:block; color:#cfd6cf; font-size:13px; font-weight:600; margin:14px 0 8px; }
        .fb-stars { display:flex; gap:6px; }
        .fb-star { background:transparent; border:none; font-size:34px; color:#3a3a3a; cursor:pointer; transition:transform .15s, color .15s; padding:2px; }
        .fb-star:hover { transform:scale(1.1); }
        .fb-star.on { color:#ffc73a; }
        .fb-cats { display:flex; flex-wrap:wrap; gap:8px; }
        .fb-chip { background:#222; border:1px solid #2f2f2f; color:#cfd6cf; padding:7px 12px; border-radius:999px; font-size:12.5px; cursor:pointer; transition:all .15s; }
        .fb-chip:hover { border-color:#6b8e23; }
        .fb-chip.on { background:#6b8e23; border-color:#6b8e23; color:#fff; }
        .fb-text { width:100%; background:#101010; border:1px solid #2c2c2c; border-radius:12px; color:#fff; padding:12px 14px; font-size:14px; font-family:inherit; resize:vertical; min-height:110px; outline:none; transition:border-color .15s; }
        .fb-text:focus { border-color:#6b8e23; }
        .fb-count { text-align:right; color:#6c7a6c; font-size:11.5px; margin-top:4px; }
        .fb-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 22px 20px; border-top:1px solid #232323; margin-top:6px; }
        .fb-btn { padding:10px 18px; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; border:1px solid transparent; transition:all .15s; font-family:inherit; }
        .fb-btn.ghost { background:transparent; color:#cfd6cf; border-color:#2f2f2f; }
        .fb-btn.ghost:hover { background:#222; }
        .fb-btn.primary { background:linear-gradient(135deg,#6b8e23,#85a830); color:#fff; }
        .fb-btn.primary:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(107,142,35,.4); }
        .fb-btn:disabled { opacity:.6; cursor:not-allowed; transform:none; }
      `}</style>
    </div>,
    document.body,
  );
}
