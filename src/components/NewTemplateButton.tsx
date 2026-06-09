"use client";

import { useState } from "react";
import { Modal, inputClass, btnPrimary, btnGhost } from "./Modal";
import { createTemplateAction } from "@/app/(admin)/projects/actions";
import { ALL_PRESETS, PRESET_GROUPS } from "@/lib/presets";

const CUSTOM = "__custom__";

export function NewTemplateButton({ projectSlug }: { projectSlug: string }) {
  return (
    <Modal
      title="New Template"
      trigger={(open) => (
        <button className={btnPrimary} onClick={open}>
          + New Template
        </button>
      )}
    >
      {(close) => <TemplateForm projectSlug={projectSlug} close={close} />}
    </Modal>
  );
}

function TemplateForm({
  projectSlug,
  close,
}: {
  projectSlug: string;
  close: () => void;
}) {
  const [presetLabel, setPresetLabel] = useState(ALL_PRESETS[0].label);
  const preset = ALL_PRESETS.find((p) => p.label === presetLabel);
  const isCustom = presetLabel === CUSTOM;
  const [w, setW] = useState(preset?.width ?? 1080);
  const [h, setH] = useState(preset?.height ?? 1080);

  function onPreset(label: string) {
    setPresetLabel(label);
    const p = ALL_PRESETS.find((x) => x.label === label);
    if (p) {
      setW(p.width);
      setH(p.height);
    }
  }

  return (
    <form action={createTemplateAction} className="space-y-4">
      <input type="hidden" name="projectSlug" value={projectSlug} />
      <div>
        <label className="mb-1 block text-sm text-neutral-300">Template Name</label>
        <input name="name" required autoFocus className={inputClass} />
      </div>

      <div>
        <label className="mb-1 block text-sm text-neutral-300">Format</label>
        <select
          className={inputClass}
          value={presetLabel}
          onChange={(e) => onPreset(e.target.value)}
        >
          {PRESET_GROUPS.map((g) => (
            <optgroup key={g.group} label={g.group}>
              {g.presets.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} — {p.width}×{p.height}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>Custom…</option>
        </select>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-neutral-300">Width</label>
          <input
            name="width"
            type="number"
            min={1}
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            readOnly={!isCustom}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm text-neutral-300">Height</label>
          <input
            name="height"
            type="number"
            min={1}
            value={h}
            onChange={(e) => setH(Number(e.target.value))}
            readOnly={!isCustom}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className={btnGhost} onClick={close}>
          Cancel
        </button>
        <button type="submit" className={btnPrimary}>
          Create
        </button>
      </div>
    </form>
  );
}
