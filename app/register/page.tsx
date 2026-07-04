import { SiteHeader } from "@/components/ui/SiteHeader";
import { RegisterForm } from "@/components/register/RegisterForm";
import { listInstitutions, listPrograms } from "@/lib/admin/catalog";

export default async function RegisterPage() {
  const [institutions, programs] = await Promise.all([
    listInstitutions(),
    listPrograms(),
  ]);

  return (
    <main className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <RegisterForm
          institutions={institutions.map((i) => ({
            value: i.value,
            label: i.label,
            category: i.category,
          }))}
          programs={programs.map((p) => ({ value: p.value, label: p.label }))}
        />
      </div>
    </main>
  );
}
