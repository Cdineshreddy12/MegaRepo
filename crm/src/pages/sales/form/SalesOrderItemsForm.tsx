// React and React Hook Form imports
import { useFormContext, useFieldArray } from "react-hook-form";
import IconButton from "@/components/common/IconButton";
import { Plus, Minus } from "lucide-react";
import { InputField, SelectField } from "@/components/common/form-elements";
import React from "react";

function SalesOrderItemsForm() {
  const { control, watch, setValue, trigger } = useFormContext();
  const {
    fields: itemsFields,
    append: addItem,
    remove,
  } = useFieldArray({
    control: control,
    name: "items",
  });

  // Watch all items to trigger recalculation
  const watchedItems = watch("items");
  
  // Watch individual fields for more granular updates
  const watchedQuantities = watch("items", []).map((item: any) => item?.quantity);
  const watchedUnitPrices = watch("items", []).map((item: any) => item?.unitPrice);
  const watchedGST = watch("items", []).map((item: any) => item?.gst);

  // Helper for totals - corrected calculation logic
  const calculateItemTotal = (item: {
    quantity: string | number;
    unitPrice: string | number;
    gst: string | number; // GST percentage
  }) => {
    // Parse and validate values
    const quantity = parseFloat(String(item.quantity || 0)) || 0;
    const unitPrice = parseFloat(String(item.unitPrice || 0)) || 0;
    const gstPercentage = parseFloat(String(item.gst || 0)) || 0;

    // Calculate: Subtotal = Quantity × Unit Price
    const lineSubtotal = quantity * unitPrice;
    
    // Calculate: GST Amount = Subtotal × (GST% / 100)
    const gstAmount = lineSubtotal * (gstPercentage / 100);
    
    // Calculate: Total = Subtotal + GST Amount
    const total = lineSubtotal + gstAmount;
    
    return {
      lineSubtotal: Math.round(lineSubtotal * 100) / 100,
      gstPercentage,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  };

  // Effect to update totals when item values change
  React.useEffect(() => {
    if (!watchedItems || !Array.isArray(watchedItems)) return;

    let hasUpdates = false;

    watchedItems.forEach((item: any, index: number) => {
      if (!item) return;

      const { total } = calculateItemTotal({
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        gst: item.gst || 0, // GST percentage
      });

      // Only update if the calculated total is different from current value
      const currentTotal = parseFloat(String(item.total || 0));
      if (Math.abs(currentTotal - total) > 0.01) { // Use small threshold for floating point comparison
        setValue(`items.${index}.total`, total, { shouldValidate: false, shouldDirty: true });
        hasUpdates = true;
      }
    });

    // Trigger validation after all updates
    if (hasUpdates) {
      trigger("items");
    }
  }, [watchedQuantities, watchedUnitPrices, watchedGST, setValue, trigger]);

  const handleAddProduct = () => {
    // Add new item with schema-compliant defaults
    addItem({
      productId: "",
      type: "product",
      status: "new", 
      sku: "",
      description: "",
      quantity: 1, // Start with 1 instead of 0 for better UX
      unitPrice: 0,
      gst: 0,
      total: 0
    });
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <IconButton type="button" onClick={handleAddProduct} icon={Plus}>
          Add Product
        </IconButton>
      </div>
      <div className="bg-gray-50 rounded-lg overflow-x-auto">
        <table className="min-w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="bg-gray-200 text-gray-700 uppercase font-medium">
              <th className="py-2 pl-2 text-left min-w-[100px]">Type</th>
              <th className="py-2 px-1 text-left min-w-[100px]">Status</th>
              <th className="py-2 px-1 text-left min-w-[80px]">SKU</th>
              <th className="py-2 px-1 text-left min-w-[150px]">Description</th>
              <th className="py-2 px-1 text-left min-w-[80px]">Quantity</th>
              <th className="py-2 px-1 text-left min-w-[100px]">Unit Price</th>
              <th className="py-2 px-1 text-left min-w-[80px]">GST %</th>
              <th className="py-2 px-1 text-left min-w-[100px]">Total</th>
              <th className="py-2 px-1 text-center w-8">Action</th>
            </tr>
          </thead>
          <tbody>
            {itemsFields.map((item, index) => {
              const currentItem = watchedItems?.[index] || {};
              const { lineSubtotal, gstAmount } = calculateItemTotal({
                quantity: currentItem.quantity || 0,
                unitPrice: currentItem.unitPrice || 0,
                gst: currentItem.gst || 0, // GST percentage
              });

              return (
                <tr
                  key={item.id}
                  className={`${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } border-t hover:bg-gray-100 transition-colors duration-200`}
                >
                  <td className="px-1 py-1">
                    <SelectField
                      control={control}
                      name={`items.${index}.type`}
                      options={[
                        { value: "product", label: "Product" },
                        { value: "service", label: "Service" }
                      ]}
                      placeholder="Select type"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <SelectField
                      control={control}
                      name={`items.${index}.status`}
                      options={[
                        { value: "new", label: "New" },
                        { value: "renewal", label: "Renewal" }
                      ]}
                      placeholder="Select status"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <InputField
                      control={control}
                      name={`items.${index}.sku`}
                      placeholder="SKU"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <InputField
                      control={control}
                      name={`items.${index}.description`}
                      placeholder="Enter description"
                      required
                    />
                  </td>
                  <td className="px-1 py-1">
                    <InputField
                      type="number"
                      min="0"
                      step="1"
                      control={control}
                      name={`items.${index}.quantity`}
                      placeholder="0"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <InputField
                      type="number"
                      min="0"
                      step="0.01"
                      control={control}
                      name={`items.${index}.unitPrice`}
                      placeholder="0.00"
                      prefix="₹"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <InputField
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      control={control}
                      name={`items.${index}.gst`}
                      placeholder="0.00"
                      suffix="%"
                    />
                  </td>
                  <td className="px-1 py-1">
                    <InputField
                      type="number"
                      min="0"
                      step="0.01"
                      control={control}
                      name={`items.${index}.total`}
                      readOnly
                      prefix="₹"
                      className="bg-gray-100"
                      title={`Calculation: (${currentItem.quantity || 0} × ₹${currentItem.unitPrice || 0}) + ${currentItem.gst || 0}% GST = ₹${lineSubtotal.toFixed(2)} + ₹${gstAmount.toFixed(2)} = ₹${(currentItem.total || 0).toFixed(2)}`}
                    />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      icon={Minus}
                      onClick={() => remove(index)}
                      disabled={itemsFields.length === 1}
                      title="Remove item"
                    />
                  </td>
                </tr>
              );
            })}
            {itemsFields.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  No items added. Click "Add Product" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Summary row for debugging */}
      {process.env.NODE_ENV === 'development' && itemsFields.length > 0 && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <strong>Debug Info:</strong>
          {watchedItems?.map((item: { quantity: number; unitPrice: number; gst: number; total: number }, index: number) => {
            const calc = calculateItemTotal({
              quantity: item?.quantity || 0,
              unitPrice: item?.unitPrice || 0,
              gst: item?.gst || 0, // GST percentage
            });
            return (
              <div key={index}>
                Item {index + 1}: Qty({item?.quantity || 0}) × Price(₹{item?.unitPrice || 0}) + GST({item?.gst || 0}%) = ₹{calc.lineSubtotal} + ₹{calc.gstAmount} = ₹{calc.total}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SalesOrderItemsForm;