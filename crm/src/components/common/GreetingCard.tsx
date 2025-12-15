import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/KindeAuthContext";
import { formatName } from "@/utils/format";
import { useEffect, useState } from "react";
import Typography from "./Typography";

export const GreetingCard: React.FC = () => {
  const [greeting, setGreeting] = useState("");
  const { user, isLoading } = useAuth();

  const userName = formatName(user);

  useEffect(() => {
    const hour = new Date().getHours();
    let greet = "Hello";

    if (hour < 12) {
      greet = "Good morning";
    } else if (hour < 18) {
      greet = "Good afternoon";
    } else {
      greet = "Good evening";
    }

    setGreeting(`${greet}${userName ? `, ${userName}` : ""}!`);
  }, [userName]);

  return (
    <div className="flex flex-col gap-1  text-foreground">
      {isLoading ? (
        <Skeleton className="h-8 w-2/3 rounded-md bg-muted" />
      ) : (
        <Typography variant="h3" className="capitalize">
          {greeting}
        </Typography>
      )}

      {isLoading ? (
        <Skeleton className="h-4 w-1/2 mt-1 bg-muted" />
      ) : (
        <Typography variant="caption" className="text-muted-foreground">
          Hope you're having a great day! Here's what's happening in your
          dashboard.
        </Typography>
      )}
    </div>
  );
};
