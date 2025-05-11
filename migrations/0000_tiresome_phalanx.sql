CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'OPEN' NOT NULL,
	"service" varchar(100),
	"total_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"church_id" varchar,
	"primary_attestor_id" varchar,
	"primary_attestor_name" varchar,
	"primary_attestation_date" timestamp,
	"secondary_attestor_id" varchar,
	"secondary_attestor_name" varchar,
	"secondary_attestation_date" timestamp,
	"attestation_confirmed_by" varchar,
	"attestation_confirmation_date" timestamp
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"donation_type" varchar(10) NOT NULL,
	"check_number" varchar(50),
	"notes" text,
	"member_id" integer,
	"batch_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"notification_status" varchar(20) DEFAULT 'PENDING',
	"church_id" varchar
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_type" varchar(50) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text NOT NULL,
	"church_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar,
	"phone" varchar,
	"is_visitor" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"notes" text,
	"church_id" varchar,
	"external_id" varchar(100),
	"external_system" varchar(50),
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "planning_center_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"church_id" varchar NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"church_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"value" varchar(50) NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"church_id" varchar
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" varchar,
	"email" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"bio" text,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'STANDARD' NOT NULL,
	"password" varchar,
	"is_verified" boolean DEFAULT false,
	"password_reset_token" varchar,
	"password_reset_expires" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"church_name" varchar,
	"church_logo_url" varchar,
	"email_notifications_enabled" boolean DEFAULT false,
	"church_id" varchar,
	"is_account_owner" boolean DEFAULT false,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_password_reset_token_unique" UNIQUE("password_reset_token")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"church_id" varchar NOT NULL,
	"code" varchar(6) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_primary_attestor_id_users_id_fk" FOREIGN KEY ("primary_attestor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_secondary_attestor_id_users_id_fk" FOREIGN KEY ("secondary_attestor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batches" ADD CONSTRAINT "batches_attestation_confirmed_by_users_id_fk" FOREIGN KEY ("attestation_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_center_tokens" ADD CONSTRAINT "planning_center_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planning_center_tokens" ADD CONSTRAINT "planning_center_tokens_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_recipients" ADD CONSTRAINT "report_recipients_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_options" ADD CONSTRAINT "service_options_church_id_users_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");