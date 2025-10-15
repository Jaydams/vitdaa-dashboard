"use client";

import dynamic from "next/dynamic";
import { ComponentType } from "react";

/**
 * Creates a client-only version of a component to prevent hydration mismatches
 */
export function createClientOnly<T extends Record<string, any>>(
  component: ComponentType<T>,
  fallback?: ComponentType<T>
) {
  return dynamic(() => Promise.resolve(component), {
    ssr: false,
    loading: fallback ? () => fallback({} as T) : undefined,
  });
}

/**
 * Higher-order component that wraps a component to make it client-only
 */
export function withClientOnly<T extends Record<string, any>>(
  Component: ComponentType<T>,
  fallback?: ComponentType<T>
) {
  return createClientOnly(Component, fallback);
}
