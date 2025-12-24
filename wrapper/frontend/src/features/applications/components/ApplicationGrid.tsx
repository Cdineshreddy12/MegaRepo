import { memo } from 'react';
import { Application } from '@/types/application';
import { ApplicationCard } from './ApplicationCard';

interface ApplicationGridProps {
  applications: Application[];
  onViewApplication: (app: Application) => void;
}

export const ApplicationGrid = memo(function ApplicationGrid({ applications, onViewApplication }: ApplicationGridProps) {
  return (
    <div className="space-y-12">
      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {applications.length > 0 ? (
          applications.map((app, index) => (
            <div
              key={app.appId}
              className="animate-in fade-in slide-in-from-bottom-16 duration-1000 fill-mode-backwards"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <ApplicationCard
                application={app}
                onView={onViewApplication}
                index={index}
              />
            </div>
          ))
        ) : (
          <div className="col-span-full py-40 text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="space-y-2 text-slate-500">
              <h3 className="text-2xl font-black uppercase tracking-tighter">No Applications Available</h3>
              <p className="font-medium max-w-md mx-auto">
                Contact system administration to provision access.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});