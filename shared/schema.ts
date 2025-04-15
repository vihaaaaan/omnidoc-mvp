import { pgTable, text, serial, integer, boolean, uuid, timestamp, jsonb, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Patients table
export const patients = pgTable("patients", {
  id: uuid("id").primaryKey().defaultRandom(),
  full_name: text("full_name").notNull(),
  email: text("email").notNull(),
  phone_number: text("phone_number").notNull(),
  dob: text("dob").notNull(),
  gender: text("gender"),
  address: text("address"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({
  id: true,
  created_at: true,
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  patient_id: uuid("patient_id").notNull().references(() => patients.id),
  started_at: timestamp("started_at").defaultNow(),
  completed_at: timestamp("completed_at"),
  status: text("status").notNull().default('pending'),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
});

// Reports table
export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  session_id: uuid("session_id").notNull().references(() => sessions.id),
  summary: text("summary"),
  json_schema: jsonb("json_schema"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  created_at: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
