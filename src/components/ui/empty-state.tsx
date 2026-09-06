import type { ReactNode } from "react";

export function EmptyState({
  emoji = "🔍",
  title,
  description,
  action,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="mt-4 text-base font-bold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
