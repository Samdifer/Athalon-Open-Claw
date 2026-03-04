import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="p-6 space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-lg" />
      ))}
    </div>
  );
}
