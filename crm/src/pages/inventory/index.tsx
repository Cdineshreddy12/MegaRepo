import { UserPlus, Download } from "lucide-react";
// Constants
import { ROUTE_PATH } from "@/constants";

// Hooks
import useRedirect from "@/hooks/useRedirect";

// Common Components
import IconButton from "@/components/common/IconButton";

import InventoryTable from "./table/product";
import Page, { PageHeader } from "@/components/Page";

function InventoryPage() {
  const redirect = useRedirect();

  return (
    <Page
      removeBackground
      header={
        <PageHeader
          hideBackButton
          title="Inventory Management"
          description="Manage your inventory products and stock levels."
          actions={[
            <IconButton
              variant="outline"
              onClick={() => redirect.to("movements")}
              icon={UserPlus}
            >
              Movements
            </IconButton>,
            <IconButton variant="outline" onClick={() => redirect.to("serial-numbers")} icon={Download}>
              Serial Numbers
            </IconButton>,
            <IconButton
              onClick={() => {
                redirect.to("new");
              }}
              icon={UserPlus}
            >
              Add Product
            </IconButton>,
          ]}
        />
      }
    >
      <div className="space-y-5 flex-1">
        <InventoryTable
          onRowDoubleClick={(row) =>
            redirect.to(`${ROUTE_PATH.INVENTORY}/${row?._id}/view`)
          }
        />
      </div>
    </Page>
  );
}

export default InventoryPage;
