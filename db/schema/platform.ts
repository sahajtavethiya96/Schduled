import { createId } from '@paralleldrive/cuid2'
import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const idempotencyKey = pgTable('idempotency_key', {
  id:        text('id').primaryKey().$defaultFn(createId),
  key:       text('key').notNull().unique(),
  result:    text('result'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idempotency_key_expires_at_idx').on(t.expiresAt),
])

// Shared across replicas (unlike an in-process Map). Key: "<route>:<ip>";
// upsert resets the counter atomically once resetAt has passed.
export const rateLimitBucket = pgTable('rate_limit_bucket', {
  key:       text('key').primaryKey(),
  count:     integer('count').notNull().default(1),
  resetAt:   timestamp('reset_at', { withTimezone: true }).notNull(),
}, (t) => [
  index('rate_limit_bucket_reset_at_idx').on(t.resetAt),
])

// Key-value so new toggles don't need a migration each time.
export const appSetting = pgTable('app_setting', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
