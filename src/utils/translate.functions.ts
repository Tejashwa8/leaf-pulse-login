import { createServerFn } from "@tanstack/react-start";

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu",
  mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  pa: "Punjabi", ur: "Urdu", or: "Odia", as: "Assamese",
};

export const translateBatch = createServerFn({ method: "POST" })
  .inputValidator((input: { texts: string[]; target: string }) => {
    if (!Array.isArray(input?.texts)) throw new Error("texts must be an array");
    if (input.texts.length === 0 || input.texts.length > 400) throw new Error("Invalid batch size");
    if (!LANG_NAMES[input.target]) throw new Error("Unsupported language");
    return input;
  })
  .handler(async ({ data }): Promise<{ translations: string[] }> => {
    if (data.target === "en") return { translations: data.texts };
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const langName = LANG_NAMES[data.target];
    // Build a numbered list to keep alignment
    const numbered = data.texts.map((t, i) => `${i + 1}. ${t.replace(/\n/g, " ")}`).join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              `You are a professional translator. Translate each numbered English line into ${langName}. ` +
              `Preserve numbering, punctuation, emoji, brand names (LeafRx, Dr. LeafRx, AI), and arrows like →. ` +
              `Return ONLY the numbered translated lines, one per line, no extra commentary.`,
          },
          { role: "user", content: numbered },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("translate error", res.status, t);
      throw new Error("Translation failed");
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: string[] = data.texts.map((src, i) => {
      const found = lines.find((l) => l.startsWith(`${i + 1}.`) || l.startsWith(`${i + 1})`));
      if (found) return found.replace(/^\s*\d+[\.\)]\s*/, "");
      return src;
    });
    return { translations: out };
  });
