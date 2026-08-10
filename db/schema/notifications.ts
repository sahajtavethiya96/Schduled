import { createId } from '@paralleldrive/cuid2'
import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { booking } from './bookings'
import { jobStatusEnum } from './enums'

export const notificationPreference = pgTable('notification_preference', {
  id:                       text('id').primaryKey().$defaultFn(createId),
  userId:                   text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  bookingConfirmationEmail: boolean('booking_confirmation_email').notNull().default(true),
  bookingNotificationEmail: boolean('booking_notification_email').notNull().default(true),
  reminderEmail24h:         boolean('reminder_email_24h').notNull().default(true),
  reminderEmail1h:          boolean('reminder_email_1h').notNull().default(true),
  cancellationEmail:        boolean('cancellation_email').notNull().default(true),
  rescheduleEmail:          boolean('reschedule_email').notNull().default(true),
  // Minutes before a meeting the in-app "Join soon" bar appears. 0 = disabled.
  joinSoonLeadMinutes:      integer('join_soon_lead_minutes').notNull().default(30),
  fromName:                 text('from_name'),
  replyToEmail:             text('reply_to_email'),
  updatedAt:                timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notification = pgTable('notification', {
  id:        text('id').primaryKey().$defaultFn(createId),
  userId:    text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  type:      text('type').notNull(), // booking_created | booking_cancelled | booking_rescheduled
  title:     text('title').notNull(),
  body:      text('body'),
  bookingId: text('booking_id').references(() => booking.id, { onDelete: 'cascade' }),
  readAt:    timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('notification_user_idx').on(t.userId),
  index('notification_user_read_idx').on(t.userId, t.readAt),
])

export const workflowJob = pgTable('workflow_job', {
  id:            text('id').primaryKey().$defaultFn(createId),
  bookingId:     text('booking_id').notNull().references(() => booking.id, { onDelete: 'cascade' }),
  jobType:       text('job_type').notNull(),
  singletonKey:  text('singleton_key').notNull(),
  scheduledFor:  timestamp('scheduled_for', { withTimezone: true }),
  status:        jobStatusEnum('status').notNull().default('pending'),
  completedAt:   timestamp('completed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  retryCount:    integer('retry_count').notNull().default(0),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('workflow_job_booking_idx').on(t.bookingId),
  index('workflow_job_singleton_idx').on(t.singletonKey),
  index('workflow_job_status_idx').on(t.status),
])
