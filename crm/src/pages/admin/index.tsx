import { NavLink, Outlet } from 'react-router-dom';
import { Settings, Users, Database, ListTodo } from 'lucide-react';

const tabs = [
  { id: 'activity-logs', label: 'Activity Logs', icon: <ListTodo size={20} /> },
  { id: 'dropdowns', label: 'System Configuration', icon: <Database size={20} /> },
  { id: 'roles', label: 'Role Management', icon: <Settings size={20} /> },
  { id: 'users', label: 'User Management', icon: <Users size={20} /> },
];

function AdminDashboard() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.id}
              to={`/admin/${tab.id}`}
              className={({ isActive }) =>
                `
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm
                ${isActive
                  ? 'border-blue-500 text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `
              }
            >
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-6">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminDashboard;
