import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Layer } from "@/lib/layer-types";

type LayerRow = {
  id: string;
  template_id: string;
  name: string;
  type: string;
  is_dynamic: boolean;
  default_value: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  opacity: number;
  hidden: boolean;
  font_family: string | null;
  font_size: number | null;
  font_weight: number | null;
  font_style: string | null;
  font_color: string | null;
  text_transform: string | null;
  alignment: string | null;
  vertical_align: string | null;
  line_height: string | number | null;
  letter_spacing: string | number | null;
  max_lines: number | null;
  auto_resize: boolean | null;
  overflow_mode: string | null;
  fit_mode: string | null;
  border_radius: number | null;
};

function toLayer(r: LayerRow): Layer {
  return {
    id: r.id,
    name: r.name,
    type: r.type as Layer["type"],
    isDynamic: r.is_dynamic,
    defaultValue: r.default_value,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    zIndex: r.z_index,
    opacity: r.opacity,
    hidden: r.hidden,
    fontFamily: r.font_family,
    fontSize: r.font_size,
    fontWeight: r.font_weight,
    fontStyle: r.font_style as Layer["fontStyle"],
    fontColor: r.font_color,
    textTransform: r.text_transform as Layer["textTransform"],
    alignment: r.alignment as Layer["alignment"],
    verticalAlign: r.vertical_align as Layer["verticalAlign"],
    lineHeight: r.line_height == null ? null : Number(r.line_height),
    letterSpacing: r.letter_spacing == null ? null : Number(r.letter_spacing),
    maxLines: r.max_lines,
    autoResize: r.auto_resize,
    overflowMode: r.overflow_mode as Layer["overflowMode"],
    fitMode: r.fit_mode as Layer["fitMode"],
    borderRadius: r.border_radius,
  };
}

function toRow(templateId: string, l: Layer, zIndex: number) {
  return {
    id: l.id,
    template_id: templateId,
    name: l.name,
    type: l.type,
    is_dynamic: l.isDynamic,
    default_value: l.defaultValue,
    x: Math.round(l.x),
    y: Math.round(l.y),
    width: Math.round(l.width),
    height: Math.round(l.height),
    z_index: zIndex,
    opacity: l.opacity,
    hidden: l.hidden,
    font_family: l.fontFamily,
    font_size: l.fontSize,
    font_weight: l.fontWeight,
    font_style: l.fontStyle,
    font_color: l.fontColor,
    text_transform: l.textTransform,
    alignment: l.alignment,
    vertical_align: l.verticalAlign,
    line_height: l.lineHeight,
    letter_spacing: l.letterSpacing,
    max_lines: l.maxLines,
    auto_resize: l.autoResize,
    overflow_mode: l.overflowMode,
    fit_mode: l.fitMode,
    border_radius: l.borderRadius,
  };
}

export async function listLayers(templateId: string): Promise<Layer[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("layers")
    .select("*")
    .eq("template_id", templateId)
    .order("z_index", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as LayerRow[]).map(toLayer);
}

/**
 * Reconcile the template's layers to exactly `layers` (array order = z-index):
 * delete removed rows, upsert the rest, bump template version.
 */
export async function saveLayers(
  templateId: string,
  layers: Layer[]
): Promise<void> {
  const sb = supabaseAdmin();

  // delete rows no longer present
  const keepIds = layers.map((l) => l.id);
  let del = sb.from("layers").delete().eq("template_id", templateId);
  if (keepIds.length > 0) del = del.not("id", "in", `(${keepIds.join(",")})`);
  const { error: delErr } = await del;
  if (delErr) throw delErr;

  // upsert current set with array-order z-index
  if (layers.length > 0) {
    const rows = layers.map((l, i) => toRow(templateId, l, i));
    const { error: upErr } = await sb.from("layers").upsert(rows, { onConflict: "id" });
    if (upErr) throw upErr;
  }

  // bump template version (cache key)
  const { data: tpl, error: tErr } = await sb
    .from("templates")
    .select("version")
    .eq("id", templateId)
    .single();
  if (tErr) throw tErr;
  const { error: vErr } = await sb
    .from("templates")
    .update({ version: (tpl.version as number) + 1, updated_at: new Date().toISOString() })
    .eq("id", templateId);
  if (vErr) throw vErr;
}
