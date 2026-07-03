import { requireRole } from "@/lib/auth";
import { listUsers } from "@/lib/admin/users";
import { authConfigured } from "@/lib/admin/leads-shared";
import { UserManager } from "@/components/admin/UserManager";
import { SearchBox } from "@/components/admin/SearchBox";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const users = await listUsers(q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-ink-muted">
            Administration
          </p>
          <h1 className="font-serif text-3xl font-medium text-ink">Users</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Create staff and partner accounts and set what each role can see.
          </p>
        </div>
        <SearchBox placeholder="Search name, email, role…" />
      </div>
      <UserManager users={users} live={authConfigured} />
    </div>
  );
}
