// Better Auth + platform tables
export * from "@/db/schema/auth";
export * from "@/db/schema/email-outbox";
export * from "@/db/schema/email-events";
export * from "@/db/schema/audit-logs";
export * from "@/db/schema/job-logs";

// Domain enums (must come before domain tables)
export * from "@/db/schema/enums";

// Domain tables
export * from "@/db/schema/profile";
export * from "@/db/schema/contacts";
export * from "@/db/schema/event-types";
export * from "@/db/schema/availability";
export * from "@/db/schema/calendars";
export * from "@/db/schema/video";
export * from "@/db/schema/bookings";
export * from "@/db/schema/notifications";
export * from "@/db/schema/security";
export * from "@/db/schema/platform";
export * from "@/db/schema/integration-settings";

// Relations (after all tables to avoid circular imports)
export * from "@/db/schema/relations";
