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
    <div className="space-y-4">
      <div
        className="mx-auto flex max-h-[60vh] items-center justify-center overflow-hidden rounded-xl border border-neutral-800 bg-[repeating-conic-gradient(#1a1a1a_0_25%,#222_0_50%)] bg-[length:24px_24px]"
        style={{ aspectRatio: ratio, maxWidth: "100%", width: Math.min(width, 560) }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Base template" className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-neutral-500">No base image</span>
        )}
      </div>

      <form action={action} className="flex items-center gap-3">
        <input type="hidden" name="templateId" value={templateId} />
        <input type="hidden" name="projectSlug" value={projectSlug} />
        <input type="hidden" name="tslug" value={tslug} />
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="block w-full text-sm text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-sm file:text-neutral-200 hover:file:bg-neutral-700"
        />
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? "Uploading…" : baseImageUrl ? "Replace" : "Upload"}
        </button>
      </form>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-400">Base image saved.</p>}
      <p className="text-xs text-neutral-600">
        Figma export, normalized to {width}×{height} PNG. PNG / JPEG / WEBP, max 15 MB.
      </p>
    </div>
  );
}
