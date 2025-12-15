// React and React Hook Form imports
import { useFormContext, useFieldArray } from "react-hook-form";

// Utility functions
import { calculateTotal } from "@/utils/format";

// Common components
import { FormSection, InputField, SelectField } from "@/components/common/form-elements";
import IconButton from "@/components/common/IconButton";
import Typography from "@/components/common/Typography";

// UI components
import { Input } from "@/components/ui/input";

// Icons
import { Plus, Minus, Trash2Icon } from "lucide-react";

// Default data
import { defaultQuotationItem } from "../testData";


export const getTotalValue = (item: {quantity: string, unitPrice: string, gst: string}) => {
  // Parse values and check if they are valid numbers
  const quantity = isNaN(parseFloat(item.quantity)) ? 0 : parseFloat(item.quantity);
  const unitPrice = isNaN(parseFloat(item.unitPrice)) ? 0 : parseFloat(item.unitPrice);
  const gst = isNaN(parseFloat(item.gst)) ? 0 : parseFloat(item.gst);

  // Ensure quantity, unitPrice, and gst are valid before calculating total
  return calculateTotal(quantity, unitPrice, gst);
};
function QuotationItemsForm() {
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

  const handleAppendReward = () => {
    addItem(defaultQuotationItem);
  };

  return (
    <FormSection>
      <div className="flex justify-between items-center mb-4">
        <Typography variant="subtitle2" className=" text-gray-900">
          Items <span className="text-destructive">*</span>
        </Typography>
        <IconButton type="button" onClick={handleAppendReward} icon={Plus}>
          Add Item
        </IconButton>
      </div>
      <div className="bg-gray-50 rounded-lg">
  <table className="min-w-full table-auto border-collapse text-xs">
    <thead>
      <tr className="bg-gray-200 text-gray-700 uppercase font-medium ">
        <th className="py-2 pl-2 text-left">Type</th>
        <th className="py-2 px-1 text-left">Status</th>
        <th className="py-2 px-1 text-left">SKU</th>
        <th className="py-2 px-1 text-left">Description</th>
        <th className="py-2 px-1 text-left">Quantity</th>
        <th className="py-2 px-1 text-left">Unit Price</th>
        <th className="py-2 px-1 text-left">GST</th>
        <th className="py-2 px-1 text-left">Total</th>
        <th className="py-2 px-1 text-center max-w[1rem] flex justify-center"><Trash2Icon /></th>
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
              options={[
                { value: "product", label: "Product" },
                { value: "service", label: "Service" },
              ]}
            />
          </td>
          <td>
            <SelectField
              control={control}
              name={`items.${index}.status`}
              options={[
                { value: "new", label: "New" },
                { value: "renewal", label: "Renewal" },
              ]}
            />
          </td>
          <td>
            <InputField
              control={control}
              name={`items.${index}.sku`}
              placeholder="Enter SKU"
            />
          </td>
          <td>
            <InputField
              control={control}
              name={`items.${index}.description`}
              placeholder="Enter description"
            />
          </td>
          <td>
            <InputField
              type="number"
              min="1"
              control={control}
              name={`items.${index}.quantity`}
            />
          </td>
          <td>
            <InputField
              type="number"
              min="0"
              step="0.01"
              control={control}
              name={`items.${index}.unitPrice`}
              prefix="₹"
            />
          </td>
          <td>
            <InputField
              type="number"
              min="0"
              max="100"
              control={control}
              name={`items.${index}.gst`}
              suffix="%"
            />
          </td>
          <td>
            <Input
              className="cursor-not-allowed"
              name={`items.${index}.total`}
              readOnly
              value={getTotalValue(currentItems[index])}
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
            />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

    </FormSection>
  );
}

export default QuotationItemsForm;
