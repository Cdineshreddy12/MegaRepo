import { cn } from "@/lib/utils";
import { User, UserAvatar } from "./UserAvatar";

export default function OverlappedAvatars({
  avatarList,
  className,
  avatarProps,
}: {
  avatarList: User[];
    className?: string;
    avatarProps?: Omit<React.ComponentProps<typeof UserAvatar>, "user">;
}) {
  const { size, className: avatarClassName } = avatarProps || {};
  return (
    <div className={cn("flex items-center", className)}>
      {avatarList?.map((user, index) => (
        <UserAvatar
          key={index}
          user={user}
          size={size}
          className={cn(`border-2 border-white ${index !== 0 ? "-ml-3" : ""} z-${
            50 - index
          }`, avatarClassName)}
        />
      ))}
    </div>
  );
}
