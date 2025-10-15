"use client";

import { useEffect, useState } from "react";

interface HydrationBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  suppressHydrationWarning?: boolean;
}

/**
 * HydrationBoundary component that prevents hydration mismatches
 * by only rendering children after client-side hydration is complete
 */
export function HydrationBoundary({
  children,
  fallback = null,
  suppressHydrationWarning = true,
}: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <div suppressHydrationWarning={suppressHydrationWarning}>{fallback}</div>
    );
  }

  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>{children}</div>
  );
}
