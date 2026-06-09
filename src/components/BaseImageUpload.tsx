"use client";

import { useActionState } from "react";
import {
  uploadBaseImageAction,
  type UploadState,
} from "@/app/(admin)/projects/[slug]/templates/[tslug]/actions";
import { btnPrimary } from "./Modal";

export function BaseImageUpload({
  templateId,
  projectSlug,
  tslug,
  width,
  height,
  baseImageUrl,
  version,
}: {
  templateId: string;
  projectSlug: string;
  tslug: string;
  width: number;
  height: number;
  baseImageUrl: string | null;
  version: number;
}) {
  const [state, action, pending] = useActionState<UploadState, FormData>(
    uploadBaseImageAction,
    {}
  );

  // cache-bust: file route serves immutable, so pin the URL to the version
  const src = baseImageUrl ? `${baseImageUrl}?v=${version}` : null;
  const ratio = `${width} / ${height}`;

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 p-3"
    >
      {/* compact thumbnail */}
      <div
        className="flex h-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-800 bg-[repeating-conic-gradient(#1a1a1a_0_25%,#222_0_50%)] bg-[length:12px_12px]"
        style={{ aspectRatio: ratio }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Base template" className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-[10px] text-neutral-500">No base</span>
        )}
      </div>

      <input type="hidden" name="templateId" value={templateId} />
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <input type="hidden" name="tslug" value={tslug} />

      <div className="min-w-0 flex-1">
        <div className="mb-1 text-sm text-neutral-300">Base template</div>
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-sm file:text-neutral-200 hover:file:bg-neutral-700"
        />
        <p className="mt-1 text-xs text-neutral-600">
          Normalized to {width}×{height} PNG. PNG / JPEG / WEBP, max 15 MB.
          {state.error && <span className="ml-2 text-red-400">{state.error}</span>}
          {state.ok && <span className="ml-2 text-emerald-400">Saved.</span>}
        </p>
      </div>

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Uploading…" : baseImageUrl ? "Replace" : "Upload"}
      </button>
    </form>
  );
}
