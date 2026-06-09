import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Font = {
  id: string;
  name: string;
  weight: number;
  style: string;
  fileUrl: string;
  createdAt: string;
};

type FontRow = {
  id: string;
  name: string;
  weight: number;
  style: string;
  file_url: string;
  created_at: string;
};

function toFont(r: FontRow): Font {
  return {
    id: r.id,
    name: r.name,
    weight: r.weight,
    style: r.style,
    fileUrl: r.file_url,
    createdAt: r.created_at,
  };
}

export async function listFonts(): Promise<Font[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("fonts")
    .select("*")
    .order("name", { ascending: true })
    .order("weight", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as FontRow[]).map(toFont);
}

export async function createFont(input: {
  name: string;
  weight: number;
  style: string;
  fileUrl: string;
}): Promise<Font> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("fonts")
    .insert({
      name: input.name,
      weight: input.weight,
      style: input.style,
      file_url: input.fileUrl,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toFont(data as FontRow);
}

export async function deleteFont(id: string): Promise<Font | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("fonts")
    .delete()
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data ? toFont(data as FontRow) : null;
}
