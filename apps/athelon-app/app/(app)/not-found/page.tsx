"use client";

import { NotFoundCard } from "@/components/NotFoundCard";

export default function AppNotFoundPage() {
  return (
    <NotFoundCard
      message="The page you requested could not be found."
      backHref="/dashboard"
      backLabel="Back to dashboard"
    />
  );
}
