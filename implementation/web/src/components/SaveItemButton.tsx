"use client";

import { useEffect, useState } from "react";

export function SaveItemButton({
  itemType,
  itemSlug
}: {
  itemType: "event" | "venue" | "movie" | "restaurant" | "activity";
  itemSlug: string;
}) {
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/saved")
      .then((r) => r.json())
      .then((data) => {
        const list = (data?.items ?? []) as { itemType: string; itemSlug: string }[];
        setSaved(list.some((i) => i.itemType === itemType && i.itemSlug === itemSlug));
      })
      .catch(() => {});
  }, [itemType, itemSlug]);

  async function toggle() {
    setNotice(null);
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemSlug })
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json?.error ?? "Sign in on Account page to save");
      return;
    }
    setSaved(Boolean(json.saved));
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void toggle()}
        className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
          saved
            ? "border-[#5b3df5] bg-[#5b3df5] text-white"
            : "border-white/30 bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        {saved ? "Saved ✓" : "Save Event"}
      </button>
      {notice ? <span className="text-[11px] text-[#fca5a5]">{notice}</span> : null}
    </div>
  );
}
