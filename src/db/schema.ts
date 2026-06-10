import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  numeric,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// --- projects ---
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- templates ---
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    baseImageUrl: text("base_image_url"),
    outputFormat: text("output_format").notNull().default("png"),
    defaultQuality: text("default_quality").notNull().default("high"),
    dpi: integer("dpi").notNull().default(72),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectSlugUnique: unique().on(t.projectId, t.slug),
  })
);

// --- layers ---
export const layers = pgTable(
  "layers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // API key; unique within template
    type: text("type").notNull(), // text | image
    isDynamic: boolean("is_dynamic").notNull().default(true),
    defaultValue: text("default_value"),

    x: integer("x").notNull().default(0),
    y: integer("y").notNull().default(0),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    zIndex: integer("z_index").notNull().default(0),
    opacity: integer("opacity").notNull().default(100),
    hidden: boolean("hidden").notNull().default(false),

    // text-only
    fontFamily: text("font_family"),
    fontSize: integer("font_size"),
    fontWeight: integer("font_weight"),
    fontStyle: text("font_style"), // normal | italic
    fontColor: text("font_color"),
    textTransform: text("text_transform"), // none | uppercase | lowercase | titlecase | small_caps
    alignment: text("alignment"), // left | center | right
    verticalAlign: text("vertical_align"), // top | middle | bottom
    lineHeight: numeric("line_height"),
    letterSpacing: numeric("letter_spacing"),
    maxLines: integer("max_lines"),
    autoResize: boolean("auto_resize"),
    overflowMode: text("overflow_mode"), // scale_down | truncate | expand_height

    // image-only
    fitMode: text("fit_mode"), // cover | contain | stretch
    borderRadius: integer("border_radius"),
  },
  (t) => ({
    templateNameUnique: unique().on(t.templateId, t.name),
  })
);

// --- fonts ---
export const fonts = pgTable("fonts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  weight: integer("weight").notNull().default(400),
  style: text("style").notNull().default("normal"), // normal | italic
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- generated_images ---
export const generatedImages = pgTable("generated_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "cascade" }),
  templateVersion: integer("template_version").notNull(),
  imageUrl: text("image_url").notNull(),
  renderPayload: jsonb("render_payload"),
  payloadHash: text("payload_hash"),
  format: text("format").notNull(),
  durationMs: integer("duration_ms"),
  cached: boolean("cached").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
