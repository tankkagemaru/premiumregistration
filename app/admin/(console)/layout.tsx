import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ConsoleShell } from "@/components/admin/ConsoleShell";
import { listNotifications } from "@/lib/admin/notifications";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");
  const notifications = await listNotifications(profile.id);

  return (
    <ConsoleShell
      role={profile.role}
      userName={profile.full_name}
      userId={profile.id}
      notifications={notifications}
    >
      {children}
    </ConsoleShell>
  );
}
