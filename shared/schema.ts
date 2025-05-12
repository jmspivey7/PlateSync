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

// Define church status enum
export const churchStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "DELETED"]);
export type ChurchStatus = z.infer<typeof churchStatusEnum>;

// Churches table to properly support multi-tenant architecture
export const churches = pgTable("churches", {
  id: varchar("id").primaryKey().notNull(),  // Unique identifier for the church
  name: varchar("name", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
  contactEmail: varchar("contact_email").notNull(),
  phone: varchar("phone", { length: 20 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  logoUrl: varchar("logo_url"),
  websiteUrl: varchar("website_url"),
  denomination: varchar("denomination", { length: 100 }),
  notes: text("notes"),
  membersCount: integer("members_count").default(0),
  accountOwnerId: varchar("account_owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastLoginDate: timestamp("last_login_date"),
  registrationDate: timestamp("registration_date").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  archiveUrl: varchar("archive_url"),  // URL to the archived ZIP if church is deleted
});

// Schema for church record insertion
export const insertChurchSchema = createInsertSchema(churches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registrationDate: true,
  deletedAt: true,
  archiveUrl: true,
  membersCount: true
});

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
export const userRoleEnum = z.enum(["GLOBAL_ADMIN", "ACCOUNT_OWNER", "ADMIN", "STANDARD"]);
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
  role: varchar("role").default("STANDARD").notNull(),
  // Password and verification fields
  password: varchar("password"),
  isVerified: boolean("is_verified").default(false),
  passwordResetToken: varchar("password_reset_token").unique(),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  churchName: varchar("church_name"),
  churchLogoUrl: varchar("church_logo_url"),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(false),
  churchId: varchar("church_id"),
  isAccountOwner: boolean("is_account_owner").default(false), // Renamed from isMasterAdmin
  // Temporarily commented out until migration can be run
  // isActive: boolean("is_active").default(true).notNull(),
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
  // Fields for external system integration
  externalId: varchar("external_id", { length: 100 }),
  externalSystem: varchar("external_system", { length: 50 }),
});

// Donation types enum
export const donationTypeEnum = z.enum(["CASH", "CHECK"]);

// Notification status enum
export const notificationStatusEnum = z.enum(["PENDING", "SENT", "FAILED", "NOT_REQUIRED"]);

// Batch status enum - simplified workflow with only OPEN and FINALIZED states
export const batchStatusEnum = z.enum(["OPEN", "FINALIZED"]);

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

// Schema for church registration
export const registerChurchSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  churchName: z.string().min(1, "Church name is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
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
export type User = typeof users.$inferSelect & {
  // Add runtime properties (not in database schema)
  isActive?: boolean;
  isAccountOwner?: boolean;
  // Legacy property for backwards compatibility
  isMasterAdmin?: boolean;
};

// Define relations between churches and users
export const churchesRelations = relations(churches, ({ many, one }) => ({
  users: many(users),
  accountOwner: one(users, {
    fields: [churches.accountOwnerId],
    references: [users.id],
  }),
}));

// Define relations between users and churches
export const usersRelations = relations(users, ({ one }) => ({
  church: one(churches, {
    fields: [users.churchId],
    references: [churches.id],
  }),
}));

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

export type InsertChurch = z.infer<typeof insertChurchSchema>;
export type Church = typeof churches.$inferSelect;

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

// Planning Center Tokens table
export const planningCenterTokens = pgTable("planning_center_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  churchId: varchar("church_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlanningCenterTokensSchema = createInsertSchema(planningCenterTokens).pick({
  userId: true,
  churchId: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
});

export type InsertPlanningCenterTokens = z.infer<typeof insertPlanningCenterTokensSchema>;
export type PlanningCenterTokens = typeof planningCenterTokens.$inferSelect;

// Verification codes table for email verification during onboarding
export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  churchId: varchar("church_id").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
});

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).pick({
  email: true,
  churchId: true,
  code: true,
  expiresAt: true,
});

export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;
export type VerificationCode = typeof verificationCodes.$inferSelect;

// Extended church type with additional statistics used in Global Admin
export interface ChurchWithStats extends Church {
  totalMembers: number;
  totalDonations: string;
  userCount: number;
  lastActivity: string | null;
}
