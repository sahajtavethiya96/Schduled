import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { magicLink } from "better-auth/plugins/magic-link";
import { eq } from "drizzle-orm";
import { ADMIN_ROLE, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, PRODUCT_NAME } from "@/config/platform";
import * as schema from "@/db/schema";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { enqueueEmail } from "@/lib/email";
import { magicLinkTemplate } from "@/lib/email/templates/magic-link";
import { resetPasswordTemplate } from "@/lib/email/templates/reset-password";
import { env } from "@/lib/env";
import { getAppUrl } from "@/lib/get-app-url";
import { getEffectiveSignInMethods } from "@/lib/settings/sign-in-methods";
import { passwordComplexityError } from "@/lib/password";
import { hasAnyUser } from "@/lib/setup";

// Password sign-in / sign-up / reset all funnel through these paths.
const PASSWORD_PATHS = new Set([
  "/sign-in/email",
  "/sign-up/email",
  "/request-password-reset",
]);

// Paths where the request body carries a brand-new password to enforce
// complexity on, keyed by the body field that holds it.
const NEW_PASSWORD_FIELDS: Record<string, "password" | "newPassword"> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
};

export const googleAuthEnabled = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const passwordAuthEnabled = env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: env.APP_SECRET,
  baseURL: getAppUrl(),
  trustedOrigins: [
    ...(env.NODE_ENV === "development" ? ["http://localhost:3000"] : []),
    getAppUrl(),
  ],
  // Throttle auth endpoints — without this, /sign-in/email is brute-forceable
  // and /request-password-reset + /sign-in/magic-link can be used to bomb any
  // address with unlimited outbound email. In-memory limiter (per node), which
  // is sufficient for a single-node self-hosted deployment.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/sign-in/magic-link": { window: 300, max: 3 },
    },
  },
  account: {
    accountLinking: {
      // Magic link never creates a row in the account table, so Google is
      // always the "only" account entry. Allow unlinking it — the user can
      // still sign in via magic link at any time.
      allowUnlinkingAll: true,
    },
  },
  ...(googleAuthEnabled
    ? {
        socialProviders: {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        },
      }
    : {}),
  emailAndPassword: {
    enabled: passwordAuthEnabled,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
    // Delivered the same way as magic links: enqueued to the outbox → worker →
    // SMTP (or logged to the server console if no SMTP is configured).
    sendResetPassword: async ({ user, url }) => {
      const { html, text } = await resetPasswordTemplate({
        email: user.email,
        resetUrl: url,
      });

      await enqueueEmail({
        to: user.email,
        subject: `Reset your ${PRODUCT_NAME} password`,
        html,
        text,
      });

      await audit({
        action: "auth.password_reset_requested",
        actorEmail: user.email,
        actorId: user.id,
        description: `Password reset link sent to ${user.email}`,
        entityType: "user",
        entityId: user.id,
        metadata: { email: user.email },
      });
    },
  },
  // Server-side enforcement of the admin's "Sign-in Methods" toggles. The UI
  // hides disabled methods, but this is what actually blocks a direct API call
  // to a disabled method (defense in depth, not just cosmetic).
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;

      const newPasswordField = NEW_PASSWORD_FIELDS[path];
      if (newPasswordField) {
        const candidate = (ctx.body as Record<string, unknown> | undefined)?.[newPasswordField];
        if (typeof candidate === "string") {
          const complexityError = passwordComplexityError(candidate);
          if (complexityError) {
            throw new APIError("BAD_REQUEST", { message: complexityError });
          }
        }
      }

      const needsPassword = PASSWORD_PATHS.has(path);
      const needsMagicLink = path === "/sign-in/magic-link";
      const isGoogleSocial =
        path === "/sign-in/social" &&
        (ctx.body as { provider?: string } | undefined)?.provider === "google";
      if (!needsPassword && !needsMagicLink && !isGoogleSocial) return;

      // Fail open: a transient error reading the toggles must not turn into a
      // login outage. This is defense-in-depth over the UI, not the only gate.
      let methods: Awaited<ReturnType<typeof getEffectiveSignInMethods>>;
      try {
        methods = await getEffectiveSignInMethods();
      } catch {
        return;
      }
      if (needsPassword && !methods.password) {
        throw new APIError("FORBIDDEN", {
          message: "Email & password sign-in is currently disabled.",
        });
      }
      if (needsMagicLink && !methods.magicLink) {
        throw new APIError("FORBIDDEN", {
          message: "Magic link sign-in is currently disabled.",
        });
      }
      if (isGoogleSocial && !methods.google) {
        throw new APIError("FORBIDDEN", {
          message: "Google sign-in is currently disabled.",
        });
      }
    }),
  },
  plugins: [
    admin({
      impersonationSessionDuration: 3600,
      allowImpersonatingAdmins: false,
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { html, text } = await magicLinkTemplate({
          email,
          magicLinkUrl: url,
        });

        await enqueueEmail({
          to: email,
          subject: `Sign in to ${PRODUCT_NAME}`,
          html,
          text,
        });

        await audit({
          action: "auth.magic_link_sent",
          actorEmail: email,
          description: `Magic link sent to ${email}`,
          entityType: "user",
          metadata: { email },
        });
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // Magic-link auth has no re-authentication flow, so disable the freshness
    // gate that would block unlinkAccount / other sensitive ops for old sessions.
    freshAge: 0,
    cookieCache: {
      enabled: true,
      maxAge: 60,
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Gates ALL new-account creation (password sign-up, magic link
        // first-use, Google first-login all funnel through this hook) —
        // the bootstrap admin always gets through regardless of
        // ALLOW_PUBLIC_SIGNUP, so it's safe to close signup from day one
        // rather than "open then close later". Returning false blocks
        // creation (surfaces as a clean BAD_REQUEST to the client).
        before: async (user) => {
          if (env.ALLOW_PUBLIC_SIGNUP) {
            return;
          }

          const isBootstrapAdmin =
            env.INITIAL_ADMIN_EMAIL &&
            user.email.toLowerCase() === env.INITIAL_ADMIN_EMAIL.toLowerCase();
          if (isBootstrapAdmin) {
            return;
          }

          // The /setup wizard (app/actions/setup.ts createFirstAdmin) is only
          // reachable and only ever creates a user while the instance has
          // zero users — every unauthenticated entry point redirects there
          // via redirectToSetupIfNeeded() until an admin exists, and the
          // action itself atomically re-checks and deletes the loser on a
          // concurrent double-submit. So it's safe to let this one creation
          // through regardless of ALLOW_PUBLIC_SIGNUP/INITIAL_ADMIN_EMAIL —
          // without this, closing signup with no INITIAL_ADMIN_EMAIL set
          // (a supported combination) would make first-run setup impossible.
          if (!(await hasAnyUser())) {
            return;
          }

          return false;
        },
        after: async (user) => {
          await audit({
            action: "user.created",
            actorEmail: user.email,
            actorId: user.id,
            description: `User created: ${user.email}`,
            entityId: user.id,
            entityType: "user",
          });

          // Self-hosted first-run bootstrap: auto-promote the operator's
          // designated admin email the moment that account is created.
          // Checked once at signup only — demoting later via the admin
          // panel is not overridden by a later sign-in.
          if (
            env.INITIAL_ADMIN_EMAIL &&
            user.email.toLowerCase() === env.INITIAL_ADMIN_EMAIL.toLowerCase()
          ) {
            await db
              .update(schema.user)
              .set({ role: ADMIN_ROLE, updatedAt: new Date() })
              .where(eq(schema.user.id, user.id));

            await audit({
              action: "user.role_changed",
              actorEmail: user.email,
              actorId: user.id,
              description: `${user.email} auto-promoted to admin via INITIAL_ADMIN_EMAIL`,
              entityId: user.id,
              entityType: "user",
            });
          }
        },
      },
    },
  },
});
