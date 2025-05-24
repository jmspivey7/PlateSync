-- Create churches table
CREATE TABLE IF NOT EXISTS "churches" (
  "id" varchar PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE' NOT NULL,
  "contact_email" varchar NOT NULL,
  "phone" varchar(20),
  "address" varchar(255),
  "city" varchar(100),
  "state" varchar(50),
  "zip_code" varchar(20),
  "logo_url" varchar,
  "website_url" varchar,
  "denomination" varchar(100),
  "notes" text,
  "members_count" integer DEFAULT 0,
  "account_owner_id" varchar REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "last_login_date" timestamp,
  "registration_date" timestamp DEFAULT now(),
  "deleted_at" timestamp,
  "archive_url" varchar
);

-- Insert a test church for development
INSERT INTO "churches" (
  "id", 
  "name", 
  "status", 
  "contact_email",
  "created_at",
  "updated_at"
) VALUES (
  'church_test1',
  'First Test Church',
  'ACTIVE',
  'test@example.com',
  NOW(),
  NOW()
);