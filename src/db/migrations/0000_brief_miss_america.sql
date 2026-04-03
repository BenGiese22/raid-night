CREATE TABLE "bingo_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"pattern" text NOT NULL,
	"fired_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "called_phrases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"called_by" uuid NOT NULL,
	"called_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "called_phrases_session_id_phrase_unique" UNIQUE("session_id","phrase")
);
--> statement-breakpoint
CREATE TABLE "phrase_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"phrase" text NOT NULL,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "phrase_submissions_session_id_phrase_unique" UNIQUE("session_id","phrase")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"phrase_pool" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'collecting' NOT NULL,
	"visibility" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_lock_at" timestamp with time zone,
	"locked_at" timestamp with time zone,
	CONSTRAINT "sessions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tile_marks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"tile_index" integer NOT NULL,
	"phrase" text NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tile_marks_player_id_tile_index_unique" UNIQUE("player_id","tile_index")
);
--> statement-breakpoint
ALTER TABLE "bingo_events" ADD CONSTRAINT "bingo_events_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "called_phrases" ADD CONSTRAINT "called_phrases_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phrase_submissions" ADD CONSTRAINT "phrase_submissions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tile_marks" ADD CONSTRAINT "tile_marks_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;