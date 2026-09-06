import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      emoji="🧭"
      title="This aisle doesn't exist"
      description="The page you were looking for isn't here. Try the store, or tell us what you want to cook."
      action={
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline">Go to home</Button>
          </Link>
          <Link href="/plan">
            <Button>Build a basket</Button>
          </Link>
        </div>
      }
    />
  );
}
