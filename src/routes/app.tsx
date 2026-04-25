import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LeafRxLogo, LeafRxWordmark } from "@/components/LeafRxLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { diagnoseLeaf, type Diagnosis } from "@/utils/diagnose.functions";
import { DrLeafRxChat, DrLeafRxFab } from "@/components/DrLeafRxChat";

export const Route = createFileRoute("/app")({
  component: AppPage,
  head: () => ({
    meta: [
      { title: "LeafRx — AI-Powered Plant Disease Detection" },
      {
        name: "description",
        content:
          "Scan, diagnose, and cure plant diseases with AI. 38+ disease classes, 96.4% accuracy, instant prescriptions for farmers.",
      },
      { property: "og:title", content: "LeafRx — Your Plant's Digital Doctor" },
      {
        property: "og:description",
        content: "AI prescription for plants. Upload a leaf, get a diagnosis in under a second.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@800;900&family=Open+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
});

/* ---------------- mock data ---------------- */
const MOCK_DIAGNOSES = [
  {
    name: "Tomato — Early Blight",
    conf: 94,
    sev: "Moderate",
    rx: "Apply mancozeb fungicide. Remove infected leaves.",
  },
  {
    name: "Potato — Late Blight",
    conf: 91,
    sev: "Severe",
    rx: "Use chlorothalonil spray. Improve air circulation.",
  },
  {
    name: "Corn — Northern Leaf Blight",
    conf: 88,
    sev: "High",
    rx: "Apply propiconazole. Plant resistant varieties.",
  },
  {
    name: "Wheat — Powdery Mildew",
    conf: 96,
    sev: "Low",
    rx: "Use sulfur-based fungicide. Avoid excess nitrogen.",
  },
];

const SEVERITY_COLOR: Record<string, string> = {
  Severe: "#ef5350",
  High: "#ff7043",
  Moderate: "#ffa726",
  Low: "#66bb6a",
};

const STEPS = [
  { n: "01", icon: "📷", title: "Capture Leaf", text: "Snap or upload a photo of an affected leaf." },
  { n: "02", icon: "⚙️", title: "Preprocess", text: "Resize, normalize, and enhance for the model." },
  { n: "03", icon: "🧠", title: "Smart AI Vision", text: "A multimodal AI model studies the leaf the same way a CNN does — pixel by pixel — to spot disease patterns, lesions and color shifts." },
  { n: "04", icon: "🏷️", title: "Classify", text: "Match against 38+ disease classes with confidence." },
  { n: "05", icon: "💊", title: "Get Rx", text: "Receive a tailored treatment prescription." },
];

// Diseases catalog removed per request — diagnosis still uses live AI results.

const FEATURES = [
  { icon: "⚡", title: "Instant Results", text: "Sub-second inference on any device." },
  { icon: "📱", title: "Any Phone Works", text: "Optimized TFLite models run offline." },
  { icon: "💊", title: "Treatment Prescription", text: "Actionable Rx with dosages & tips." },
  { icon: "💧", title: "Smart Watering", text: "Water early morning at the soil line — never on leaves — to prevent fungal disease." },
  { icon: "🌱", title: "Healthy Soil", text: "Rotate crops every season and add compost to break disease cycles and boost immunity." },
  { icon: "🌾", title: "Multi-Crop Support", text: "Tomato, potato, corn, grape and more." },
];

const METRICS = [
  { label: "Training Accuracy", value: 98 },
  { label: "Validation Accuracy", value: 96 },
  { label: "Test Accuracy", value: 95 },
  { label: "Precision", value: 94 },
  { label: "Recall", value: 93 },
];

const SAFETY_TIPS = [
  {
    icon: "🍃",
    title: "Inspect Weekly",
    text: "Walk your field once a week and check the underside of leaves — most diseases show there first, before any visible damage on top.",
  },
  {
    icon: "💧",
    title: "Water at the Roots",
    text: "Water early morning at the soil line — never on leaves. Wet foliage overnight is the #1 cause of fungal outbreaks.",
  },
  {
    icon: "🔄",
    title: "Rotate Your Crops",
    text: "Never plant the same crop family in the same spot two seasons in a row. Rotation breaks pest and disease cycles naturally.",
  },
  {
    icon: "✂️",
    title: "Prune & Remove",
    text: "Cut and BURN infected leaves immediately. Don't compost them — spores survive and re-infect next season.",
  },
  {
    icon: "🌾",
    title: "Mulch the Soil",
    text: "A 2-inch mulch layer stops soil-borne spores from splashing onto leaves during rain or irrigation.",
  },
  {
    icon: "🧪",
    title: "Test, Don't Guess",
    text: "Scan a leaf with LeafRx before reaching for chemicals. Targeted treatment saves money and protects pollinators.",
  },
];

// Tech stack catalog removed per request.

/* ---------------- component ---------------- */
type HistoryRow = {
  id: string;
  image_url: string;
  disease_name: string;
  severity: string;
  confidence: number;
  rx: string;
  created_at: string;
  signed_url?: string;
};

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const ext = mime.split("/")[1]?.split("+")[0] || "jpg";
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return { blob: new Blob([arr], { type: mime }), ext };
}

function AppPage() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagError, setDiagError] = useState<string | null>(null);
  const [confFill, setConfFill] = useState(0);
  const [statCount, setStatCount] = useState(0);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySev, setHistorySev] = useState<"All" | "Severe" | "High" | "Moderate" | "Low">("All");
  const [historySort, setHistorySort] = useState<"newest" | "oldest">("newest");
  const [activeHistory, setActiveHistory] = useState<HistoryRow | null>(null);
  const [historyMenuOpen, setHistoryMenuOpen] = useState(false);
  const [historyAllOpen, setHistoryAllOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [installState, setInstallState] = useState<"available" | "installed" | "unsupported">("unsupported");
  const [, , t] = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const countedRef = useRef(false);

  // Close history dropdown on outside click
  useEffect(() => {
    if (!historyMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".hx-dropdown-wrap")) setHistoryMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [historyMenuOpen]);

  // Camera lifecycle
  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    setCameraError(null);
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (err) {
        setCameraError(
          err instanceof Error && err.name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access or use Upload instead."
            : "Could not start camera. Try Upload instead.",
        );
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  function captureFromCamera() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 1024, 1024);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        setCameraOpen(false);
        handleFile(file);
        // scroll to upload area for visual feedback
        setTimeout(() => document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" }), 100);
      },
      "image/jpeg",
      0.92,
    );
  }

  // Auth gate — push back to /login if no session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login", replace: true });
      else setUserId(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate({ to: "/login", replace: true });
      else setUserId(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Load diagnosis history when user available
  const loadHistory = async (uid: string) => {
    const { data, error } = await supabase
      .from("diagnoses")
      .select("id, image_url, disease_name, severity, confidence, rx, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !data) return;
    // Sign each storage path
    const rows: HistoryRow[] = await Promise.all(
      data.map(async (r) => {
        const { data: signed } = await supabase.storage
          .from("leaf-images")
          .createSignedUrl(r.image_url, 3600);
        return { ...r, signed_url: signed?.signedUrl };
      }),
    );
    setHistory(rows);
  };

  useEffect(() => {
    if (userId) loadHistory(userId);
  }, [userId]);

  // Scroll reveal
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal, .reveal-left, .reveal-right");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Count-up
  useEffect(() => {
    const node = statsRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !countedRef.current) {
            countedRef.current = true;
            const target = 54305;
            const step = Math.ceil(target / 55);
            let cur = 0;
            const id = setInterval(() => {
              cur += step;
              if (cur >= target) {
                cur = target;
                clearInterval(id);
              }
              setStatCount(cur);
            }, 28);
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Progress bars
  useEffect(() => {
    const node = barsRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !barsAnimated) {
            setBarsAnimated(true);
          }
        });
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [barsAnimated]);

  function smoothScroll(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function spawnParticles(x: number, y: number) {
    const emojis = ["🌿", "🍃", "🌱", "🍂", "🌿"];
    emojis.forEach((emo, i) => {
      const el = document.createElement("div");
      el.textContent = emo;
      el.style.cssText = `position:fixed;left:${x + (i - 2) * 22}px;top:${y}px;font-size:24px;pointer-events:none;z-index:9999;transition:all ${0.8 + i * 0.15}s cubic-bezier(.34,1.2,.64,1);`;
      document.body.appendChild(el);
      requestAnimationFrame(() => {
        el.style.transform = `translateY(-120px) rotate(${(i - 2) * 25}deg)`;
        el.style.opacity = "0";
      });
      setTimeout(() => el.remove(), 1500);
    });
  }

  function handleFile(file: File, originRect?: DOMRect) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      setPreview(url);
      setDiagnosis(null);
      setConfFill(0);
      setDiagError(null);
      setDiagnosing(true);
      if (originRect) spawnParticles(originRect.left + originRect.width / 2, originRect.top + 60);
      try {
        // Hash the image bytes for deterministic caching
        const buf = await file.arrayBuffer();
        const hash = await sha256Hex(buf);

        // If we already diagnosed this exact image, reuse the result for consistency
        if (userId) {
          const { data: existing } = await supabase
            .from("diagnoses")
            .select("disease_name, severity, confidence, rx")
            .eq("user_id", userId)
            .eq("image_hash", hash)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existing) {
            const cached: Diagnosis = {
              name: existing.disease_name,
              sev: existing.severity as Diagnosis["sev"],
              conf: existing.confidence,
              rx: existing.rx,
            };
            setDiagnosis(cached);
            setTimeout(() => setConfFill(cached.conf), 200);
            setDiagnosing(false);
            return;
          }
        }

        const result = await diagnoseLeaf({ data: { imageDataUrl: url } });
        setDiagnosis(result);
        setTimeout(() => setConfFill(result.conf), 200);

        // Persist: upload image + insert row
        if (userId) {
          const { ext } = dataUrlToBlob(url);
          const path = `${userId}/${hash}.${ext}`;
          await supabase.storage.from("leaf-images").upload(path, file, {
            contentType: file.type,
            upsert: true,
          });
          await supabase.from("diagnoses").insert({
            user_id: userId,
            image_url: path,
            image_hash: hash,
            disease_name: result.name,
            severity: result.sev,
            confidence: result.conf,
            rx: result.rx,
          });
          loadHistory(userId);
        }
      } catch (err) {
        setDiagError(err instanceof Error ? err.message : "Diagnosis failed.");
      } finally {
        setDiagnosing(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setPreview(null);
    setDiagnosis(null);
    setConfFill(0);
    setDiagError(null);
    setDiagnosing(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  async function clearHistory() {
    if (!userId) return;
    // Delete all rows for this user; storage objects are kept (cheap) and re-used on hash match.
    const { error } = await supabase.from("diagnoses").delete().eq("user_id", userId);
    if (!error) {
      setHistory([]);
      setActiveHistory(null);
    }
    setConfirmClear(false);
  }

  // Detect install eligibility (browser-backed checks)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setInstallState("installed");
      return;
    }
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    // iOS Safari supports manual Add-to-Home-Screen even without beforeinstallprompt
    if (isIOS) setInstallState("available");

    const onBIP = () => setInstallState("available");
    const onInstalled = () => setInstallState("installed");
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function openInstall() {
    if (installState !== "available") return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("leafrx:open-install"));
    }
  }

  return (
    <div className="leafrx-site">
      <style>{CSS}</style>

      {/* NAVBAR */}
      <nav className="nav">
        <div className="nav-inner">
          <button className="nav-brand" onClick={() => smoothScroll("hero")} aria-label="LeafRx home">
            <LeafRxWordmark iconSize={36} fontSize={22} />
          </button>
          <div className="nav-links">
            <a onClick={() => smoothScroll("how")}>{t("nav_how")}</a>
            <a onClick={() => smoothScroll("features")}>{t("nav_features")}</a>
            <a onClick={() => smoothScroll("install")}>{t("nav_install")}</a>
            <div className="hx-dropdown-wrap">
              <a
                onClick={(e) => {
                  e.stopPropagation();
                  setHistoryMenuOpen((v) => !v);
                }}
                className={historyMenuOpen ? "hx-trigger active" : "hx-trigger"}
              >
                {t("nav_history")} {history.length > 0 && <span className="hx-count">{history.length}</span>}
                <span className="hx-caret">▾</span>
              </a>
              {historyMenuOpen && (
                <div className="hx-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="hx-dd-head-row">
                    <div className="hx-dd-head">{t("recent_scans")}</div>
                    {history.length > 0 && (
                      <button
                        className="hx-dd-clear"
                        onClick={() => {
                          setHistoryMenuOpen(false);
                          setConfirmClear(true);
                        }}
                      >
                        {t("clear_all")}
                      </button>
                    )}
                  </div>
                  {history.length === 0 ? (
                    <div className="hx-dd-empty">{t("no_scans")}</div>
                  ) : (
                    <>
                      {history.slice(0, 5).map((h) => (
                        <button
                          key={h.id}
                          className="hx-dd-item"
                          onClick={() => {
                            setActiveHistory(h);
                            setHistoryMenuOpen(false);
                          }}
                        >
                          {h.signed_url ? (
                            <img src={h.signed_url} alt="" className="hx-dd-thumb" />
                          ) : (
                            <div className="hx-dd-thumb hx-dd-thumb-fallback">🌿</div>
                          )}
                          <div className="hx-dd-meta">
                            <div className="hx-dd-name">{h.disease_name}</div>
                            <div className="hx-dd-sub">
                              <span
                                className="sev-badge sev-badge-sm"
                                style={{
                                  background: (SEVERITY_COLOR[h.severity] || "#999") + "22",
                                  color: SEVERITY_COLOR[h.severity] || "#999",
                                  borderColor: (SEVERITY_COLOR[h.severity] || "#999") + "55",
                                }}
                              >
                                {h.severity}
                              </span>
                              <span className="hx-dd-date">
                                {new Date(h.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                      <button
                        className="hx-dd-viewall"
                        onClick={() => {
                          setHistoryMenuOpen(false);
                          setHistoryAllOpen(true);
                        }}
                      >
                        {t("view_all")}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <a onClick={() => setChatOpen(true)}>{t("nav_doctor")}</a>
            {history.length > 0 && (
              <a className="nav-clear-link" onClick={() => setConfirmClear(true)}>
                {t("nav_clear")}
              </a>
            )}
            <a className="nav-logout-link" onClick={logout}>
              {t("nav_logout")}
            </a>
          </div>
          <div className="nav-actions">
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div className="hero-badge badgePop">
            <span className="pulse-dot" />
            {t("hero_badge")}
          </div>

          <div className="hero-logo heroTitle">
            <LeafRxLogo size={108} />
          </div>

          <h1 className="hero-title heroTitle">
            {t("hero_title_1")} <br />
            <span className="grad-green">{t("hero_title_2")}</span>{" "}
            <span className="grad-olive">{t("hero_title_3")}</span>
          </h1>

          <div className="tagline-wrap fadeSlideIn">
            <div className="tagline-track">
              <span>Scan. Diagnose. Cure.</span>
              <span>AI Prescription for Plants</span>
              <span>Your Plant's Digital Doctor</span>
            </div>
          </div>

          <p className="hero-sub fadeSlideIn">{t("hero_sub")}</p>

          {/* UPLOAD BOX */}
          <div className="upload-wrap fadeSlideIn">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  handleFile(f, rect);
                }
              }}
            />
            {!preview ? (
              <button
                className="upload-box"
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  fileRef.current?.click();
                  // store rect for particle origin via dataset
                  (fileRef.current as HTMLInputElement & { _rect?: DOMRect })._rect = rect;
                }}
              >
                <div className="upload-icon">🌿</div>
                <div className="upload-title">{t("upload_drop")}</div>
                <div className="upload-sub">{t("upload_sub")}</div>
              </button>
            ) : (
              <div className="upload-box upload-result">
                <img src={preview} alt="Leaf preview" className="preview-img previewReveal" />
                {diagnosing && (
                  <div className="result-card resultSlide" style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "#9E9E9E" }}>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(127,163,40,.3)", borderTopColor: "#7fa328", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
                      <span>AI is analyzing the leaf…</span>
                    </div>
                  </div>
                )}
                {diagError && !diagnosing && (
                  <div className="result-card resultSlide" style={{ borderColor: "rgba(239,83,80,.4)" }}>
                    <div style={{ color: "#ffb4b1", fontSize: 14 }}>⚠️ {diagError}</div>
                    <button className="reset-link" onClick={reset}>↩ Try another leaf</button>
                  </div>
                )}
                {diagnosis && !diagnosing && (
                  <div className="result-card resultSlide">
                    <div className="result-row">
                      <span className="result-label">Disease Detected</span>
                      <span className="result-value">{diagnosis.name}</span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Severity</span>
                      <span
                        className="sev-badge"
                        style={{
                          background: SEVERITY_COLOR[diagnosis.sev] + "22",
                          color: SEVERITY_COLOR[diagnosis.sev],
                          borderColor: SEVERITY_COLOR[diagnosis.sev] + "55",
                        }}
                      >
                        {diagnosis.sev}
                      </span>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Confidence</span>
                      <span className="result-value">{diagnosis.conf}%</span>
                    </div>
                    <div className="conf-track">
                      <div className="conf-fill" style={{ width: `${confFill}%` }} />
                    </div>
                    <div className="rx-line">
                      <strong>Rx:</strong> {diagnosis.rx}
                    </div>
                    <button className="reset-link" onClick={reset}>
                      ↩ Try another leaf
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hero-ctas fadeSlideIn">
            <button className="btn btn-primary btn-lg" onClick={() => fileRef.current?.click()}>
              {t("cta_upload")}
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => setCameraOpen(true)}>
              {t("cta_camera")}
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => smoothScroll("how")}>
              {t("cta_how")}
            </button>
          </div>

          <div className="stat-pills">
            {[
              { v: "38+", l: "Disease Classes" },
              { v: "96.4%", l: "Accuracy" },
              { v: "54K+", l: "Training Images" },
              { v: "<1s", l: "Detection Time" },
            ].map((s, i) => (
              <div
                key={s.l}
                className="stat-pill statPop"
                style={{ animationDelay: `${0.8 + i * 0.12}s` }}
              >
                <strong>{s.v}</strong>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section section-tight">
        <div className="container">
          <div className="section-label reveal">{t("process")}</div>
          <h2 className="section-title reveal">{t("how_title")}</h2>
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className={`step-card reveal delay-${(i % 5) + 1}`}
              >
                <span className="step-num">{s.n}</span>
                <div className="step-icon">{s.icon}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-text">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DISEASES section removed per request */}

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="container">
          <div className="section-label reveal">{t("features_label")}</div>
          <h2 className="section-title reveal">{t("features_title")}</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`step-card reveal delay-${(i % 5) + 1}`}>
                <div className="step-icon">{f.icon}</div>
                <div className="step-title">{f.title}</div>
                <p className="step-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BANNER */}
      <section className="stats-banner" ref={statsRef}>
        <div className="container stats-grid">
          {[
            { v: statCount.toLocaleString(), l: "Training Images" },
            { v: "38", l: "Disease Classes" },
            { v: "96.4%", l: "Accuracy" },
            { v: "8+", l: "Crops Supported" },
          ].map((s) => (
            <div key={s.l} className="stat-block reveal">
              <strong>{s.v}</strong>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MODEL ACCURACY */}
      <section className="section">
        <div className="container">
          <div className="section-label reveal">{t("performance")}</div>
          <h2 className="section-title reveal">{t("perf_title")}</h2>
          <div className="bars" ref={barsRef}>
            {METRICS.map((m, i) => (
              <div key={m.label} className="progress-row reveal">
                <div className="progress-head">
                  <span>{m.label}</span>
                  <strong>{m.value}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${barsAnimated ? "animated" : ""}`}
                    style={{
                      width: barsAnimated ? `${m.value}%` : "0%",
                      transitionDelay: `${i * 120}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CROP-SAFETY TIPS (replaces testimonials) */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-label reveal">PROTECT YOUR HARVEST</div>
          <h2 className="section-title reveal">How to Keep Crops Disease-Free</h2>
          <div className="testimonials-grid">
            {SAFETY_TIPS.map((t, i) => (
              <div key={t.title} className={`step-card reveal delay-${(i % 5) + 1}`}>
                <div className="step-icon">{t.icon}</div>
                <div className="step-title">{t.title}</div>
                <p className="step-text">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TECH STACK section removed per request */}

      {/* INSTALL LEAFRX BANNER SECTION */}
      <section id="install" className="install-section">
        <div className="container install-inner">
          <div className="install-card reveal">
            <div className="install-left">
              <LeafRxLogo size={88} className="install-logo" />
            </div>
            <div className="install-body">
              <div className="install-eyebrow">{t("install_eyebrow")}</div>
              <h2 className="install-title">{t("install_title")}</h2>
              <p className="install-desc">{t("install_desc")}</p>
              <ul className="install-features">
                <li><span>📱</span> {t("install_f1")}</li>
                <li><span>⚡</span> {t("install_f2")}</li>
                <li><span>🔒</span> {t("install_f3")}</li>
              </ul>
              <div className="install-actions">
                <button
                  className={`btn btn-primary btn-lg btn-install-cta${installState !== "available" ? " is-disabled" : ""}`}
                  onClick={openInstall}
                  disabled={installState !== "available"}
                  title={
                    installState === "installed"
                      ? t("install_unavailable")
                      : installState === "unsupported"
                        ? t("install_unsupported")
                        : t("install_btn")
                  }
                >
                  <span className="btn-install-icon" aria-hidden>⬇</span>
                  {installState === "installed"
                    ? t("install_unavailable")
                    : installState === "unsupported"
                      ? t("install_unsupported")
                      : t("install_btn")}
                </button>
                <button
                  className="btn btn-outline btn-lg"
                  onClick={() => smoothScroll("how")}
                >
                  {t("learn_more")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-glow" />
        <div className="container cta-inner">
          <div className="cta-emoji">🌿</div>
          <h2 className="section-title">Ready to protect your crop?</h2>
          <div className="hero-ctas">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Diagnose Now
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setChatOpen(true)}>
              Ask Dr. LeafRx
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <LeafRxWordmark iconSize={32} fontSize={20} />
            <p className="footer-desc">
              AI-powered plant disease detection. Built for farmers, agronomists and researchers.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <a onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Diagnose</a>
            <a onClick={() => smoothScroll("features")}>Features</a>
            <a onClick={() => setChatOpen(true)}>Dr. LeafRx</a>
          </div>
          <div>
            <h4>Developer</h4>
            <a>API Docs</a>
            <a>Models</a>
            <a>GitHub</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} LeafRx</span>
          <span>Your Plant's Digital Doctor</span>
        </div>
      </footer>

      {/* Dr. LeafRx chatbot — sees most recent diagnosis or open scan as context */}
      {(() => {
        const latest = activeHistory
          ? {
              disease_name: activeHistory.disease_name,
              severity: activeHistory.severity,
              confidence: activeHistory.confidence,
              rx: activeHistory.rx,
              created_at: activeHistory.created_at,
            }
          : diagnosis
            ? { disease_name: diagnosis.name, severity: diagnosis.sev, confidence: diagnosis.conf, rx: diagnosis.rx }
            : history[0]
              ? {
                  disease_name: history[0].disease_name,
                  severity: history[0].severity,
                  confidence: history[0].confidence,
                  rx: history[0].rx,
                  created_at: history[0].created_at,
                }
              : null;
        return (
          <>
            {!chatOpen && <DrLeafRxFab onClick={() => setChatOpen(true)} />}
            <DrLeafRxChat open={chatOpen} onClose={() => setChatOpen(false)} context={latest} />
          </>
        );
      })()}

      {/* HISTORY DETAIL MODAL */}
      {activeHistory && (
        <div className="hx-modal-wrap" role="dialog" aria-modal="true" onClick={() => setActiveHistory(null)}>
          <div className="hx-modal" onClick={(e) => e.stopPropagation()}>
            <button className="hx-close" onClick={() => setActiveHistory(null)} aria-label="Close">✕</button>
            {activeHistory.signed_url && (
              <img src={activeHistory.signed_url} alt={activeHistory.disease_name} className="hx-img" />
            )}
            <div className="hx-body">
              <div className="hx-name">{activeHistory.disease_name}</div>
              <div className="hx-meta">
                <span
                  className="sev-badge sev-badge-sm"
                  style={{
                    background: (SEVERITY_COLOR[activeHistory.severity] || "#999") + "22",
                    color: SEVERITY_COLOR[activeHistory.severity] || "#999",
                    borderColor: (SEVERITY_COLOR[activeHistory.severity] || "#999") + "55",
                  }}
                >
                  {activeHistory.severity}
                </span>
                <span className="history-conf">{activeHistory.confidence}% confident</span>
                <span className="history-date">
                  {new Date(activeHistory.created_at).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="hx-section-label">PRESCRIBED RX</div>
              <p className="hx-rx">{activeHistory.rx}</p>
              <button
                className="btn btn-primary hx-cta"
                onClick={() => {
                  setChatOpen(true);
                }}
              >
                💬 Ask Dr. LeafRx about this scan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY — VIEW ALL MODAL */}
      {historyAllOpen && (
        <div className="hx-modal-wrap" role="dialog" aria-modal="true" onClick={() => setHistoryAllOpen(false)}>
          <div className="hx-modal hx-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="hx-close" onClick={() => setHistoryAllOpen(false)} aria-label="Close">✕</button>
            <div className="hx-all-head">
              <div className="hx-all-title">All diagnoses</div>
              <div className="hx-all-toolbar">
                <input
                  className="hx-all-search"
                  placeholder="Search disease…"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                />
                <select
                  className="hx-all-select"
                  value={historySev}
                  onChange={(e) => setHistorySev(e.target.value as typeof historySev)}
                >
                  <option value="All">All severities</option>
                  <option value="Severe">Severe</option>
                  <option value="High">High</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Low">Low</option>
                </select>
                <select
                  className="hx-all-select"
                  value={historySort}
                  onChange={(e) => setHistorySort(e.target.value as typeof historySort)}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
                {history.length > 0 && (
                  <button
                    className="hx-all-clear"
                    onClick={() => setConfirmClear(true)}
                  >
                    🗑️ Clear all
                  </button>
                )}
              </div>
            </div>
            <div className="hx-all-grid">
              {(() => {
                const q = historyQuery.trim().toLowerCase();
                const filtered = history
                  .filter((h) => (historySev === "All" ? true : h.severity === historySev))
                  .filter((h) => (q ? h.disease_name.toLowerCase().includes(q) : true))
                  .sort((a, b) =>
                    historySort === "newest"
                      ? +new Date(b.created_at) - +new Date(a.created_at)
                      : +new Date(a.created_at) - +new Date(b.created_at),
                  );
                if (filtered.length === 0) {
                  return <div className="hx-dd-empty" style={{ gridColumn: "1/-1" }}>No matching scans.</div>;
                }
                return filtered.map((h) => (
                  <button
                    key={h.id}
                    className="hx-card"
                    onClick={() => {
                      setActiveHistory(h);
                      setHistoryAllOpen(false);
                    }}
                  >
                    {h.signed_url ? (
                      <img src={h.signed_url} alt="" className="hx-card-img" />
                    ) : (
                      <div className="hx-card-img hx-dd-thumb-fallback">🌿</div>
                    )}
                    <div className="hx-card-body">
                      <div className="hx-dd-name">{h.disease_name}</div>
                      <div className="hx-dd-sub">
                        <span
                          className="sev-badge sev-badge-sm"
                          style={{
                            background: (SEVERITY_COLOR[h.severity] || "#999") + "22",
                            color: SEVERITY_COLOR[h.severity] || "#999",
                            borderColor: (SEVERITY_COLOR[h.severity] || "#999") + "55",
                          }}
                        >
                          {h.severity}
                        </span>
                        <span className="hx-dd-date">{h.confidence}%</span>
                        <span className="hx-dd-date">
                          {new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* CAMERA SCANNER */}
      {cameraOpen && (
        <div className="cam-wrap" role="dialog" aria-modal="true">
          <div className="cam-shell">
            <button className="hx-close cam-close" onClick={() => setCameraOpen(false)} aria-label="Close camera">✕</button>
            <div className="cam-stage">
              {cameraError ? (
                <div className="cam-error">
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div style={{ marginBottom: 12 }}>{cameraError}</div>
                  <button className="btn btn-outline" onClick={() => cameraRef.current?.click()}>
                    Use phone camera roll
                  </button>
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setCameraOpen(false);
                        handleFile(f);
                      }
                    }}
                  />
                </div>
              ) : (
                <>
                  <video ref={videoRef} className="cam-video" playsInline muted />
                  <div className="cam-frame" />
                  <div className="cam-hint">Center the leaf inside the frame</div>
                </>
              )}
            </div>
            {!cameraError && (
              <div className="cam-controls">
                <button className="cam-shutter" onClick={captureFromCamera} aria-label="Capture">
                  <span />
                </button>
                <div className="cam-tip">Hold steady · good light · single leaf</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM CLEAR HISTORY */}
      {confirmClear && (
        <div className="hx-modal-wrap" role="dialog" aria-modal="true" onClick={() => setConfirmClear(false)}>
          <div className="hx-modal hx-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="hx-confirm-icon">🗑️</div>
            <div className="hx-confirm-title">Clear all diagnoses?</div>
            <p className="hx-confirm-text">
              This will permanently delete all <strong>{history.length}</strong> scan
              {history.length === 1 ? "" : "s"} from your history. This action cannot be undone.
            </p>
            <div className="hx-confirm-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={clearHistory}>
                Yes, clear history
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- styles ---------------- */
const CSS = `
.leafrx-site {
  --bg:#121212; --card:#1E1E1E; --card2:#252525;
  --olive:#6B8E23; --olive-h:#7fa328; --green:#4CAF50;
  --brown:#8D6E63; --beige:#FAF3E0;
  --text:#E0E0E0; --muted:#9E9E9E; --border:#2a2a2a;
  --dark-green:#1a2810; --forest:#1e3310;
  background:var(--bg); color:var(--text);
  font-family:'Open Sans',system-ui,sans-serif;
  min-height:100vh;
  animation: pageFadeIn .7s ease both;
}
.leafrx-site h1,.leafrx-site h2,.leafrx-site h3,.leafrx-site h4 { font-family:'Nunito','Poppins',sans-serif; }
.leafrx-site ::-webkit-scrollbar { width:5px; }
.leafrx-site ::-webkit-scrollbar-thumb { background:var(--olive); border-radius:3px; }
.leafrx-site ::-webkit-scrollbar-track { background:#1a1a1a; }
.leafrx-site a { color:inherit; text-decoration:none; cursor:pointer; }
.leafrx-site button { font-family:inherit; cursor:pointer; }
.container { max-width:1180px; margin:0 auto; padding:0 24px; }

/* nav */
.nav { position:sticky; top:0; z-index:50; background:rgba(18,18,18,.96); backdrop-filter:blur(14px); border-bottom:1px solid var(--border); }
.nav-inner { display:flex; align-items:center; justify-content:space-between; max-width:1280px; margin:0 auto; padding:14px 24px; gap:20px; }
.nav-brand { background:none; border:none; padding:0; }
.nav-links { display:flex; gap:28px; }
.nav-links a { color:var(--muted); font-weight:500; transition:color .2s; font-size:14px; }
.nav-links a:hover { color:var(--green); }
.nav-actions { display:flex; gap:10px; align-items:center; }
.btn { border:none; border-radius:24px; padding:10px 18px; font-weight:600; font-size:14px; transition:all .25s cubic-bezier(.34,1.2,.64,1); }
.btn-primary { background:linear-gradient(135deg,var(--olive),var(--olive-h)); color:#fff; }
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(107,142,35,.45); }
.btn-outline { background:transparent; border:1px solid var(--green); color:var(--green); }
.btn-outline:hover { background:rgba(76,175,80,.08); transform:translateY(-2px); }
.btn-ghost { background:transparent; color:var(--muted); }
.btn-ghost:hover { color:var(--text); }
.btn-lg { padding:14px 26px; font-size:15px; }

/* hero */
.hero { position:relative; padding:60px 24px 80px; overflow:hidden; }
.hero-glow { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 0%, rgba(107,142,35,.18), transparent 60%); pointer-events:none; }
.hero-inner { position:relative; max-width:840px; margin:0 auto; text-align:center; }
.hero-badge { display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:20px; background:#1a2810; border:1px solid #2e4310; color:var(--green); font-size:12px; font-weight:600; }
.pulse-dot { width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 0 0 rgba(76,175,80,.6); animation: pulse 2s infinite; }
.hero-logo { margin:24px 0 12px; display:flex; justify-content:center; }
.hero-title { font-size:clamp(34px,6vw,62px); font-weight:900; line-height:1.05; margin:8px 0 18px; letter-spacing:-1px; }
.grad-green { color:var(--green); }
.grad-olive { color:var(--olive); }

.tagline-wrap { height:28px; overflow:hidden; margin:8px 0 14px; color:var(--muted); font-size:15px; }
.tagline-track { display:flex; flex-direction:column; animation: slideTag 9s infinite; }
.tagline-track > span { height:28px; line-height:28px; }
@keyframes slideTag {
  0%,28% { transform:translateY(0); }
  35%,61% { transform:translateY(-28px); }
  68%,95% { transform:translateY(-56px); }
  100% { transform:translateY(0); }
}

.hero-sub { color:var(--muted); max-width:520px; margin:0 auto 28px; font-size:15px; line-height:1.6; }

/* upload */
.upload-wrap { max-width:460px; margin:0 auto 28px; }
.upload-box { width:100%; background:var(--card); border:2px dashed #3a5a10; border-radius:20px; padding:36px 22px; color:var(--text); text-align:center; transition:all .3s cubic-bezier(.34,1.2,.64,1); display:block; }
.upload-box:hover { border-color:var(--olive); background:var(--dark-green); transform:translateY(-3px); box-shadow:0 12px 36px rgba(107,142,35,.2); }
.upload-icon { font-size:42px; margin-bottom:10px; transition:transform .3s; display:inline-block; }
.upload-box:hover .upload-icon { transform:scale(1.15) rotate(-8deg); }
.upload-title { font-weight:600; margin-bottom:4px; }
.upload-sub { color:var(--muted); font-size:12px; }
.upload-result { padding:18px; border-style:solid; border-color:var(--border); }
.preview-img { width:100%; max-height:240px; object-fit:cover; border-radius:12px; }
@keyframes previewReveal { from{transform:scale(.88);opacity:0;} to{transform:scale(1);opacity:1;} }
.previewReveal { animation: previewReveal .5s cubic-bezier(.34,1.2,.64,1) both; }

.result-card { margin-top:14px; background:var(--card2); border:1px solid var(--border); border-radius:14px; padding:16px; text-align:left; }
@keyframes resultSlide { from{transform:translateY(10px);opacity:0;} to{transform:translateY(0);opacity:1;} }
.resultSlide { animation: resultSlide .5s ease both .15s; }
.result-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:14px; }
.result-label { color:var(--muted); }
.result-value { font-weight:600; }
.sev-badge { padding:3px 10px; border-radius:10px; font-size:12px; font-weight:600; border:1px solid; }
.sev-badge-sm { font-size:11px; padding:2px 8px; }
.conf-track { height:8px; background:#2a2a2a; border-radius:4px; overflow:hidden; margin:10px 0; }
.conf-fill { height:100%; background:linear-gradient(90deg,var(--olive),var(--green)); transition:width 1.4s cubic-bezier(.22,1,.36,1); }
.rx-line { font-size:13px; color:var(--text); margin-top:8px; line-height:1.5; }
.reset-link { background:none; border:none; color:var(--green); font-size:13px; margin-top:10px; padding:0; }
.reset-link:hover { color:var(--olive-h); }

.hero-ctas { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; margin-bottom:32px; }

.stat-pills { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.stat-pill { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:12px 18px; min-width:120px; opacity:0; }
.stat-pill strong { display:block; color:var(--green); font-family:'Nunito',sans-serif; font-weight:900; font-size:20px; }
.stat-pill span { color:var(--muted); font-size:12px; }

/* sections */
.section { padding:72px 0; }
.section-tight { padding-top:32px; }
.section-alt { background:#161616; }
.section-label { color:var(--olive); font-size:12px; font-weight:700; letter-spacing:2px; margin-bottom:8px; }
.section-title { font-size:clamp(26px,3.5vw,40px); font-weight:900; margin:0 0 36px; }

.steps-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(190px,1fr)); gap:16px; }
.features-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px,1fr)); gap:16px; }
.step-card { position:relative; background:var(--card); border:1px solid var(--border); border-radius:16px; padding:22px; transition:all .3s cubic-bezier(.34,1.2,.64,1); }
.step-card:hover { transform:translateY(-6px) scale(1.02); border-color:var(--olive); box-shadow:0 16px 40px rgba(107,142,35,.18); }
.step-num { position:absolute; top:12px; right:14px; font-size:11px; color:#3a5a10; font-weight:800; letter-spacing:1px; }
.step-icon { width:48px; height:48px; border-radius:12px; background:var(--dark-green); display:flex; align-items:center; justify-content:center; font-size:24px; margin-bottom:12px; transition:transform .3s; }
.step-card:hover .step-icon { transform:scale(1.18) rotate(-6deg); }
.step-title { font-weight:700; margin-bottom:6px; font-family:'Nunito',sans-serif; }
.step-text { color:var(--muted); font-size:13px; line-height:1.5; margin:0; }

/* diseases */
.diseases-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(170px,1fr)); gap:14px; }
.disease-card { position:relative; background:var(--card); border:1px solid var(--border); border-radius:14px; padding:18px; text-align:center; overflow:hidden; transition:all .3s cubic-bezier(.34,1.2,.64,1); }
.disease-card::before { content:""; position:absolute; top:0; left:0; right:0; height:3px; background:var(--accent); }
.disease-card:hover { transform:translateY(-6px); border-color:var(--accent); box-shadow:0 16px 40px rgba(0,0,0,.4); }
.disease-emoji { font-size:32px; transition:transform .3s; display:inline-block; }
.disease-card:hover .disease-emoji { transform:scale(1.2) rotate(8deg); }
.disease-crop { font-weight:700; font-size:13px; margin-top:6px; }
.disease-name { color:var(--muted); font-size:12px; margin-bottom:8px; }

/* stats banner */
.stats-banner { background:linear-gradient(135deg,#1a2810,#1e3310); border-top:1px solid #2a4010; border-bottom:1px solid #2a4010; padding:48px 0; }
.stats-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:20px; text-align:center; }
.stat-block strong { display:block; font-family:'Nunito',sans-serif; font-weight:900; font-size:28px; color:#fff; }
.stat-block span { color:var(--muted); font-size:12px; letter-spacing:1px; text-transform:uppercase; }

/* progress bars */
.bars { display:flex; flex-direction:column; gap:18px; }
.progress-head { display:flex; justify-content:space-between; font-size:14px; margin-bottom:6px; }
.progress-track { height:9px; background:#2a2a2a; border-radius:5px; overflow:hidden; }
.progress-fill { height:100%; width:0; border-radius:5px; background:linear-gradient(90deg,#6B8E23,#4CAF50,#a5d6a7,#4CAF50); background-size:200% 100%; transition:width 1.4s cubic-bezier(.22,1,.36,1); }
.progress-fill.animated { animation: shimmer 2.5s linear infinite; }
@keyframes shimmer { from{background-position:200% 0;} to{background-position:-200% 0;} }

/* testimonials */
.testimonials-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px,1fr)); gap:16px; }
.stars { color:#ffa726; margin-bottom:10px; }
.quote { font-style:italic; color:var(--muted); margin:0 0 14px; line-height:1.6; }
.testi-name { font-weight:700; }
.testi-role { color:var(--muted); font-size:12px; }

/* tech tags */
.tech-tags { display:flex; flex-wrap:wrap; gap:10px; }
.tech-tag { display:inline-flex; align-items:center; gap:8px; background:var(--card); border:1px solid var(--border); border-radius:20px; padding:8px 14px; font-size:13px; color:var(--text); transition:all .25s; }
.tech-tag:hover { border-color:var(--olive); color:#fff; transform:translateY(-2px); box-shadow:0 6px 18px rgba(107,142,35,.25); }
.tech-cat { color:var(--olive); font-size:11px; font-weight:700; }

/* cta */
.cta { position:relative; padding:80px 0; text-align:center; overflow:hidden; }
.cta-glow { position:absolute; inset:0; background:radial-gradient(ellipse at 50% 100%, rgba(107,142,35,.18), transparent 60%); pointer-events:none; }
.cta-inner { position:relative; }
.cta-emoji { font-size:54px; margin-bottom:10px; }

/* footer */
.footer { background:#0d0d0d; border-top:1px solid var(--border); padding:48px 0 20px; }
.footer-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:32px; }
.footer h4 { color:#fff; font-size:14px; margin:0 0 14px; }
.footer a { display:block; color:var(--muted); font-size:13px; padding:4px 0; transition:all .2s; }
.footer a:hover { color:var(--green); transform:translateX(3px); }
.footer-desc { color:var(--muted); font-size:13px; margin-top:12px; max-width:280px; line-height:1.6; }
.footer-bottom { display:flex; justify-content:space-between; padding-top:24px; margin-top:32px; border-top:1px solid var(--border); color:var(--muted); font-size:12px; }

/* reveal animations */
.reveal,.reveal-left,.reveal-right { opacity:0; transition: opacity .65s ease, transform .65s ease; }
.reveal { transform:translateY(28px); }
.reveal-left { transform:translateX(-28px); }
.reveal-right { transform:translateX(28px); }
.reveal.visible,.reveal-left.visible,.reveal-right.visible { opacity:1; transform:none; }
.delay-1 { transition-delay:.1s; }
.delay-2 { transition-delay:.2s; }
.delay-3 { transition-delay:.3s; }
.delay-4 { transition-delay:.4s; }
.delay-5 { transition-delay:.5s; }

/* hero animations */
@keyframes pageFadeIn { from{opacity:0;} to{opacity:1;} }
@keyframes badgePop { from{transform:scale(.85) translateY(-8px);opacity:0;} to{transform:none;opacity:1;} }
.badgePop { animation: badgePop .6s ease both .2s; }
@keyframes heroTitle { from{transform:translateY(20px);opacity:0;} to{transform:none;opacity:1;} }
.heroTitle { animation: heroTitle .7s ease both .35s; }
@keyframes fadeSlideIn { from{transform:translateY(10px);opacity:0;} to{transform:none;opacity:1;} }
.fadeSlideIn { animation: fadeSlideIn .65s ease both .55s; }
@keyframes statPop { from{transform:translateY(14px) scale(.94);opacity:0;} to{transform:none;opacity:1;} }
.statPop { animation: statPop .55s cubic-bezier(.34,1.2,.64,1) both; }

@keyframes pulse {
  0% { box-shadow:0 0 0 0 rgba(76,175,80,.6); }
  70% { box-shadow:0 0 0 10px rgba(76,175,80,0); }
  100% { box-shadow:0 0 0 0 rgba(76,175,80,0); }
}

/* nav burger (hidden on desktop) */
.nav-burger { display:none; flex-direction:column; gap:4px; background:transparent; border:1px solid var(--border); border-radius:10px; padding:9px 10px; cursor:pointer; }
.nav-burger span { display:block; width:18px; height:2px; background:var(--text); border-radius:2px; transition:all .2s; }
.nav-burger:hover { border-color:var(--olive); }
.nav-burger:hover span { background:var(--green); }

/* install + danger buttons */
.btn-install { background:linear-gradient(135deg, #1a2e1a, #2d6e2d); color:#fff; border:1px solid rgba(92,200,92,.4); display:inline-flex; align-items:center; gap:6px; }
.btn-install:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(45,110,45,.45); border-color:#5cc85c; }
.btn-danger { background:linear-gradient(135deg,#b3261e,#ef5350); color:#fff; }
.btn-danger:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(239,83,80,.4); }

/* history dropdown — clear-all + heading row */
.hx-dd-head-row { display:flex; align-items:center; justify-content:space-between; padding-right:6px; }
.hx-dd-clear { background:transparent; border:none; color:#ef5350; font-size:11px; font-weight:700; letter-spacing:.5px; padding:6px 10px; border-radius:8px; cursor:pointer; transition:all .2s; }
.hx-dd-clear:hover { background:rgba(239,83,80,.1); }
.hx-all-clear { background:rgba(239,83,80,.08); border:1px solid rgba(239,83,80,.35); color:#ef5350; border-radius:10px; padding:10px 14px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; transition:all .2s; }
.hx-all-clear:hover { background:rgba(239,83,80,.18); border-color:#ef5350; }

/* clear-history confirm modal */
.hx-confirm { max-width:440px; padding:32px 28px; text-align:center; }
.hx-confirm-icon { font-size:48px; margin-bottom:12px; }
.hx-confirm-title { font-family:'Nunito',sans-serif; font-weight:900; font-size:22px; color:#fff; margin-bottom:10px; }
.hx-confirm-text { color:var(--muted); font-size:14px; line-height:1.55; margin:0 0 24px; }
.hx-confirm-text strong { color:#fff; }
.hx-confirm-actions { display:flex; gap:10px; justify-content:center; }

/* mobile menu drawer */
.mobile-menu { position:fixed; inset:0; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); z-index:90; animation:hxFade .2s ease both; }
.mobile-menu-panel { position:absolute; top:0; right:0; bottom:0; width:min(86vw,320px); background:#161616; border-left:1px solid var(--border); box-shadow:-12px 0 36px rgba(0,0,0,.5); padding:80px 16px 24px; display:flex; flex-direction:column; gap:6px; animation:slideInRight .3s cubic-bezier(.34,1.2,.64,1) both; overflow-y:auto; }
@keyframes slideInRight { from { transform:translateX(100%); } to { transform:translateX(0); } }
.mobile-link { display:flex; align-items:center; gap:12px; background:transparent; border:none; color:var(--text); padding:14px 16px; border-radius:12px; font:inherit; font-size:15px; font-weight:600; text-align:left; cursor:pointer; transition:all .2s; width:100%; }
.mobile-link:hover { background:rgba(107,142,35,.12); color:var(--green); }
.mobile-link span:first-child { font-size:18px; width:24px; text-align:center; }
.mobile-link-danger { color:#ef5350; }
.mobile-link-danger:hover { background:rgba(239,83,80,.1); color:#ef5350; }
.mobile-pill { margin-left:auto; background:var(--olive); color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; }

/* INSTALL SECTION */
.install-section { padding:64px 0; background:linear-gradient(180deg, transparent, rgba(45,110,45,.06), transparent); }
.install-inner { display:flex; justify-content:center; }
.install-card { display:flex; gap:32px; align-items:center; max-width:920px; width:100%; background:linear-gradient(135deg, #1a2e1a 0%, #1e3310 100%); border:1px solid rgba(92,200,92,.25); border-radius:24px; padding:36px 40px; box-shadow:0 24px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04); position:relative; overflow:hidden; }
.install-card::before { content:""; position:absolute; top:-50%; right:-20%; width:400px; height:400px; background:radial-gradient(circle, rgba(92,200,92,.15), transparent 65%); pointer-events:none; }
.install-left { flex-shrink:0; position:relative; z-index:1; }
.install-logo { box-shadow:0 12px 32px rgba(0,0,0,.5), 0 0 0 4px rgba(92,200,92,.18); border-radius:50%; }
.install-body { flex:1; min-width:0; position:relative; z-index:1; }
.install-eyebrow { color:#5cc85c; font-size:11px; font-weight:800; letter-spacing:2px; margin-bottom:8px; }
.install-title { font-family:'Nunito',sans-serif; font-weight:900; font-size:clamp(22px,3vw,30px); color:#fff; margin:0 0 12px; line-height:1.15; }
.install-desc { color:#b8c5b0; font-size:14.5px; line-height:1.6; margin:0 0 18px; max-width:560px; }
.install-features { list-style:none; padding:0; margin:0 0 22px; display:flex; flex-direction:column; gap:8px; }
.install-features li { display:flex; align-items:center; gap:10px; color:#cfd6c4; font-size:13.5px; }
.install-features li span { font-size:16px; width:22px; text-align:center; }
.install-actions { display:flex; gap:10px; flex-wrap:wrap; }

/* responsive */
@media (max-width: 860px) {
  .btn-logout-desktop { display:none; }
  .nav-burger { display:flex; }
  .footer-grid { grid-template-columns:1fr 1fr; }
  .btn-install { padding:8px 12px; font-size:13px; }
  .nav-inner { padding:12px 14px; gap:8px; flex-wrap:wrap; }
  .nav-brand { order:1; }
  .nav-actions { order:2; margin-left:auto; }
  /* Show full nav as a horizontally scrollable strip beneath the brand */
  .nav-links {
    order:3;
    flex-basis:100%;
    display:flex;
    gap:6px;
    overflow-x:auto;
    overflow-y:visible;
    -webkit-overflow-scrolling:touch;
    scrollbar-width:none;
    padding:6px 2px 8px;
    margin:0 -4px;
    border-top:1px solid var(--border);
    margin-top:6px;
    padding-top:10px;
  }
  .nav-links::-webkit-scrollbar { display:none; }
  .nav-links > a, .nav-links > .hx-dropdown-wrap > a {
    flex-shrink:0;
    padding:7px 12px;
    border-radius:999px;
    background:rgba(255,255,255,.04);
    border:1px solid var(--border);
    font-size:13px;
    white-space:nowrap;
    color:var(--text);
  }
  .nav-links > a:hover, .nav-links > .hx-dropdown-wrap > a:hover { background:rgba(107,142,35,.12); border-color:var(--olive); color:var(--green); }
  .hx-dropdown { right:auto; left:0; min-width:260px; }
  .install-card { flex-direction:column; text-align:center; padding:32px 24px; gap:20px; }
  .install-desc { margin-left:auto; margin-right:auto; }
  .install-features { align-items:flex-start; max-width:320px; margin-left:auto; margin-right:auto; }
  .install-actions { justify-content:center; }
}
@media (max-width: 600px) {
  .hero-title { font-size:28px; }
  .stat-pill { min-width:calc(50% - 8px); }
  .footer-grid { grid-template-columns:1fr; }
  .footer-bottom { flex-direction:column; gap:8px; text-align:center; }
  .history-toolbar { flex-direction:column; align-items:stretch; }
  .history-filters { flex-direction:column; }
  .nav-inner { padding:10px 12px; }
  .btn-install { padding:7px 10px; font-size:12px; border-radius:20px; }
  .nav-actions { gap:6px; }
  .install-section { padding:40px 0; }
  .install-card { padding:24px 18px; border-radius:18px; }
  .install-title { font-size:20px; }
  .install-desc { font-size:13.5px; }
}
@media (max-width: 380px) {
  /* On the smallest phones, hide the Install button text label and show only the icon to keep the bar tidy */
  .btn-install { font-size:0; padding:8px 10px; }
  .btn-install::before { content:"⬇"; font-size:14px; }
}


/* history toolbar + cards */
.history-toolbar { display:flex; flex-wrap:wrap; gap:12px; align-items:center; margin-bottom:24px; }
.history-search { position:relative; flex:1; min-width:220px; }
.history-search input { width:100%; background:var(--card); border:1px solid var(--border); border-radius:12px; padding:11px 36px 11px 36px; color:var(--text); font-family:inherit; font-size:14px; outline:none; transition:border-color .2s; }
.history-search input:focus { border-color:var(--olive); }
.history-search-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:14px; opacity:.7; pointer-events:none; }
.history-clear { position:absolute; right:8px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:var(--muted); cursor:pointer; padding:4px 8px; border-radius:6px; font-size:13px; }
.history-clear:hover { color:var(--text); background:rgba(255,255,255,.05); }
.history-filters { display:flex; gap:10px; }
.history-filters select { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:10px 14px; color:var(--text); font-family:inherit; font-size:13px; outline:none; cursor:pointer; transition:border-color .2s; }
.history-filters select:hover, .history-filters select:focus { border-color:var(--olive); }
.history-empty { background:var(--card); border:1px dashed var(--border); border-radius:14px; padding:28px; text-align:center; color:var(--muted); font-size:14px; }
.history-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:16px; }
.history-card { background:var(--card); border:1px solid var(--border); border-radius:16px; overflow:hidden; transition:all .3s cubic-bezier(.34,1.2,.64,1); padding:0; text-align:left; cursor:pointer; font:inherit; color:inherit; width:100%; }
.history-card:hover { transform:translateY(-4px); border-color:var(--olive); box-shadow:0 12px 32px rgba(107,142,35,.18); }
.hx-modal-wrap { position:fixed; inset:0; background:rgba(0,0,0,.7); backdrop-filter:blur(8px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:24px; animation:hxFade .2s ease both; }
@keyframes hxFade { from{opacity:0} to{opacity:1} }
.hx-modal { background:#1a1a1a; border:1px solid #2a4010; border-radius:20px; max-width:560px; width:100%; max-height:90vh; overflow-y:auto; position:relative; box-shadow:0 24px 60px rgba(0,0,0,.6); animation:hxIn .3s cubic-bezier(.34,1.2,.64,1) both; }
@keyframes hxIn { from{opacity:0;transform:scale(.95) translateY(20px)} to{opacity:1;transform:none} }
.hx-close { position:absolute; top:12px; right:12px; background:rgba(0,0,0,.6); border:1px solid #333; color:#fff; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:16px; z-index:2; transition:all .2s; }
.hx-close:hover { background:#000; border-color:var(--olive); }
.hx-img { width:100%; max-height:340px; object-fit:cover; display:block; }
.hx-body { padding:24px; }
.hx-name { font-family:'Nunito',sans-serif; font-weight:900; font-size:22px; color:#fff; margin-bottom:12px; }
.hx-meta { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:20px; font-size:13px; color:#9E9E9E; }
.hx-section-label { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--olive); margin-bottom:8px; }
.hx-rx { color:#E0E0E0; font-size:15px; line-height:1.6; margin-bottom:20px; }
.hx-cta { width:100%; }
.history-img { width:100%; height:160px; object-fit:cover; display:block; background:#0d0d0d; }
.history-body { padding:14px 16px 16px; }
.history-name { font-family:'Nunito',sans-serif; font-weight:800; font-size:15px; margin-bottom:8px; color:#fff; }
.history-meta { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.history-conf { color:var(--muted); font-size:12px; }
.history-rx { color:var(--text); font-size:13px; line-height:1.5; margin:0 0 10px; }
.history-date { color:var(--muted); font-size:11px; letter-spacing:.5px; }
@keyframes spin { to { transform: rotate(360deg); } }

/* History dropdown in navbar */
.hx-dropdown-wrap { position:relative; display:inline-block; }
.hx-trigger { display:inline-flex; align-items:center; gap:6px; user-select:none; }
.hx-trigger.active { color:var(--green); }
.hx-count { background:var(--olive); color:#fff; font-size:10px; font-weight:700; padding:1px 7px; border-radius:10px; line-height:1.5; }
.hx-caret { font-size:10px; opacity:.7; }
.hx-dropdown { position:absolute; top:calc(100% + 12px); right:0; width:340px; background:#1a1a1a; border:1px solid #2a4010; border-radius:14px; box-shadow:0 18px 48px rgba(0,0,0,.55); padding:8px; z-index:60; animation:hxIn .2s cubic-bezier(.34,1.2,.64,1) both; }
.hx-dd-head { font-size:11px; font-weight:700; letter-spacing:1.5px; color:var(--olive); padding:8px 10px 6px; }
.hx-dd-empty { padding:18px 12px; text-align:center; color:var(--muted); font-size:13px; }
.hx-dd-item { width:100%; display:flex; gap:12px; align-items:center; background:transparent; border:none; padding:10px; border-radius:10px; cursor:pointer; transition:background .15s; text-align:left; }
.hx-dd-item:hover { background:rgba(107,142,35,.12); }
.hx-dd-thumb { width:46px; height:46px; border-radius:10px; object-fit:cover; flex-shrink:0; background:#0d0d0d; }
.hx-dd-thumb-fallback { display:flex; align-items:center; justify-content:center; font-size:22px; }
.hx-dd-meta { flex:1; min-width:0; }
.hx-dd-name { font-family:'Nunito',sans-serif; font-weight:800; font-size:13px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-bottom:4px; }
.hx-dd-sub { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--muted); }
.hx-dd-date { color:var(--muted); font-size:11px; }
.hx-dd-viewall { width:100%; margin-top:6px; padding:10px; background:linear-gradient(135deg,var(--olive),var(--olive-h)); border:none; border-radius:10px; color:#fff; font-weight:700; font-size:13px; cursor:pointer; transition:filter .2s; }
.hx-dd-viewall:hover { filter:brightness(1.1); }

/* View-all modal */
.hx-modal-wide { max-width:980px; }
.hx-all-head { padding:24px 24px 16px; border-bottom:1px solid var(--border); }
.hx-all-title { font-family:'Nunito',sans-serif; font-weight:900; font-size:22px; color:#fff; margin-bottom:14px; }
.hx-all-toolbar { display:flex; gap:10px; flex-wrap:wrap; }
.hx-all-search { flex:1; min-width:180px; background:#0d0d0d; border:1px solid var(--border); border-radius:10px; padding:10px 14px; color:var(--text); font-family:inherit; font-size:13px; outline:none; transition:border-color .2s; }
.hx-all-search:focus { border-color:var(--olive); }
.hx-all-select { background:#0d0d0d; border:1px solid var(--border); border-radius:10px; padding:10px 14px; color:var(--text); font-family:inherit; font-size:13px; outline:none; cursor:pointer; }
.hx-all-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:14px; padding:20px 24px 24px; }
.hx-card { background:#1E1E1E; border:1px solid var(--border); border-radius:14px; overflow:hidden; cursor:pointer; padding:0; text-align:left; font:inherit; color:inherit; transition:all .25s cubic-bezier(.34,1.2,.64,1); }
.hx-card:hover { transform:translateY(-3px); border-color:var(--olive); box-shadow:0 10px 28px rgba(107,142,35,.18); }
.hx-card-img { width:100%; height:130px; object-fit:cover; display:block; background:#0d0d0d; }
.hx-card-body { padding:12px 14px 14px; }

/* Camera scanner */
.cam-wrap { position:fixed; inset:0; background:#000; z-index:10000; display:flex; align-items:center; justify-content:center; animation:hxFade .25s ease both; }
.cam-shell { position:relative; width:100%; height:100%; max-width:640px; max-height:100vh; display:flex; flex-direction:column; }
.cam-close { z-index:5; }
.cam-stage { position:relative; flex:1; overflow:hidden; background:#000; display:flex; align-items:center; justify-content:center; }
.cam-video { width:100%; height:100%; object-fit:cover; }
.cam-frame { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:min(78vw,420px); aspect-ratio:1/1; border:2px solid rgba(76,175,80,.85); border-radius:24px; box-shadow:0 0 0 9999px rgba(0,0,0,.45); pointer-events:none; }
.cam-frame::before, .cam-frame::after { content:""; position:absolute; width:28px; height:28px; border:3px solid var(--green); }
.cam-frame::before { top:-3px; left:-3px; border-right:none; border-bottom:none; border-top-left-radius:24px; }
.cam-frame::after { bottom:-3px; right:-3px; border-left:none; border-top:none; border-bottom-right-radius:24px; }
.cam-hint { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); color:#fff; font-size:13px; background:rgba(0,0,0,.55); padding:8px 16px; border-radius:20px; backdrop-filter:blur(6px); }
.cam-error { color:#fff; text-align:center; padding:32px; max-width:360px; }
.cam-controls { padding:22px 16px 28px; background:#000; display:flex; flex-direction:column; align-items:center; gap:10px; }
.cam-shutter { width:72px; height:72px; border-radius:50%; border:4px solid #fff; background:transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform .15s; }
.cam-shutter:hover { transform:scale(1.05); }
.cam-shutter:active { transform:scale(.92); }
.cam-shutter span { width:54px; height:54px; border-radius:50%; background:#fff; display:block; transition:background .2s; }
.cam-shutter:hover span { background:var(--green); }
.cam-tip { color:var(--muted); font-size:12px; }
`;
