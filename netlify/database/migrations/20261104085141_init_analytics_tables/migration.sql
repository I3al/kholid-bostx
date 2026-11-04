CREATE TABLE "admin_sessions" (
	"id" serial PRIMARY KEY,
	"token" text NOT NULL UNIQUE,
	"username" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversion_events" (
	"id" serial PRIMARY KEY,
	"event_type" text NOT NULL,
	"page" text NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY,
	"path" text NOT NULL,
	"referrer" text,
	"title" text,
	"user_agent" text,
	"browser" text,
	"device" text,
	"os" text,
	"ip" text,
	"country" text,
	"city" text,
	"search_keyword" text,
	"duration" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
