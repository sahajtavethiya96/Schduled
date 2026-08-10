import { Suspense } from "react";
import { getContacts } from "@/app/actions/settings";
import { PageHeader } from "@/components/scaffold/page-header";
import { requireSession } from "@/lib/authz";
import { ContactsTable } from "./_components/contacts-table";

export const metadata = { title: "Contacts" };

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    archived?: string;
    filter?: string;
  }>;
}) {
  await requireSession();
  const params = await searchParams;

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10));
  const search = params.q ?? "";
  const archived = params.archived === "1";
  const filter =
    params.filter === "new" || params.filter === "upcoming"
      ? params.filter
      : "all";

  const { contacts, total } = await getContacts({
    page,
    pageSize: 15,
    search,
    archived,
    filter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        description="People who have booked time with you. Add notes, archive, or remove contacts."
        eyebrow="Scheduling"
        title="Contacts"
      />

      <Suspense>
        <ContactsTable
          archived={archived}
          contacts={contacts}
          filter={filter}
          page={page}
          pageSize={15}
          search={search}
          total={total}
        />
      </Suspense>
    </div>
  );
}
