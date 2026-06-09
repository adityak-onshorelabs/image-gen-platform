"use client";

import { useState } from "react";

/** Lightweight trigger + overlay dialog. No external deps. */
export function Modal({
  trigger,
  title,
  children,
}: {
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold">{title}</h2>
            {children(() => setOpen(false))}
          </div>
        </div>
      )}
    </>
  );
}

export const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm outline-none focus:border-sky-500";
export const btnPrimary =
  "rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-sky-400 disabled:opacity-60";
export const btnGhost =
  "rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800";
