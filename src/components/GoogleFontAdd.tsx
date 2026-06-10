"use client";

import { useActionState } from "react";
import {
  addGoogleFontAction,
  type GoogleFontState,
} from "@/app/(admin)/fonts/actions";
import { inputClass, btnPrimary } from "./Modal";

const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

export function GoogleFontAdd() {
  const [state, action, pending] = useActionState<GoogleFontState, FormData>(
    addGoogleFontAction,
    {}
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
    >
      <h2 className="mb-1 font-semibold">Add Google Font</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Type the exact family name (e.g. <span className="text-neutral-300">Poppins</span>,{" "}
        <span className="text-neutral-300">Playfair Display</span>) and pick weights. Files are
        downloaded and stored locally so renders don&apos;t depend on Google at runtime.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-400">Family name</label>
          <input name="family" required placeholder="Poppins" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Style</label>
          <select name="style" defaultValue="normal" className={inputClass}>
            <option value="normal">normal</option>
            <option value="italic">italic</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs text-neutral-400">Weights</label>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map((w) => (
            <label
              key={w}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-sm text-neutral-300 has-[:checked]:border-sky-500 has-[:checked]:text-white"
            >
              <input
                type="checkbox"
                name="weights"
                value={w}
                defaultChecked={w === 400}
                className="accent-sky-500"
              />
              {w}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Fetching…" : "Add font"}
        </button>
        {state.error && <span className="text-sm text-red-400">{state.error}</span>}
        {state.ok && <span className="text-sm text-emerald-400">{state.ok}</span>}
      </div>
    </form>
  );
}
