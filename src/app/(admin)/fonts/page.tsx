import { listFonts } from "@/lib/data/fonts";
import { FontUpload } from "@/components/FontUpload";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteFontAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FontsPage() {
  const fonts = await listFonts();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Fonts</h1>
        <p className="text-sm text-neutral-400">
          Upload the exact fonts used in your Figma designs so rendered text matches.
        </p>
      </div>

      <div className="mb-8">
        <FontUpload />
      </div>

      {fonts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
          No fonts yet. Upload TTF / OTF / WOFF2 files.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-left text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Family</th>
                <th className="px-4 py-3 font-medium">Weight</th>
                <th className="px-4 py-3 font-medium">Style</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {fonts.map((f) => (
                <tr key={f.id} className="border-t border-neutral-800">
                  <td className="px-4 py-3">{f.name}</td>
                  <td className="px-4 py-3 text-neutral-400">{f.weight}</td>
                  <td className="px-4 py-3 text-neutral-400">{f.style}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={deleteFontAction}>
                      <input type="hidden" name="id" value={f.id} />
                      <ConfirmSubmit
                        message={`Delete ${f.name} ${f.weight}?`}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
