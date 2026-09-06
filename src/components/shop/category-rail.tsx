import Link from "next/link";
import { TAXONOMY } from "@/lib/catalog";

export function CategoryRail() {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0 lg:grid-cols-8">
      {TAXONOMY.map((entry) => (
        <Link
          key={entry.id}
          href={`/category/${entry.id}`}
          className="surface-card flex w-[88px] shrink-0 flex-col items-center gap-2 p-3 text-center transition-colors hover:border-primary sm:w-auto"
        >
          <span className="text-2xl" aria-hidden>
            {entry.emoji}
          </span>
          <span className="text-[11px] font-semibold leading-tight">{entry.name}</span>
        </Link>
      ))}
    </div>
  );
}
