import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AccountIdentityForms,
  AvatarUploadCard,
  DeleteAccountForm,
} from "@/components/profile/account-forms";
import { TimezoneCard } from "@/components/profile/timezone-card";
import { PageHeader } from "@/components/scaffold/page-header";
import { RestartTourButton } from "@/components/tour/restart-tour-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";

export const metadata = { title: "Profile Settings" };

export default async function ProfilePage() {
  const current = await requireSession();
  const freshUser = await db.query.user.findFirst({
    where: eq(user.id, current.user.id),
  });

  if (!freshUser) {
    notFound();
  }

  const bookingUrl = freshUser.username
    ? `${getAppUrl()}/${freshUser.username}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        description="Manage your identity and account data."
        eyebrow="Profile"
        title="Profile"
      />

      {bookingUrl && (
        <div className="flex items-center justify-between gap-4 border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">
              Your public booking page
            </p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
              {bookingUrl}
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 gap-1.5 text-xs"
            size="sm"
          >
            <Link
              href={`/${freshUser.username}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ArrowSquareOut size={12} />
              View page
            </Link>
          </Button>
        </div>
      )}

      <AvatarUploadCard currentImageUrl={freshUser.image} />
      <AccountIdentityForms email={freshUser.email} name={freshUser.name} />
      <TimezoneCard timezone={freshUser.timezone ?? "UTC"} />

      <Card>
        <CardHeader>
          <CardTitle>Product Tour</CardTitle>
          <CardDescription>
            Replay the guided walkthrough of meeting types, availability, your
            booking link, and bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestartTourButton userId={current.user.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Your Data</CardTitle>
          <CardDescription>
            Download a JSON archive of your profile, sessions, and audit
            entries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="secondary">
            <a download href="/api/account/export">
              Download JSON export
            </a>
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountForm email={freshUser.email} />
    </div>
  );
}
