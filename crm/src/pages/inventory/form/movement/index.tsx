import Page, { PageHeader } from "@/components/Page";
import InventoryProductInstanceForm from "./Form";
import { useParams } from "react-router-dom";
import { useInventoryProduct } from "@/queries/InventoryProductQueries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function InventoryProduct() {
  const { inventoryId } = useParams();
  const { data, isPending } = useInventoryProduct(inventoryId);

  if (isPending) {
    return (
      <Card className="p-4 border rounded-md shadow-sm bg-white">
        <CardHeader>
          <CardTitle>Loading Product Details...</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-1/2 mb-4" />
          <Skeleton className="h-6 w-1/3 mb-4" />
          <Skeleton className="h-6 w-1/4 mb-4" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4 border rounded-md shadow-sm bg-primary/5">
      <CardHeader>
        <CardTitle>Product Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-600">Name</p>
            <p className="font-medium">{data?.name}</p>
          </div>
          <div>
            <p className="text-gray-600">Description</p>
            <p className="font-medium">{data?.description}</p>
          </div>
          <div>
            <p className="text-gray-600">Category</p>
            <p className="font-medium">{data?.category}</p>
          </div>
          <div>
            <p className="text-gray-600">Price</p>
            <p className="font-medium">${data?.basePrice}</p>
          </div>
          <div>
            <p className="text-gray-600">Stock</p>
            <p className="font-medium">{data?.quantity}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryProductInstanceFormPage() {
  return (
    <Page
      header={<PageHeader title="Record Movement" />}
    >
      <InventoryProductInstanceForm onClose={() => {}} onSuccess={() => {}} />
    </Page>
  );
}

export default InventoryProductInstanceFormPage;
