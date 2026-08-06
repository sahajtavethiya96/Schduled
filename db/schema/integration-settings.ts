import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Admin-configurable alternative to the optional env vars in lib/env.ts
// (SMTP, Google OAuth, Zoom OAuth, S3/R2 storage) — set from the setup
// wizard or Settings → Services instead of editing .env. Single row (id
// "default"). Every field here is a fallback source: lib/integration-settings.ts
// prefers a non-null DB value and falls back to the matching env var per
// field, so existing .env-only deployments are unaffected. `*Encrypted`
// columns are AES-GCM ciphertext (lib/encrypt.ts, key derived from
// ENCRYPT_KEY) — never sent to the browser in plaintext (see
// app/actions/platform-settings.ts).
export const integrationSetting = pgTable('integration_setting', {
  id: text('id').primaryKey().default('default'),

  // SMTP / Email
  smtpHost: text('smtp_host'),
  smtpPort: integer('smtp_port'),
  smtpSecure: boolean('smtp_secure'),
  smtpUser: text('smtp_user'),
  smtpPassEncrypted: text('smtp_pass_encrypted'),
  emailFrom: text('email_from'),
  emailWebhookSecretEncrypted: text('email_webhook_secret_encrypted'),

  // Google OAuth — shared by Sign-In and Calendar. Sign-In is read once at
  // process boot (lib/auth.ts, top-level await); changes need a restart.
  // Calendar reads fresh per call. See docs/self-hosting/integrations.md.
  googleClientId: text('google_client_id'),
  googleClientSecretEncrypted: text('google_client_secret_encrypted'),

  // Zoom OAuth — resolved fresh per call, applies with no restart.
  zoomClientId: text('zoom_client_id'),
  zoomClientSecretEncrypted: text('zoom_client_secret_encrypted'),

  // File storage — driver switch plus separate S3 and R2 credential sets
  // (lib/env.ts treats them as distinct, not a shared shape).
  storageDriver: text('storage_driver'), // "local" | "s3" | "r2"
  s3Endpoint: text('s3_endpoint'),
  s3Region: text('s3_region'),
  s3Bucket: text('s3_bucket'),
  s3AccessKeyId: text('s3_access_key_id'),
  s3SecretAccessKeyEncrypted: text('s3_secret_access_key_encrypted'),
  r2Bucket: text('r2_bucket'),
  r2AccountId: text('r2_account_id'),
  r2AccessKeyId: text('r2_access_key_id'),
  r2SecretAccessKeyEncrypted: text('r2_secret_access_key_encrypted'),
  storagePublicBaseUrl: text('storage_public_base_url'),

  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
