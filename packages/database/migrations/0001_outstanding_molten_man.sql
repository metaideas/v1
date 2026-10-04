CREATE TABLE "auth"."jwks" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"private_key" text NOT NULL,
	"public_key" text NOT NULL
);
