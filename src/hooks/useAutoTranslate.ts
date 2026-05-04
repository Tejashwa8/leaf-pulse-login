/**
 * Whole-page auto-translation.
 * Walks visible text nodes, translates them via Lovable AI, swaps in place,
 * and caches per-language in localStorage so subsequent loads are instant.
 *
 * Original English source is captured on the FIRST run per node so we can
 * always restore or re-translate from the canonical English text.
 */
import { useEffect, useRef } from "react";
import { useLang } from "@/lib/i18n";
import { translateBatch } from "@/utils/translate.functions";

const ORIG_ATTR = "data-i18n-orig";
const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "SVG", "PATH", "CANVAS",
  "TEXTAREA", "INPUT",
]);
const KEEP_AS_IS = /^[\s\d\W]+$/; // pure whitespace / numbers / symbols
const BRAND_ONLY = /^(LeafRx|Leaf|Rx|Dr\.?\s*LeafRx)$/i;

function cacheKey(target: string) {
  return `leafrx_tx_${target}`;
}

function loadCache(target: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(cacheKey(target));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(target: string, cache: Record<string, string>) {
  try {
    localStorage.setItem(cacheKey(target), JSON.stringify(cache));
  } catch {}
}

function collectTextNodes(): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const t = node.nodeValue;
      if (!t || !t.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-i18n-skip]")) return NodeFilter.FILTER_REJECT;
      if (KEEP_AS_IS.test(t)) return NodeFilter.FILTER_REJECT;
      if (BRAND_ONLY.test(t.trim())) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) out.push(n as Text);
  return out;
}

async function translateAll(target: string, signal: { cancelled: boolean }) {
  const cache = loadCache(target);
  const nodes = collectTextNodes();

  // Capture original English on first sight; restore from original each pass.
  for (const node of nodes) {
    const parent = node.parentElement!;
    let original = parent.getAttribute(ORIG_ATTR);
    // Use per-node store via a sibling map; simplest: store on parent only when single text child.
    const isOnlyText =
      parent.childNodes.length === 1 && parent.firstChild === node;
    if (isOnlyText) {
      if (!original) parent.setAttribute(ORIG_ATTR, node.nodeValue || "");
      original = parent.getAttribute(ORIG_ATTR) || node.nodeValue || "";
    } else {
      original = node.nodeValue || "";
    }

    if (target === "en") {
      if (isOnlyText && original) node.nodeValue = original;
      continue;
    }

    const trimmed = (original || "").trim();
    if (!trimmed) continue;
    const cached = cache[trimmed];
    if (cached) {
      node.nodeValue = (node.nodeValue || "").replace(trimmed, cached);
      continue;
    }
  }

  if (target === "en") return;

  // Build list of unique strings still missing
  const missing = new Set<string>();
  for (const node of nodes) {
    const parent = node.parentElement!;
    const original =
      parent.getAttribute(ORIG_ATTR) || node.nodeValue || "";
    const trimmed = original.trim();
    if (trimmed && !cache[trimmed]) missing.add(trimmed);
  }

  const list = Array.from(missing);
  // Batch in chunks of 40 to keep prompts small
  const CHUNK = 40;
  for (let i = 0; i < list.length; i += CHUNK) {
    if (signal.cancelled) return;
    const batch = list.slice(i, i + CHUNK);
    try {
      const { translations } = await translateBatch({
        data: { texts: batch, target },
      });
      batch.forEach((src, idx) => {
        const tx = translations[idx];
        if (tx && tx !== src) cache[src] = tx;
      });
      saveCache(target, cache);
      // Apply progressively
      for (const node of nodes) {
        const parent = node.parentElement;
        if (!parent) continue;
        const original =
          parent.getAttribute(ORIG_ATTR) || node.nodeValue || "";
        const trimmed = original.trim();
        const tx = cache[trimmed];
        if (tx && node.nodeValue !== tx) {
          node.nodeValue = (node.nodeValue || "").replace(trimmed, tx);
        }
      }
    } catch (e) {
      console.warn("translate batch failed", e);
      break;
    }
  }
}

export function useAutoTranslate() {
  const [lang] = useLang();
  const lastRef = useRef<string>("");

  useEffect(() => {
    if (!lang) return;
    if (lastRef.current === lang) return;
    lastRef.current = lang;
    const signal = { cancelled: false };
    // Slight delay so React finishes painting the dictionary-translated UI first
    const id = setTimeout(() => {
      translateAll(lang, signal).catch(() => {});
    }, 150);
    return () => {
      signal.cancelled = true;
      clearTimeout(id);
    };
  }, [lang]);

  // Re-run when DOM mutates significantly (new sections, modals)
  useEffect(() => {
    if (lang === "en") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const obs = new MutationObserver(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        translateAll(lang, { cancelled: false }).catch(() => {});
      }, 600);
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: false });
    return () => {
      obs.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [lang]);
}
