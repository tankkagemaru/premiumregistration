import Image from "next/image";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  /** Show the "Premium Language Centre" wordmark next to the logo. */
  withText?: boolean;
}

// Official PECSB logo (speech-bubble tree) + optional small-caps wordmark.
// Asset lives at public/pecsb-logo.png, sourced from the attendance app.
export function Brandmark({ className, withText = true }: Props) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/pecsb-logo.png"
        alt="Premium Entrepreneur Consultant Sdn Bhd"
        width={40}
        height={40}
        className="h-10 w-10 shrink-0"
        priority
      />
      {withText && (
        <span className="text-[11px] font-medium uppercase leading-tight tracking-[0.22em] text-ink-muted">
          Premium
          <br />
          Language Centre
        </span>
      )}
    </div>
  );
}
