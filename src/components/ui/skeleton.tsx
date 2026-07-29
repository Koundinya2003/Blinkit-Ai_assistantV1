import { cn } from "@/lib/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-white p-3">
      <Skeleton className="aspect-square w-full rounded-md" />
      <div className="mt-3 flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-20" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return <Skeleton className="h-10 w-20 shrink-0 rounded-md" />;
}