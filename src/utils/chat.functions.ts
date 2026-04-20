import { createServerFn } from "@tanstack/react-start";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type DiagnosisContext = {
  disease_name: string;
  severity: string;
  confidence: number;
  rx: string;
  created_at?: string;
};

export const askDrLeafRx = createServerFn({ method: "POST" })
  .inputValidator((input: { messages: ChatMessage[]; context?: DiagnosisContext | null }) => {
    if (!Array.isArray(input?.messages) || input.messages.length === 0) {
      throw new Error("No messages provided");
    }
    if (input.messages.length > 30) throw new Error("Conversation too long");
    for (const m of input.messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) throw new Error("Invalid message role");
      if (typeof m.content !== "string" || m.content.length === 0 || m.content.length > 2000) {
        throw new Error("Invalid message content");
      }
    }
    return input;
  })
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const ctx = data.context;
    const contextLine = ctx
      ? `\n\nThe farmer's MOST RECENT diagnosis from LeafRx:\n- Disease: ${ctx.disease_name}\n- Severity: ${ctx.severity}\n- Confidence: ${ctx.confidence}%\n- Prescribed Rx: ${ctx.rx}${ctx.created_at ? `\n- Scanned: ${new Date(ctx.created_at).toLocaleDateString()}` : ""}\n\nWhen the farmer asks follow-up questions (e.g. "how long until I see results?", "is it safe to spray now?", "what if it doesn't work?"), use this diagnosis as context. Refer to the disease and Rx by name when relevant.`
      : "";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Dr. LeafRx, a friendly and knowledgeable plant doctor and agronomist. You help farmers and gardeners diagnose plant issues, give practical treatment advice, prevention tips, watering/fertilizing guidance, soil care, organic remedies, and crop-protection strategies. Keep replies concise (under 180 words), warm, and actionable. Use simple language. When relevant, give step-by-step Rx. If the question is unrelated to plants, agriculture, gardening or crop care, politely steer back to plant topics." +
              contextLine,
          },
          ...data.messages,
        ],
      }),
    });

    if (res.status === 429) throw new Error("Too many questions right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      throw new Error("Dr. LeafRx is unavailable right now.");
    }

    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content;
    if (!reply) throw new Error("No response from Dr. LeafRx.");
    return { reply: String(reply).slice(0, 4000) };
  });
