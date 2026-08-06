import { EnvelopeSimple, GoogleLogo } from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { account } from "@/db/schema";
import { googleAuthEnabled } from "@/lib/auth";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { GoogleActions } from "./_components/google-actions";

export const metadata = { title: "Login" };

interface LoginRowProps {
  action?: React.ReactNode;
  badge?: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  name: string;
}

function LoginRow({ icon, name, description, badge, action }: LoginRowProps) {
  return (
    <div className="flex items-center gap-4 py-5">
      <div className="flex size-10 shrink-0 items-center justify-center bg-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{name}</p>
          {badge}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export default async function LoginPage() {
  const session = await requireSession();

  const accounts = await db
    .select({ providerId: account.providerId })
    .from(account)
    .where(eq(account.userId, session.user.id));

  const hasGoogle = accounts.some((a) => a.providerId === "google");
  const canDisconnectGoogle = hasGoogle;
  // Reflects Better Auth's own boot-time-resolved config (lib/auth.ts), not
  // a fresh DB read — the sign-in button is only real if the running Better
  // Auth instance actually has the Google provider registered, and that's
  // frozen at process start (see lib/auth.ts for why).
  const isGoogleEnabled = googleAuthEnabled;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage how you sign in to your account."
        eyebrow="Profile"
        title="Connected Accounts"
      />

      <Card>
        <CardHeader>
          <CardTitle>Your Sign-in Methods</CardTitle>
          <CardDescription>
            Choose how you access your Schduled account.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0 px-6">
          {/* Magic Link — always active */}
          <LoginRow
            badge={
              <Badge className="text-emerald-600" variant="secondary">
                Active
              </Badge>
            }
            description={`A sign-in link is sent to ${session.user.email} — no password required.`}
            icon={<EnvelopeSimple size={20} />}
            name="Magic Link"
          />

          {/* Google OAuth */}
          <LoginRow
            action={
              isGoogleEnabled ? (
                <GoogleActions
                  canDisconnect={canDisconnectGoogle}
                  hasGoogle={hasGoogle}
                />
              ) : (
                <span className="text-sm text-muted-foreground">
                  Requires setup
                </span>
              )
            }
            badge={
              hasGoogle ? (
                <Badge className="text-emerald-600" variant="secondary">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )
            }
            description={
              hasGoogle
                ? "Your Google account is connected. You can sign in with Google."
                : "Connect your Google account to sign in with Google."
            }
            icon={<GoogleLogo size={20} weight="bold" />}
            name="Google"
          />
        </CardContent>
      </Card>
    </div>
  );
}
