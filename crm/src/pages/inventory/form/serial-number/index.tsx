import Page, { PageHeader } from "@/components/Page";
import InventoryProductInstanceForm from "./Form";

function InventoryProductInstanceFormPage() {
  return (
    <Page
      header={<PageHeader title="Serial Number Form" />}
    >
      <InventoryProductInstanceForm onClose={() => {}} onSuccess={() => {}} />
    </Page>
  );
}

export default InventoryProductInstanceFormPage;
