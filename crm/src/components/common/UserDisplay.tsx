import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Typography from "./Typography";

// Helper function to safely format names with fallback
const safeFormatName = (firstName, lastName) => {
  // Ensure firstName and lastName are strings
  const first = firstName || "";
  const last = lastName || "";
  // Return formatted name or fallback
  return `${first} ${last}`.trim() || "Unknown";
};

// Get initials for avatar fallback
const getInitials = (firstName, lastName) => {
  const first = firstName || "";
  const last = lastName || "";
  
  const firstInitial = first.charAt(0);
  const lastInitial = last.charAt(0);
  
  return (firstInitial + lastInitial).toUpperCase();
};

const UserCard = ({
  firstName,
  lastName,
  image,
  size = "sm",
  className,
  showName = true,
}) => {
  // Default values to prevent undefined errors
  const safeFirstName = firstName || "";
  const safeLastName = lastName || "";
  const name = safeFormatName(safeFirstName, safeLastName);
  const initials = getInitials(safeFirstName, safeLastName);

  const avatarSizes = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex items-center gap-x-2", className)}>
      <Avatar className={avatarSizes[size]}>
        {image ? (
          <AvatarImage src={image} alt={name} />
        ) : null}
        <AvatarFallback>{initials || "?"}</AvatarFallback>
      </Avatar>
      {showName && (
        <Typography
          variant={size === "xs" ? "small" : "default"}
          className="font-medium"
        >
          {name}
        </Typography>
      )}
    </div>
  );
};

export default UserCard;