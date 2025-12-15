import { useState } from "react";
import { DropdownConfig } from "./types";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { configOptionsSource } from "./DropdownConfigurator.content";


function DropdownConfiguratorMenu({
  onMenuItemSelect,
}: {
  onMenuItemSelect: (item: DropdownConfig) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMenuId, setSelectedMenuId] = useState("");

  const handleMenuSelection = (config: DropdownConfig) => {
    setSelectedMenuId(config.id);
    onMenuItemSelect(config);
  };

  const filteredConfigs = configOptionsSource.filter(
    (config) =>
      config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="col-span-1">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search configurations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
          </div>

          {/* Configuration List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredConfigs.map((config) => (
              <button
                key={config.id}
                onClick={() => handleMenuSelection(config)}
                className={`w-full text-left p-3 rounded-lg transition-colors duration-150 ${
                  selectedMenuId === config.id
                    ? "bg-slate-100 text-primary hover:bg-slate-200"
                    : "hover:bg-slate-100"
                }`}
              >
                <div className="font-medium">{config.name}</div>
                <div className="text-sm text-slate-500">
                  {config.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DropdownConfiguratorMenu;
