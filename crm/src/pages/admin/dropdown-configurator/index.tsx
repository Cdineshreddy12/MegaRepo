import { useState } from "react";
import DropdownConfiguratorMenu from "./DropdownConfigurator.Menu";
import DropdownResults from "./DropdownResults";
import DropdownConfiguratorForm from "./DropdownConfigurator.Form";
import { DropdownConfig } from "./types";
import { configOptionsSource } from "./DropdownConfigurator.content";


const DropdownConfigurator = () => {
  const [selectedConfig, setSelectedConfig] = useState<DropdownConfig>(
    configOptionsSource[0]
  );

  return (
    <div className="grid grid-cols-[1fr_2fr] gap-6">
      {/* Search and Filter */}
      <DropdownConfiguratorMenu
        onMenuItemSelect={(item) => setSelectedConfig(item)}
      />

      {/* Configuration Editor */}
      <div className="flex flex-col gap-4">
        <DropdownConfiguratorForm selectedConfig={selectedConfig} />
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="space-y-6">
            <DropdownResults selectedConfig={selectedConfig} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropdownConfigurator;
