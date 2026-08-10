import { and, eq } from "drizzle-orm";
import { PageHeader } from "@/components/scaffold/page-header";
import { eventType, user } from "@/db/schema";
import { requireSession } from "@/lib/authz";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";
import { EmbedWidget } from "./_components/embed-widget";
import { MyLinkForm } from "./_components/my-link-form";

export const metadata = { title: "My Link" };

export default async function MyLinkPage() {
  const session = await requireSession();

  const [freshUser, eventTypes] = await Promise.all([
    db
      .select({ username: user.username })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1)
      .then((r) => r[0]),
    db
      .select({ slug: eventType.slug, name: eventType.name })
      .from(eventType)
      .where(
        and(eq(eventType.userId, session.user.id), eq(eventType.isActive, true))
      )
      .orderBy(eventType.name),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Your personal booking URL. Share it anywhere to let people schedule time with you."
        eyebrow="Settings"
        title="My Link"
      />
      <MyLinkForm
        appUrl={getAppUrl()}
        currentUsername={freshUser?.username ?? ""}
      />
      <EmbedWidget
        appUrl={getAppUrl()}
        eventTypes={eventTypes}
        username={freshUser?.username ?? ""}
      />
    </div>
  );
}
