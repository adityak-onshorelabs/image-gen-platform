"use client";

import { useActionState } from "react";
import {
  uploadFontAction,
  type FontUploadState,
} from "@/app/(admin)/fonts/actions";
import { inputClass, btnPrimary } from "./Modal";

export function FontUpload() {
  const [state, action, pending] = useActionState<FontUploadState, FormData>(
    uploadFontAction,
    {}
  );

  return (
    <form
      action={action}
      className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
    >
      <h2 className="mb-4 font-semibold">Upload Font</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-neutral-400">
            Family name
          </label>
          <input name="name" required placeholder="Inter" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Weight</label>
          <select name="weight" defaultValue="400" className={inputClass}>
            {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-400">Style</label>
          <select name="style" defaultValue="normal" className={inputClass}>
            <option value="normal">normal</option>
            <option value="italic">italic</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".ttf,.otf,.woff2"
          required
          className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-sm file:text-neutral-200 hover:file:bg-neutral-700"
        />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      {state.ok && (
        <p className="mt-3 text-sm text-emerald-400">Font uploaded.</p>
      )}
    </form>
  );
}
