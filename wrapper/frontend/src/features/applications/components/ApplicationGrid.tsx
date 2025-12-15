import { ApplicationCard } from "./ApplicationCard";
import { Application } from "@/types/application";
import { memo } from "react";

interface ApplicationGridProps {
  applications: Application[];
  onViewApplication: (app: Application) => void;
}

export const ApplicationGrid = memo(function ApplicationGrid({ applications, onViewApplication }: ApplicationGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
      {applications.map((app, index) => (
        <div 
            key={app.appId} 
            className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-backwards"
            style={{ animationDelay: `${index * 100}ms` }}
        >
          <ApplicationCard
            application={app}
            onView={onViewApplication}
          />
        </div>
      ))}
    </div>
  );
});