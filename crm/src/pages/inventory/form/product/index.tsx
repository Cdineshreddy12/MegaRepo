import Page, { PageHeader } from "@/components/Page";
import { ENTITY, ROUTE_PATH } from "@/constants";
import useFormMode from "@/hooks/useFormMode";
import useRedirect from "@/hooks/useRedirect";
import { ActionType } from "@/types/common";
import InventoryProductForm from "./Form";
import { CONTENT } from "@/constants/content";

const rootPath = ROUTE_PATH.INVENTORY;

function InventoryProductFormPage() {
  const redirect = useRedirect();
  const { formMode } = useFormMode();
  const entity = ENTITY.INVENTORY;
  const action = formMode as Exclude<ActionType, "PREVIEW">;

  const goBack = () => redirect.to(rootPath);
  return (
    <Page
      header={<PageHeader title={CONTENT?.FORM?.[entity]?.[action]?.title} />}
    >
      <InventoryProductForm onClose={goBack} onSuccess={goBack} />
    </Page>
  );
}

export default InventoryProductFormPage;
