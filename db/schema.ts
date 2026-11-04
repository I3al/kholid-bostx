import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

export const pageViews = pgTable("page_views", {
  id: serial().primaryKey(),
  path: text().notNull(),
  referrer: text(),
  title: text(),
  userAgent: text("user_agent"),
  browser: text(),
  device: text(),
  os: text(),
  ip: text(),
  country: text(),
  city: text(),
  searchKeyword: text("search_keyword"),
  duration: integer().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversionEvents = pgTable("conversion_events", {
  id: serial().primaryKey(),
  eventType: text("event_type").notNull(),
  page: text().notNull(),
  label: text(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminSessions = pgTable("admin_sessions", {
  id: serial().primaryKey(),
  token: text().notNull().unique(),
  username: text().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
