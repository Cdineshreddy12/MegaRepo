import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatName } from "@/utils/format";
import { getAvatarColor } from "@/utils/common"

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface UserAvatarProps {
  user: Omit<User, 'id' | 'email'>;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ user, className, size = "md" }: UserAvatarProps) {
  if (!user) {
    return null;
  }
  const fullName = formatName(user);
  const initials = `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase();

  const avatarSizes = {
    sm: "h-6 w-6 text-xs rounded-md",
    md: "h-8 w-8 text-sm rounded-lg",
    lg: "h-10 w-10 text-base rounded-lg",
  };
  const bgColor = getAvatarColor(fullName);

  // const placeholderAvatar = `https://avatar.iran.liara.run/public`
  return (
    <Avatar className={cn(avatarSizes[size], "user-card-avatar ", className)}>
      <AvatarImage src={user?.avatarUrl} alt={fullName} />
      <AvatarFallback className="capitalize font-medium" style={{ backgroundColor: bgColor }}>{initials}</AvatarFallback>
    </Avatar>
  );
}
 

