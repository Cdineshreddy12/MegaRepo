import { Table, Kanban, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewModeSwitchProps = {
  viewMode1?: {
    icon: LucideIcon;
    label: string;
  };
  viewMode2?: {
    icon: LucideIcon;
    label: string;
  };
  activeMode: number;
  onModeChange: (mode: number) => void;
};

export const ViewModeSwitch = ({
  viewMode1 = { icon: Kanban, label: "Kanban View" },
  viewMode2 = { icon: Table, label: "Table View" },
  activeMode,
  onModeChange,
}: ViewModeSwitchProps) => {
  const IconComponent1 = viewMode1.icon;
  const IconComponent2 = viewMode2.icon;

  return (
    <div className="relative inline-flex rounded-lg bg-muted p-1">
      {/* Background slider */}
      <div
        className={cn(
          "absolute top-1 bottom-1 bg-background rounded-md shadow transition-all duration-200 ease-out",
          activeMode === 1 ? "left-1 right-1/2" : "left-1/2 right-1"
        )}
      />

      {/* View Mode Buttons */}
      <Button
        variant="ghost"
        onClick={() => onModeChange(1)}
        className={cn(
          "relative z-10 flex items-center gap-2 px-3 py-2 text-sm font-medium",
          activeMode === 1 ? "text-primary" : "text-muted-foreground"
        )}
      >
        <IconComponent1 size={16} />
        <span className="hidden sm:inline">{viewMode1.label}</span>
      </Button>

      <Button
        variant="ghost"
        onClick={() => onModeChange(2)}
        className={cn(
          "relative z-10 flex items-center gap-2 px-3 py-2 text-sm font-medium",
          activeMode === 2 ? "text-primary" : "text-muted-foreground"
        )}
      >
        <IconComponent2 size={16} />
        <span className="hidden sm:inline">{viewMode2.label}</span>
      </Button>
    </div>
  );
};