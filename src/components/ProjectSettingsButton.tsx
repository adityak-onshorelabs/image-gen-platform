"use client";

import { Modal, inputClass, btnPrimary, btnGhost } from "./Modal";
import { ConfirmSubmit } from "./ConfirmSubmit";
import {
  updateProjectAction,
  deleteProjectAction,
} from "@/app/(admin)/projects/actions";

export function ProjectSettingsButton({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string | null;
}) {
  return (
    <Modal
      title="Project Settings"
      trigger={(open) => (
        <button className={btnGhost} onClick={open}>
          Settings
        </button>
      )}
    >
      {(close) => (
        <div className="space-y-6">
          <form action={updateProjectAction} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <div>
              <label className="mb-1 block text-sm text-neutral-300">Name</label>
              <input
                name="name"
                defaultValue={name}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-neutral-300">
                Description
              </label>
              <textarea
                name="description"
                defaultValue={description ?? ""}
                rows={3}
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={btnGhost} onClick={close}>
                Cancel
              </button>
              <button type="submit" className={btnPrimary}>
                Save
              </button>
            </div>
          </form>

          <div className="border-t border-neutral-800 pt-4">
            <p className="mb-2 text-sm text-neutral-400">
              Deleting a project removes all its templates and layers.
            </p>
            <form action={deleteProjectAction}>
              <input type="hidden" name="id" value={id} />
              <ConfirmSubmit
                message="Delete this project and all its templates? This cannot be undone."
                className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-400 transition hover:bg-red-950"
              >
                Delete Project
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
}
