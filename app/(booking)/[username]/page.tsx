import {
  CalendarBlank,
  CaretRight,
  Clock,
  Globe,
  MapPin,
  Phone,
  VideoCamera,
} from "@phosphor-icons/react/dist/ssr";
import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eventType, user, userProfile } from "@/db/schema";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const [host] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.username, username))
    .limit(1);
  if (!host) {
    return {};
  }
  return {
    title: `Book a meeting with ${host.name}`,
    description: `Schedule time with ${host.name} — pick a date and time that works for you.`,
    openGraph: {
      title: `Book a meeting with ${host.name}`,
      description: `Schedule time with ${host.name} on Schduled.`,
    },
  };
}

const LOCATION_ICON: Record<string, React.ReactNode> = {
  zoom: (
    <VideoCamera className="text-muted-foreground" size={11} weight="fill" />
  ),
  google_meet: (
    <VideoCamera className="text-muted-foreground" size={11} weight="fill" />
  ),
  phone_host_calls: <Phone className="text-primary" size={11} weight="fill" />,
  phone_invitee_calls: (
    <Phone className="text-primary" size={11} weight="fill" />
  ),
  in_person: (
    <MapPin className="text-muted-foreground" size={11} weight="fill" />
  ),
  custom: <Globe className="text-muted-foreground" size={11} weight="fill" />,
  invitees_choice: (
    <Globe className="text-muted-foreground" size={11} weight="fill" />
  ),
};
const LOCATION_LABEL: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  phone_host_calls: "Phone",
  phone_invitee_calls: "Phone",
  in_person: "In-person",
  custom: "Online",
  invitees_choice: "Flexible",
};

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [host] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      jobTitle: userProfile.jobTitle,
      company: userProfile.company,
      bio: userProfile.bio,
    })
    .from(user)
    .leftJoin(userProfile, eq(userProfile.userId, user.id))
    .where(eq(user.username, username))
    .limit(1);

  if (!host) {
    notFound();
  }

  const eventTypes = await db.query.eventType.findMany({
    where: and(
      eq(eventType.userId, host.id),
      eq(eventType.isActive, true),
      eq(eventType.isHidden, false)
    ),
    with: { durations: true },
    orderBy: [asc(eventType.position)],
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <header className="mb-10 flex flex-col items-center gap-3 text-center">
        {host.image ? (
          <Image
            alt={host.name}
            className="h-[72px] w-[72px] rounded-none object-cover ring-1 ring-base-300"
            height={72}
            src={host.image}
            width={72}
          />
        ) : (
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-none bg-primary text-2xl font-semibold text-primary-content">
            {host.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold">{host.name}</h1>
          {(host.jobTitle || host.company) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[host.jobTitle, host.company].filter(Boolean).join(" @ ")}
            </p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">@{username}</p>
        </div>
        {host.bio && (
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {host.bio}
          </p>
        )}
      </header>

      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Select a meeting type
      </p>

      {eventTypes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-dashed border-base-300 py-16 text-center">
          <CalendarBlank
            className="text-muted-foreground/40"
            size={36}
            weight="duotone"
          />
          <p className="text-sm font-semibold text-base-content">
            No meeting types available
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            {host.name.split(" ")[0]} hasn&apos;t published any meeting types
            yet. Check back soon.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {eventTypes.map((et) => {
            const defaultDuration =
              et.durations.find((d) => d.isDefault)?.duration ??
              et.durations[0]?.duration ??
              30;
            const sortedDurations = [...et.durations].sort(
              (a, b) => a.duration - b.duration
            );
            const locIcon =
              LOCATION_ICON[et.locationType] ?? LOCATION_ICON.custom;
            const locLabel = LOCATION_LABEL[et.locationType] ?? "Online";

            return (
              <Link
                className="group flex items-center gap-4 border border-base-300 bg-base-100 p-5 transition-colors hover:border-primary hover:bg-primary/5"
                href={`/${username}/${et.slug}`}
                key={et.id}
              >
                <div
                  className="h-12 w-1 shrink-0"
                  style={{ backgroundColor: et.color ?? "#0d9488" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{et.name}</p>
                  {et.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                      {et.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {/* Duration chips */}
                    {sortedDurations.map((d) => (
                      <span
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                        key={d.duration}
                      >
                        <Clock size={12} />
                        {d.duration} min
                      </span>
                    ))}
                    {/* Location badge */}
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      {locIcon}
                      {locLabel}
                    </span>
                  </div>
                </div>
                <CaretRight
                  className="shrink-0 text-muted-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                  size={16}
                  weight="bold"
                />
              </Link>
            );
          })}
        </div>
      )}

      <footer className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <span>Scheduling powered by</span>
        <span className="font-semibold text-primary">Schduled</span>
      </footer>
    </main>
  );
}
