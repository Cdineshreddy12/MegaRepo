import { UploadCloudIcon, Users2Icon } from "lucide-react";
import IconButton from "@/components/common/IconButton";
import { DateTimePill } from "@/components/common/DateTimePill";
import { GreetingCard } from "@/components/common/GreetingCard";

interface DashboardHeaderProps {
  navigation: (path: string) => void;
}

const DashboardHeader = ({ navigation }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex gap-4 items-center">
        <DateTimePill />
        <GreetingCard />
      </div>
      <div className="flex space-x-4">
        <IconButton
          variant="outline"
          onClick={() => {}}
          icon={UploadCloudIcon}
        >
          Export
        </IconButton>
        <IconButton 
          icon={Users2Icon} 
          onClick={() => navigation("/contacts")}
        >
          New Contact
        </IconButton>
      </div>
    </div>
  );
};

export default DashboardHeader;