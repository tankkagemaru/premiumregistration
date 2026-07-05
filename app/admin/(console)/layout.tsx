import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { ConsoleShell } from "@/components/admin/ConsoleShell";
import { listNotifications } from "@/lib/admin/notifications";
import { getConsoleLang } from "@/lib/admin/console-i18n";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/admin/login");
  const [notifications, lang] = await Promise.all([
    listNotifications(profile.id),
    getConsoleLang(),
  ]);

  return (
    <ConsoleShell
      role={profile.role}
      userName={profile.full_name}
      userId={profile.id}
      notifications={notifications}
      lang={lang}
    >
      {children}
    </ConsoleShell>
  );
}
