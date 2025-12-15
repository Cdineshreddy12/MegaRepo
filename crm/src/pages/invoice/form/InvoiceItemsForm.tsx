// React and React Hook Form imports
import { useFormContext, useFieldArray } from "react-hook-form";

// Utility functions
import { calculateTotal } from "@/utils/format";

// Common components
import { InputField, SelectField } from "@/components/common/form-elements";
import IconButton from "@/components/common/IconButton";

// UI components

// Icons
import { Plus, Minus } from "lucide-react";

// Default data
import { defaultInvoice, productTypeOptions, itemStatusOptions } from "../testData";

export const getTotalValue = (item: {quantity: string, unitPrice: string, gst: string}) => {
  // Parse values and check if they are valid numbers
  const quantity = isNaN(parseFloat(item.quantity)) ? 0 : parseFloat(item.quantity);
  const unitPrice = isNaN(parseFloat(item.unitPrice)) ? 0 : parseFloat(item.unitPrice);
  const gst = isNaN(parseFloat(item.gst)) ? 0 : parseFloat(item.gst);

  // Ensure quantity, unitPrice, and gst are valid before calculating total
  return calculateTotal(quantity, unitPrice, gst);
};

function InvoiceItemsForm() {
  const { control, watch } = useFormContext();
  const {
    fields: itemsFields,
    append: addItem,
    remove,
  } = useFieldArray({
    control: control,
    name: "items",
  });

  const currentItems = watch("items");

  const handleAddProduct = () => {
    addItem(defaultInvoice);
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <IconButton type="button" onClick={handleAddProduct} icon={Plus}>
          Add Product
        </IconButton>
      </div>
      <div className="bg-gray-50 rounded-lg">
        <table className="min-w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="bg-gray-200 text-gray-700 uppercase font-medium">
              <th className="py-2 pl-2 text-left">Type</th>
              <th className="py-2 px-1 text-left">Status</th>
              <th className="py-2 px-1 text-left">SKU</th>
              <th className="py-2 px-1 text-left">Description</th>
              <th className="py-2 px-1 text-left">Quantity</th>
              <th className="py-2 px-1 text-left">Unit Price</th>
              <th className="py-2 px-1 text-left">GST</th>
              <th className="py-2 px-1 text-center w-8">Total</th>
              <th className="py-2 px-1 text-center w-8"></th>
            </tr>
          </thead>
          <tbody>
            {itemsFields.map((item, index) => (
              <tr
                key={item.id}
                className={`${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } border-t hover:bg-gray-100 transition-colors duration-200`}
              >
                <td>
                  <SelectField
                    control={control}
                    name={`items.${index}.type`}
                    options={productTypeOptions}
                    placeholder="—"
                  />
                </td>
                <td>
                  <SelectField
                    control={control}
                    name={`items.${index}.status`}
                    options={itemStatusOptions}
                    placeholder="—"
                  />
                </td>
                <td>
                  <InputField
                    control={control}
                    name={`items.${index}.sku`}
                    placeholder="—"
                  />
                </td>
                <td>
                  <InputField
                    control={control}
                    name={`items.${index}.description`}
                    placeholder="—"
                  />
                </td>
                <td>
                  <InputField
                    type="number"
                    min="0"
                    control={control}
                    name={`items.${index}.quantity`}
                    placeholder="0"
                  />
                </td>
                <td>
                  <InputField
                    type="number"
                    min="0"
                    step="0.01"
                    control={control}
                    name={`items.${index}.unitPrice`}
                    placeholder="0,00"
                  />
                </td>
                <td>
                  <InputField
                    type="number"
                    min="0"
                    max="100"
                    control={control}
                    name={`items.${index}.gst`}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1 text-center">
                  <span className="text-sm font-medium">
                    {currentItems?.[index] ? 
                      getTotalValue(currentItems[index]).toFixed(2) : 
                      '0.00'
                    }
                  </span>
                </td>
                <td className="px-2 py-1 text-center">
                  <IconButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    icon={Minus}
                    onClick={() => remove(index)}
                    disabled={itemsFields.length === 1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InvoiceItemsForm;