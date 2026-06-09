CREATE TABLE IF NOT EXISTS "fonts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"weight" integer DEFAULT 400 NOT NULL,
	"style" text DEFAULT 'normal' NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "generated_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"template_version" integer NOT NULL,
	"image_url" text NOT NULL,
	"render_payload" jsonb,
	"payload_hash" text,
	"format" text NOT NULL,
	"duration_ms" integer,
	"cached" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_dynamic" boolean DEFAULT true NOT NULL,
	"default_value" text,
	"x" integer DEFAULT 0 NOT NULL,
	"y" integer DEFAULT 0 NOT NULL,
	"width" integer DEFAULT 0 NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"z_index" integer DEFAULT 0 NOT NULL,
	"opacity" integer DEFAULT 100 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"font_family" text,
	"font_size" integer,
	"font_weight" integer,
	"font_color" text,
	"alignment" text,
	"vertical_align" text,
	"line_height" numeric,
	"letter_spacing" numeric,
	"max_lines" integer,
	"auto_resize" boolean,
	"overflow_mode" text,
	"fit_mode" text,
	"border_radius" integer,
	CONSTRAINT "layers_template_id_name_unique" UNIQUE("template_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"base_image_url" text,
	"output_format" text DEFAULT 'png' NOT NULL,
	"default_quality" text DEFAULT 'high' NOT NULL,
	"dpi" integer DEFAULT 72 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "templates_project_id_slug_unique" UNIQUE("project_id","slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "generated_images" ADD CONSTRAINT "generated_images_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "layers" ADD CONSTRAINT "layers_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "templates" ADD CONSTRAINT "templates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
