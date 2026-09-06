import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-md", className)} />;
}

export function ProductCardSkeleton() {
  return (
    <div className="surface-card overflow-hidden p-2.5">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="mt-3 h-3 w-1/2" />
      <Skeleton className="mt-2 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <Skeleton className="mt-3 h-8 w-full" />
    </div>
  );
}
