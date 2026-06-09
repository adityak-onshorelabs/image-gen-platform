"use client";

import { Modal, inputClass, btnPrimary, btnGhost } from "./Modal";
import { createProjectAction } from "@/app/(admin)/projects/actions";

export function NewProjectButton() {
  return (
    <Modal
      title="New Project"
      trigger={(open) => (
        <button className={btnPrimary} onClick={open}>
          + New Project
        </button>
      )}
    >
      {(close) => (
        <form action={createProjectAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Name</label>
            <input name="name" required autoFocus className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Description
            </label>
            <textarea name="description" rows={3} className={inputClass} />
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
      )}
    </Modal>
  );
}
