import {
  pgTable,
  text,
  serial,
  integer,
  decimal,
  varchar,
  timestamp,
  boolean,
  json,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { format } from "date-fns";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Define user roles enum
export const userRoleEnum = z.enum(["ADMIN", "USHER"]);
export type UserRole = z.infer<typeof userRoleEnum>;

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  bio: text("bio"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("USHER").notNull(),
  // Password and verification fields
  password: varchar("password"),
  isVerified: boolean("is_verified").default(false),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  churchName: varchar("church_name"),
  churchLogoUrl: varchar("church_logo_url"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true),
});

// Church members table
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").unique(),
  phone: varchar("phone"),
  isVisitor: boolean("is_visitor").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
  churchId: varchar("church_id").references(() => users.id),
});

// Donation types enum
export const donationTypeEnum = z.enum(["CASH", "CHECK"]);

// Notification status enum
export const notificationStatusEnum = z.enum(["PENDING", "SENT", "FAILED", "NOT_REQUIRED"]);

// Batch status enum
export const batchStatusEnum = z.enum(["OPEN", "CLOSED", "FINALIZED"]);

// Service options table
export const serviceOptions = pgTable("service_options", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  value: varchar("value", { length: 50 }).notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  churchId: varchar("church_id").references(() => users.id),
});

// Batches table
export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).default("OPEN").notNull(),
  service: varchar("service", { length: 100 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  churchId: varchar("church_id").references(() => users.id),
  // Attestation fields
  primaryAttestorId: varchar("primary_attestor_id").references(() => users.id),
  primaryAttestorName: varchar("primary_attestor_name"),
  primaryAttestationDate: timestamp("primary_attestation_date"),
  secondaryAttestorId: varchar("secondary_attestor_id").references(() => users.id),
  secondaryAttestorName: varchar("secondary_attestor_name"),
  secondaryAttestationDate: timestamp("secondary_attestation_date"),
  attestationConfirmedBy: varchar("attestation_confirmed_by").references(() => users.id),
  attestationConfirmationDate: timestamp("attestation_confirmation_date"),
});

// Donations table
export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  date: timestamp("date").defaultNow().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  donationType: varchar("donation_type", { length: 10 }).notNull(),
  checkNumber: varchar("check_number", { length: 50 }),
  notes: text("notes"),
  memberId: integer("member_id").references(() => members.id),
  batchId: integer("batch_id").references(() => batches.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notificationStatus: varchar("notification_status", { length: 20 }).default("PENDING"),
  churchId: varchar("church_id").references(() => users.id),
});

// Relations for members, batches, and donations
export const membersRelations = relations(members, ({ many }) => ({
  donations: many(donations),
}));

export const batchesRelations = relations(batches, ({ many }) => ({
  donations: many(donations),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  member: one(members, {
    fields: [donations.memberId],
    references: [members.id],
  }),
  batch: one(batches, {
    fields: [donations.batchId],
    references: [batches.id],
  }),
}));

// Schema validation for members
export const insertMemberSchema = createInsertSchema(members).pick({
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  isVisitor: true,
  notes: true,
  churchId: true,
});

// Schema validation for batches
export const insertBatchSchema = createInsertSchema(batches).pick({
  name: true,
  date: true,
  notes: true,
  status: true,
  service: true,
  totalAmount: true,
  churchId: true,
});

// Schema for batch attestation
export const batchAttestationSchema = z.object({
  primaryAttestorId: z.string(),
  primaryAttestorName: z.string().min(1, "Name is required"),
  secondaryAttestorId: z.string().min(1, "Secondary attestor is required"),
  secondaryAttestorName: z.string().min(1, "Name is required"),
});

// Schema validation for donations
export const insertDonationSchema = createInsertSchema(donations)
  .pick({
    date: true,
    amount: true,
    donationType: true,
    checkNumber: true,
    notes: true,
    memberId: true,
    batchId: true,
    churchId: true,
  })
  .superRefine((val, ctx) => {
    if (val.donationType === "CHECK" && !val.checkNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check number is required for check donations",
        path: ["checkNumber"],
      });
    }
  });

// Schema for updating user/church settings
export const updateUserSchema = createInsertSchema(users).pick({
  churchName: true,
  churchLogoUrl: true,
  emailNotificationsEnabled: true,
  role: true,
});

// Schema for creating new users (admin only)
export const createUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  role: true,
});

// Schema for service options
export const insertServiceOptionSchema = createInsertSchema(serviceOptions).pick({
  name: true,
  value: true,
  isDefault: true,
  churchId: true,
});

// Types for InsertUser from Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Types for our application
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;

export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batches.$inferSelect;
export type BatchAttestation = z.infer<typeof batchAttestationSchema>;

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

export type InsertServiceOption = z.infer<typeof insertServiceOptionSchema>;
export type ServiceOption = typeof serviceOptions.$inferSelect;

// Extended types for front-end display
export type DonationWithMember = Donation & {
  member?: Member;
  batch?: Batch;
};

export type MemberWithDonations = Member & {
  donations?: Donation[];
  totalDonations?: number;
  lastDonation?: Donation;
};

export type BatchWithDonations = Batch & {
  donations?: Donation[];
  donationCount?: number;
};

// Report Recipients table for count report notifications
export const reportRecipients = pgTable("report_recipients", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  churchId: varchar("church_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReportRecipientSchema = createInsertSchema(reportRecipients).pick({
  firstName: true,
  lastName: true,
  email: true,
  churchId: true,
});

export type InsertReportRecipient = z.infer<typeof insertReportRecipientSchema>;
export type ReportRecipient = typeof reportRecipients.$inferSelect;

// Email templates schema
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  templateType: varchar("template_type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text").notNull(),
  churchId: varchar("church_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  templateType: true,
  subject: true,
  bodyHtml: true,
  bodyText: true,
  churchId: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
