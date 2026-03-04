"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <p className="text-muted-foreground">Something went wrong: {error.message}</p>
      <button onClick={reset} className="text-primary underline">
        Try again
      </button>
    </div>
  );
}
