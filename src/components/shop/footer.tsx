import Link from "next/link";
import { TAXONOMY } from "@/lib/catalog";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shop by category</p>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {TAXONOMY.map((entry) => (
            <Link
              key={entry.id}
              href={`/category/${entry.id}`}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {entry.name}
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          A product concept exploring intent-driven grocery shopping. Catalogue, prices and delivery are simulated.
        </p>
      </div>
    </footer>
  );
}
