// React and React Hook Form imports
import { useFormContext, useFieldArray } from "react-hook-form";

// Utility functions
import { calculateTotal, formatCurrency } from "@/utils/format";

// Common components
import { InputField, SelectField } from "@/components/common/form-elements";
import IconButton from "@/components/common/IconButton";
import Typography from "@/components/common/Typography";

// UI components

// Icons
import { Plus, Trash2Icon } from "lucide-react";

// Default data
import { defaultProductOrderItem, productTypeOptions, itemStatusOptions } from "../testData";

export const getTotalValue = (item: {quantity: string, unitPrice: string, gst: string}) => {
  // Parse values and check if they are valid numbers
  const quantity = isNaN(parseFloat(item.quantity)) ? 0 : parseFloat(item.quantity);
  const unitPrice = isNaN(parseFloat(item.unitPrice)) ? 0 : parseFloat(item.unitPrice);
  const gst = isNaN(parseFloat(item.gst)) ? 0 : parseFloat(item.gst);

  // Ensure quantity, unitPrice, and gst are valid before calculating total
  return calculateTotal(quantity, unitPrice, gst);
};

function ProductOrderItemsForm() {
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
    addItem(defaultProductOrderItem);
  };

  return (
    <div>
      <div className="bg-gray-50 rounded-lg">
        <table className="min-w-full table-auto border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 text-gray-700 uppercase font-medium">
              <th className="py-3 px-4 text-left">TYPE</th>
              <th className="py-3 px-4 text-left">STATUS</th>
              <th className="py-3 px-4 text-left">SKU</th>
              <th className="py-3 px-4 text-left">DESCRIPTION</th>
              <th className="py-3 px-4 text-left">QUANTITY</th>
              <th className="py-3 px-4 text-left">UNIT PRICE</th>
              <th className="py-3 px-4 text-left">GST</th>
              <th className="py-3 px-4 text-left">TOTAL</th>
              <th className="py-3 px-4 text-center w-8"></th>
            </tr>
          </thead>
          <tbody>
            {itemsFields.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Typography className="text-muted-foreground">No products added yet</Typography>
                    <IconButton type="button" onClick={handleAddProduct} icon={Plus}>
                      Add Product
                    </IconButton>
                  </div>
                </td>
              </tr>
            ) : (
              itemsFields.map((item, index) => {
                const itemData = currentItems[index] || {};
                const total = getTotalValue(itemData);
                
                return (
                  <tr
                    key={item.id}
                    className={`${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } border-t hover:bg-gray-100 transition-colors duration-200`}
                  >
                    <td className="py-2 px-4">
                      <SelectField
                        control={control}
                        name={`items.${index}.type`}
                        options={productTypeOptions}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <SelectField
                        control={control}
                        name={`items.${index}.status`}
                        options={itemStatusOptions}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <InputField
                        control={control}
                        name={`items.${index}.sku`}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <InputField
                        control={control}
                        name={`items.${index}.description`}
                        placeholder="—"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <InputField
                        type="number"
                        min="0"
                        control={control}
                        name={`items.${index}.quantity`}
                        placeholder="0"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <InputField
                        type="number"
                        min="0"
                        step="0.01"
                        control={control}
                        name={`items.${index}.unitPrice`}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <InputField
                        type="number"
                        min="0"
                        max="100"
                        control={control}
                        name={`items.${index}.gst`}
                        placeholder="0.00"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <span className="font-medium">{formatCurrency(total)}</span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <IconButton
                        type="button"
                        variant="ghost"
                        size="icon"
                        icon={Trash2Icon}
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      />
                    </td>
                  </tr>
                );
              })
            )}
            {itemsFields.length > 0 && (
              <tr className="border-t bg-gray-50">
                <td colSpan={9} className="py-2 px-4">
                  <IconButton type="button" onClick={handleAddProduct} icon={Plus} size="sm">
                    Add Another Product
                  </IconButton>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ProductOrderItemsForm;