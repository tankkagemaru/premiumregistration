"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen overlay portaled to <body>. The console <main> keeps a persistent
 * transform after its rise-in entrance animation (fill-mode: both), which makes
 * it the containing block for position:fixed descendants — an overlay rendered
 * in place is clamped to the content column (sidebar uncovered, drawer
 * mispositioned). Rendering on <body> resolves `fixed` against the viewport.
 */
export function Overlay({
  className,
  onClick,
  children,
}: {
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div className={className} onClick={onClick}>
      {children}
    </div>,
    document.body,
  );
}
