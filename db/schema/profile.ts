import { createId } from '@paralleldrive/cuid2'
import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { themeEnum, dateFormatEnum, timeFormatEnum } from './enums'

export const userProfile = pgTable('user_profile', {
  id:          text('id').primaryKey().$defaultFn(createId),
  userId:      text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  jobTitle:    text('job_title'),
  company:     text('company'),
  bio:         text('bio'),
  websiteUrl:  text('website_url'),
  theme:       themeEnum('theme').default('system'),
  dateFormat:  dateFormatEnum('date_format').default('MM/DD/YYYY'),
  timeFormat:  timeFormatEnum('time_format').default('12h'),
  // excludedContactDomains: comma/space-separated emails or domains to skip.
  autoCreateContacts:     boolean('auto_create_contacts').notNull().default(true),
  excludedContactDomains: text('excluded_contact_domains'),
  updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userBranding = pgTable('user_branding', {
  id:                  text('id').primaryKey().$defaultFn(createId),
  userId:              text('user_id').notNull().unique().references(() => user.id, { onDelete: 'cascade' }),
  brandPrimaryColor:   text('brand_primary_color').default('#0d9488'),
  brandTextColor:      text('brand_text_color').default('#ffffff'),
  logoUrl:             text('logo_url'),
  welcomeMessage:      text('welcome_message'),
  confirmationMessage: text('confirmation_message'),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const usernameRedirect = pgTable('username_redirect', {
  id:          text('id').primaryKey().$defaultFn(createId),
  userId:      text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  oldUsername: text('old_username').notNull(),
  newUsername: text('new_username').notNull(),
  expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
