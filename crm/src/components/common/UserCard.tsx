import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";
import { formatName } from "@/utils/format";
import Typography from "@/components/common/Typography";
import useRedirect from "@/hooks/useRedirect";
import { toPrettyString } from "@/utils/common";
import ColorBadge from "../ColorBadge";
import { User } from "@/services/api/userService";

export interface UserCardProps {
  user: Partial<User>;
  className?: string;
  showEmail?: boolean;
  showRole?: boolean;
  showPhone?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  disableClick?: boolean;
}

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

type BaseUser = { firstName: string; lastName: string };
export function UserCard({
  user,
  className,
  showEmail = true,
  showRole = false,
  showPhone = false,
  size = "sm",
  label,
  disableClick = true
}: UserCardProps) {
  const fullName = formatName(user as BaseUser);
  const redirect = useRedirect()

  const textSize = textSizes[size] ?? textSizes.sm;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-1 py-1.5 text-left text-sm",
        !disableClick && "cursor-pointer",
        className
      )}
      onClick={disableClick ? () => {} : () => redirect.to(`/profile/${user.id || user._id}`)}
    >
      <UserAvatar user={user as User} size={size} />
      <div className="grid flex-1 text-left text-sm leading-tight">
        {label ? (
          <Typography variant="caption" className={cn("text-muted-foreground", textSize)}>
            {label}
          </Typography>
        ) : null}
        <div className="flex gap-2 flex-wrap">
          <Typography
            variant="caption"
            className={cn(
              "text-nowrap truncate capitalize",
              textSize
            )}
          >
            {fullName}
          </Typography>
          {showRole && user?.role ? <ColorBadge value={user?.role || ''}>{toPrettyString(user?.role)}</ColorBadge> : null}
        </div>
        {showEmail && (
          <Typography
            className={cn(
              "text-muted-foreground user-card-email text-nowrap",
              size === "sm" ?textSizes.sm : textSizes.md,
            )}
          >
            {user?.email}
          </Typography>
        )}
        {showPhone && (
          <Typography
            className={cn(
              "text-muted-foreground user-card-phone text-nowrap",
              size === "sm" ?textSizes.sm : textSizes.md,
            )}
          >
            {user?.contactMobile}
          </Typography>
        )}
      </div>
    </div>
  );
}

export type NameCardProps = {
  primary: string;
  secondary?: string | React.ReactNode;
  avatar?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}
const sizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export const NameCard = ({
  primary,
  secondary,
  avatar,
  className,
  size = "lg",
}: NameCardProps) => {

  const textSize = sizeMap[size] ?? sizeMap.sm;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {avatar}
      <div className="flex flex-col">
        <Typography
          variant="caption"
          className={cn("text-nowrap capitalize font-medium", textSize)}
        >
          {primary}
        </Typography>
        {secondary && (
          typeof secondary === "string" ? (
                      <Typography
            variant="caption"
            className={cn("text-muted-foreground", textSize)}
          >
            {secondary}
          </Typography>
          ) : (
            <div className={cn("text-muted-foreground", textSize)}>
              {secondary}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default UserCard;
