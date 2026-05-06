import { createServerFn } from "@tanstack/react-start";

export type Diagnosis = {
  name: string;
  commonName?: string;
  scientificName?: string;
  conf: number;
  sev: "Severe" | "High" | "Moderate" | "Low";
  rx: string;
  fullTreatment?: string;
  prevention?: string;
};

const diagnoseTool = {
  type: "function" as const,
  function: {
    name: "report_diagnosis",
    description: "Report a structured plant disease diagnosis from a leaf image.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Crop and disease, formatted like 'Tomato — Early Blight'. If no disease, use 'Healthy Leaf'.",
        },
        commonName: {
          type: "string",
          description: "Common (everyday) name of the plant, e.g. 'Tomato', 'Mango'. Use 'Unknown' if not a leaf.",
        },
        scientificName: {
          type: "string",
          description: "Latin/scientific binomial name of the plant, e.g. 'Solanum lycopersicum'. Use 'Unknown' if not a leaf.",
        },
        conf: {
          type: "number",
          description: "Confidence percentage 0-100",
        },
        sev: {
          type: "string",
          enum: ["Severe", "High", "Moderate", "Low"],
          description: "Severity. Use 'Low' for healthy leaves.",
        },
        rx: {
          type: "string",
          description: "One-to-two sentence quick treatment summary tailored to the disease. For healthy leaves, give a brief care tip.",
        },
        fullTreatment: {
          type: "string",
          description: "Detailed step-by-step cure plan: what the user should do from their side at home/farm — pruning, sanitation, organic remedies, chemical options with dosage, frequency, watering, sunlight, soil care. 4-8 clear sentences or bullet-style lines separated by newlines.",
        },
        prevention: {
          type: "string",
          description: "2-4 short prevention tips to avoid recurrence (spacing, watering practice, resistant varieties, etc.).",
        },
      },
      required: ["name", "commonName", "scientificName", "conf", "sev", "rx", "fullTreatment", "prevention"],
      additionalProperties: false,
    },
  },
};

export const diagnoseLeaf = createServerFn({ method: "POST" })
  .inputValidator((input: { imageDataUrl: string }) => {
    if (!input?.imageDataUrl?.startsWith("data:image/")) {
      throw new Error("Invalid image data");
    }
    if (input.imageDataUrl.length > 8_000_000) {
      throw new Error("Image too large (max ~6MB).");
    }
    return input;
  })
  .handler(async ({ data }): Promise<Diagnosis> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        top_p: 0.1,
        seed: 42,
        messages: [
          {
            role: "system",
            content:
              "You are LeafRx, an expert agricultural plant pathologist. Analyze the provided leaf image and identify the plant and any disease. Be deterministic — for the SAME image you MUST always return the SAME diagnosis. Always respond by calling the report_diagnosis tool. Provide the plant's common name AND scientific (Latin binomial) name so anyone can understand. Provide a clear, actionable full treatment plan that a regular person can follow at home — what to do from their side, step by step, including organic and chemical options with dosage and frequency. Be honest about uncertainty in the confidence score. If the image is not a leaf, set name='Not a leaf', commonName='Unknown', scientificName='Unknown', sev='Low', conf=0, rx='Please upload a clear photo of a plant leaf.', fullTreatment='', prevention=''.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Diagnose this leaf. Identify the plant (common + scientific name), the disease (if any), severity, prescribe a short Rx, then a detailed full treatment plan and prevention tips. Be consistent — the same image should always produce the same answer." },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
        tools: [diagnoseTool],
        tool_choice: { type: "function", function: { name: "report_diagnosis" } },
      }),
    });

    if (res.status === 429) throw new Error("Rate limit reached. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      throw new Error("Diagnosis failed. Please try again.");
    }

    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) throw new Error("Model did not return a structured diagnosis.");

    const parsed = JSON.parse(call.function.arguments) as Diagnosis;
    return {
      name: String(parsed.name).slice(0, 120),
      commonName: parsed.commonName ? String(parsed.commonName).slice(0, 80) : undefined,
      scientificName: parsed.scientificName ? String(parsed.scientificName).slice(0, 120) : undefined,
      conf: Math.max(0, Math.min(100, Math.round(Number(parsed.conf) || 0))),
      sev: (["Severe", "High", "Moderate", "Low"] as const).includes(parsed.sev) ? parsed.sev : "Moderate",
      rx: String(parsed.rx).slice(0, 500),
      fullTreatment: parsed.fullTreatment ? String(parsed.fullTreatment).slice(0, 2000) : undefined,
      prevention: parsed.prevention ? String(parsed.prevention).slice(0, 800) : undefined,
    };
  });
