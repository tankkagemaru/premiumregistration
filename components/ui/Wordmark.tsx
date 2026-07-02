import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md" | "lg";
}

// "regist·er" wordmark — serif, lowercase, brand-red middle dot. Mirrors the
// `attend·ance` wordmark from the PECSB attendance app.
export function Wordmark({ className, size = "md" }: Props) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl",
  } as const;
  return (
    <span
      className={cn(
        "font-serif font-medium leading-none tracking-tight text-ink",
        sizes[size],
        className,
      )}
    >
      regist
      <span className="text-brand-red">·</span>
      er
    </span>
  );
}
