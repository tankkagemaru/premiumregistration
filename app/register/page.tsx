import { SiteHeader } from "@/components/ui/SiteHeader";
import { RegisterForm } from "@/components/register/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-16">
        <RegisterForm />
      </div>
    </main>
  );
}
