import { createId } from '@paralleldrive/cuid2'
import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { eventType, eventTypeQuestion } from './event-types'
import { bookingStatusEnum } from './enums'

export const booking = pgTable('booking', {
  id:          text('id').primaryKey().$defaultFn(createId),
  eventTypeId: text('event_type_id').notNull().references(() => eventType.id, { onDelete: 'cascade' }),
  hostUserId:  text('host_user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

  inviteeName:     text('invitee_name').notNull(),
  inviteeEmail:    text('invitee_email').notNull(),
  inviteePhone:    text('invitee_phone'),
  inviteeTimezone: text('invitee_timezone').notNull(),

  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime:   timestamp('end_time', { withTimezone: true }).notNull(),
  duration:  integer('duration').notNull(),

  locationValue:    text('location_value'),
  videoLinkHost:    text('video_link_host'),
  videoLinkInvitee: text('video_link_invitee'),
  // Set once video-link-generate gives up for good (no provider connection,
  // or the provider API call kept failing through every retry) so the UI can
  // tell "still generating" apart from "never going to happen" instead of
  // just showing nothing forever. Cleared whenever a link is written.
  videoLinkError:   text('video_link_error'),

  status: bookingStatusEnum('status').notNull().default('confirmed'),

  cancelToken:              text('cancel_token').notNull().unique(),
  rescheduleToken:          text('reschedule_token').notNull().unique(),
  cancelTokenExpiresAt:     timestamp('cancel_token_expires_at', { withTimezone: true }),
  rescheduleTokenExpiresAt: timestamp('reschedule_token_expires_at', { withTimezone: true }),
  cancellationReason:  text('cancellation_reason'),
  cancelledBy:         text('cancelled_by'),
  cancelledAt:         timestamp('cancelled_at', { withTimezone: true }),

  approvalToken:   text('approval_token').unique(),
  rejectionReason: text('rejection_reason'),
  rescheduledFromId:   text('rescheduled_from_id'),
  rescheduleCount:     integer('reschedule_count').notNull().default(0),

  // Guest-initiated reschedule of a confirmed booking: the proposed new time is
  // staged here (status = 'reschedule_requested') and only written to
  // startTime/endTime once the host approves. The original meeting stays intact
  // until then. Cleared on approve, reject, or cancel.
  rescheduleRequestedStart: timestamp('reschedule_requested_start', { withTimezone: true }),
  rescheduleRequestedEnd:   timestamp('reschedule_requested_end', { withTimezone: true }),

  calendarEventId: text('calendar_event_id'),

  hostNotes: text('host_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('booking_host_start_idx').on(t.hostUserId, t.startTime),
  index('booking_host_status_idx').on(t.hostUserId, t.status),
  index('booking_invitee_email_idx').on(t.inviteeEmail),
  index('booking_cancel_token_idx').on(t.cancelToken),
  index('booking_reschedule_token_idx').on(t.rescheduleToken),
  index('booking_approval_token_idx').on(t.approvalToken),
])

export const bookingAnswer = pgTable('booking_answer', {
  id:            text('id').primaryKey().$defaultFn(createId),
  bookingId:     text('booking_id').notNull().references(() => booking.id, { onDelete: 'cascade' }),
  questionId:    text('question_id').references(() => eventTypeQuestion.id, { onDelete: 'set null' }),
  questionLabel: text('question_label').notNull(),
  answer:        text('answer').notNull(),
})

export const bookingGuest = pgTable('booking_guest', {
  id:         text('id').primaryKey().$defaultFn(createId),
  bookingId:  text('booking_id').notNull().references(() => booking.id, { onDelete: 'cascade' }),
  guestEmail: text('guest_email').notNull(),
  guestName:  text('guest_name'),
})
