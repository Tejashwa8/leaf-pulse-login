import { jsPDF } from "jspdf";
import logoSrc from "@/assets/leafrx-logo.png";

let logoDataUrlCache: string | null = null;
async function getLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache) return logoDataUrlCache;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    logoDataUrlCache = dataUrl;
    return dataUrl;
  } catch {
    return null;
  }
}

export type PdfPayload = {
  diseaseName: string;
  severity: string;
  confidence: number;
  rx: string;
  createdAt?: string;
  imageUrl?: string;
  timeline?: { day: string; title: string; text: string }[];
};

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const BRAND = { r: 107, g: 142, b: 35 };
const BRAND_DARK = { r: 60, g: 90, b: 20 };
const SEV_COLORS: Record<string, [number, number, number]> = {
  Severe: [239, 83, 80],
  High: [255, 112, 67],
  Moderate: [255, 167, 38],
  Mild: [102, 187, 106],
  Low: [102, 187, 106],
};

function drawBrandHeader(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, W, 78, "F");
  doc.setFillColor(BRAND_DARK.r, BRAND_DARK.g, BRAND_DARK.b);
  doc.rect(0, 78, W, 4, "F");

  // Logo circle with leaf
  doc.setFillColor(255, 255, 255);
  doc.circle(64, 39, 22, "F");
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("🌿", 64, 47, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("LeafRx", 96, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("AI-Powered Plant Disease Detection", 96, 56);
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(40, H - 32, W - 40, H - 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("LeafRx · leafrx.app", 40, H - 18);
  doc.text(
    `Page ${pageNum} of ${totalPages}  ·  Generated ${new Date().toLocaleString()}`,
    W - 40,
    H - 18,
    { align: "right" },
  );
}

function drawSeverityMeter(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  severity: string,
) {
  const segments: { label: string; color: [number, number, number] }[] = [
    { label: "Mild", color: [102, 187, 106] },
    { label: "Moderate", color: [255, 167, 38] },
    { label: "Severe", color: [239, 83, 80] },
  ];
  const norm = severity === "Low" ? "Mild" : severity === "High" ? "Severe" : severity;
  const segW = (w - 8) / 3;
  segments.forEach((s, i) => {
    const sx = x + i * (segW + 4);
    const active = s.label === norm;
    if (active) {
      doc.setFillColor(s.color[0], s.color[1], s.color[2]);
    } else {
      doc.setFillColor(235, 235, 235);
    }
    doc.roundedRect(sx, y, segW, 22, 6, 6, "F");
    doc.setTextColor(active ? 255 : 130, active ? 255 : 130, active ? 255 : 130);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(s.label.toUpperCase(), sx + segW / 2, y + 14, { align: "center" });
  });
}

export async function exportDiagnosisPdf(p: PdfPayload) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = 0;

  drawBrandHeader(doc);
  y = 110;

  // Image (right) and disease title (left)
  let imgBottom = y;
  if (p.imageUrl) {
    const dataUrl = await urlToDataUrl(p.imageUrl);
    if (dataUrl) {
      try {
        const imgW = 170;
        const imgH = 170;
        // shadow
        doc.setFillColor(220, 220, 220);
        doc.roundedRect(W - M - imgW + 3, y + 3, imgW, imgH, 10, 10, "F");
        doc.addImage(dataUrl, "JPEG", W - M - imgW, y, imgW, imgH, undefined, "FAST");
        imgBottom = y + imgH;
      } catch {}
    }
  }

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("DIAGNOSIS", M, y + 4);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(20);
  const nameLines = doc.splitTextToSize(p.diseaseName, W - 2 * M - 200);
  doc.text(nameLines, M, y + 26);
  let textY = y + 26 + nameLines.length * 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  const date = p.createdAt
    ? new Date(p.createdAt).toLocaleString()
    : new Date().toLocaleString();
  doc.text(`Report date: ${date}`, M, textY + 6);
  textY += 22;

  // Severity meter
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("SEVERITY", M, textY + 6);
  drawSeverityMeter(doc, M, textY + 12, W - 2 * M - 200, p.severity);
  textY += 48;

  // Confidence
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("CONFIDENCE", M, textY);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${p.confidence}%`, M + 90, textY);
  textY += 8;
  const barW = W - 2 * M - 200;
  doc.setFillColor(235, 235, 235);
  doc.roundedRect(M, textY, barW, 10, 5, 5, "F");
  const sc = SEV_COLORS[p.severity] || [BRAND.r, BRAND.g, BRAND.b];
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.roundedRect(M, textY, (barW * p.confidence) / 100, 10, 5, 5, "F");

  y = Math.max(imgBottom, textY + 30) + 24;

  // Rx box (auto-paginating)
  const rxBoxX = M;
  const rxBoxW = W - 2 * M;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
  doc.text("PRESCRIBED TREATMENT (Rx)", rxBoxX, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  const lineH = 16;
  const innerPad = 14;
  const rxLines = doc.splitTextToSize(p.rx, rxBoxW - innerPad * 2);

  let i = 0;
  while (i < rxLines.length) {
    const available = H - 80 - y;
    const linesFit = Math.max(1, Math.floor((available - innerPad * 2) / lineH));
    const chunk = rxLines.slice(i, i + linesFit);
    const boxH = chunk.length * lineH + innerPad * 2;
    doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
    doc.setFillColor(248, 250, 245);
    doc.setLineWidth(0.6);
    doc.roundedRect(rxBoxX, y, rxBoxW, boxH, 8, 8, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(chunk, rxBoxX + innerPad, y + innerPad + 11);
    y += boxH + 12;
    i += linesFit;
    if (i < rxLines.length) {
      doc.addPage();
      drawBrandHeader(doc);
      y = 110;
    }
  }

  // Timeline
  if (p.timeline && p.timeline.length) {
    if (y > H - 200) {
      doc.addPage();
      drawBrandHeader(doc);
      y = 110;
    }
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text("TREATMENT TIMELINE", M, y);
    y += 14;
    for (const step of p.timeline) {
      const lines = doc.splitTextToSize(step.text, W - 2 * M - 80);
      const boxH = 28 + lines.length * 14;
      if (y + boxH > H - 60) {
        doc.addPage();
        drawBrandHeader(doc);
        y = 110;
      }
      doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
      doc.roundedRect(M, y, 64, boxH, 6, 6, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(step.day, M + 32, y + 18, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(step.title, M + 76, y + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(lines, M + 76, y + 30);
      y += boxH + 8;
    }
  }

  // Disclaimer
  if (y > H - 90) {
    doc.addPage();
    drawBrandHeader(doc);
    y = 110;
  }
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const disc = doc.splitTextToSize(
    "This report is generated by LeafRx AI for informational purposes only. Consult a local agronomist before applying chemical treatments. Follow product labels and safety guidelines.",
    W - 2 * M,
  );
  doc.text(disc, M, y);

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let pg = 1; pg <= total; pg++) {
    doc.setPage(pg);
    drawFooter(doc, pg, total);
  }

  const safeName = p.diseaseName.replace(/[^a-z0-9]+/gi, "_").slice(0, 40);
  doc.save(`LeafRx_${safeName}_${Date.now()}.pdf`);
}
