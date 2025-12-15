
import { Typography, TypographyProps } from "@/components/common/Typography";
import { cn } from "@/lib/utils";
import { Minus, type LucideIcon } from "lucide-react";

type DataTableColumnCellProps = {
  children: React.ReactNode;
  rootClassName?: string;
  className?: string;
  variant?: TypographyProps['variant'];
  icon?: LucideIcon;
  renderAs?: "tel" | "email";
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};
export function DataTableColumnCell({
  children,
  className,
  variant = "caption",
  rootClassName,
  icon: Icon,
  renderAs,
  size = "sm",
}: DataTableColumnCellProps) {
  const textSize = sizeMap[size] ?? sizeMap.sm;

  const element = (
    <div className={cn("truncate flex gap-2", rootClassName)}>
      {Icon && children ? <Icon className="h-4 w-4 text-gray-400" /> : null}
      <Typography
        variant={variant}
        className={cn(
          "text-nowrap leading-normal",
          variant !== "overline" && !renderAs && "capitalize",
          !children && "mx-auto",
          className,
          textSize
        )}
      >
        {children || <Minus className="text-muted-foreground"/>}
      </Typography>
    </div>
  );

  switch (renderAs) {
    case "tel":
      return <a href={`tel:${children}`} className="text-pretty inline-block">{element}</a>;
    case "email":
      return <a href={`mailTo:${children}`} className="text-pretty flex py-2 text-primary">{element}</a>;
    default:
      return element;
  }
}

// function DataTableUserCell(props: UserCardProps) {
//   return <UserCard {...props} />;
// }

// function DataTableStyledLabelCell(props: StyledLabelProps) {
//   return <StyledLabel {...props} />;
// }

// function DataTableColorBadgeCell(props: ColorBadgeProps) {
//   if (!props.children) {
//   return <Minus className="text-muted-foreground"/>

//   }
//   return <ColorBadge {...props} />;
// }

// function DataTableNameCardCell(props: NameCardProps) {
//   return <NameCard {...props} />;
// }
// DataTableColumnCell.User = DataTableUserCell;

// DataTableColumnCell.StyleLabel = DataTableStyledLabelCell;

// DataTableColumnCell.ColorBadge = DataTableColorBadgeCell;
// DataTableColumnCell.NameCard = DataTableNameCardCell;

DataTableColumnCell.StyleLabel = () => <div>StyleLabel</div>;

export default DataTableColumnCell;
