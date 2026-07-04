import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant =
  | "primary"
  | "brand"
  | "secondary"
  | "danger"
  | "ghost"
  | "success";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

// Ported from the PECSB `qrattendance` app so buttons match across products.
// Primary is ink (near-black); brand-red is reserved for danger/accents.
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: Props) {
  const base =
    "inline-flex items-center justify-center font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  const sizes: Record<Size, string> = {
    sm: "rounded-md px-3 py-1.5 text-xs",
    md: "rounded-md px-4 py-2 text-sm",
    lg: "rounded-md px-6 py-3 text-sm",
  };

  const variants: Record<Variant, string> = {
    primary: "bg-inkbtn text-oncolor hover:bg-inkbtn-soft",
    // Public-site marketing CTA — the brand red gets the click on this app.
    brand: "bg-brand-red text-oncolor hover:bg-brand-red-soft",
    secondary: "border border-border-warm bg-paper text-ink hover:bg-cream-50",
    danger: "bg-brand-red text-oncolor hover:bg-brand-red-soft",
    ghost: "text-ink-soft hover:text-ink hover:bg-cream-50",
    success: "bg-status-present text-oncolor hover:opacity-90",
  };

  return (
    <button
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
