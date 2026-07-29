import { SearchX, PackageOpen, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: "search" | "products" | "offline";
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

const iconMap = {
  search: SearchX,
  products: PackageOpen,
  offline: WifiOff
};

export function EmptyState({ icon = "products", title, description, action }: EmptyStateProps) {
  const Icon = iconMap[icon];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}