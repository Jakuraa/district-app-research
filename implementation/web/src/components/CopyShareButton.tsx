"use client";

import { useState } from "react";

export function CopyShareButton({ path, label = "Share Storefront" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="rounded-xl border border-[#e4e6f0] bg-white px-3.5 py-2 text-xs font-bold text-[#111319] hover:border-[#5b3df5]"
    >
      {copied ? "Link Copied ✓" : label}
    </button>
  );
}
