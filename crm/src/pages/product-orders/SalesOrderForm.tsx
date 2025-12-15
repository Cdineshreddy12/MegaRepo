import { Plus, Minus } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";

import Modal from "../../components/common/Modal";
import DatePickerField from "../../components/common/form-elements/DatePickerField";
import IconButton from "../../components/common/IconButton";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { FormSection, InputField, FormGroup, SelectField, CheckboxField, TextAreaField, ReusableForm } from "@/components/common/form-elements";
import ActionType from "@/components/common/form-elements/FormActions";

const accountOptions = [
  { value: "1", label: "Acme Corp" },
  { value: "2", label: "Global Tech" },
];

const opportunityOptions = [
  { value: "1", label: "Cloud Migration Project" },
  { value: "2", label: "Software Implementation" },
];

const countryOptions = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
];

const defaultLineItems = {
  id: 1,
  description: "",
  quantity: 1,
  unitPrice: 0,
  tax: 0,
  total: 0,
};

function LineItemFormSection() {
  const { control } = useFormContext();
  const {
    fields: lineItemsFields,
    append: addItem,
    remove,
  } = useFieldArray({
    control: control,
    name: "lineItems",
  });

  const handleAppendItems = () => {
    addItem(defaultLineItems);
  };

  return (
    <FormSection>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Order Items <span className="text-red-500">*</span>
        </h3>
        <IconButton type="button" onClick={handleAppendItems} icon={Plus}>
          Add Item
        </IconButton>
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-700">
          <div className="col-span-4">Description</div>
          <div className="col-span-2">Quantity</div>
          <div className="col-span-2">Unit Price</div>
          <div className="col-span-2">Tax (%)</div>
          <div className="col-span-2">Total</div>
        </div>
        <div className="space-y-2">
          {lineItemsFields.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4">
                <InputField
                  name={`${index}.description`}
                  control={control}
                  placeholder="Enter description"
                />
              </div>
              <div className="col-span-2">
                <InputField
                  type="number"
                  min="1"
                  name={`${index}.quantity`}
                  control={control}
                  placeholder="Enter quantity"
                />
              </div>
              <div className="col-span-2">
                <div className="relative">
                  <InputField
                    prefix="$"
                    type="number"
                    min="0"
                    step="0.01"
                    name={`${index}.unitPrice`}
                    control={control}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <InputField
                  type="number"
                  min="0"
                  max="100"
                  name={`${index}.tax`}
                  control={control}
                  suffix="%"
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      type="text"
                      // value={item.total.toFixed(2)}
                      value="100"
                      readOnly
                      className="pl-7"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={lineItemsFields.length === 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FormSection>
  );
}

const SalesOrderFormSchema = z.object({
  orderNumber: z.string().nonempty("Order Number is required"),
  orderDate: z.string().nonempty("Order Date is required"),
  deliveryDate: z.string().nonempty("Delivery Date is required"),
  accountId: z.string().nonempty("Account is required"),
  opportunityId: z.string().optional(),
  billingAddress: z.string().nonempty("Billing Address is required"),
  billingCity: z.string().nonempty("City is required"),
  billingState: z.string().nonempty("State is required"),
  billingZip: z.string().nonempty("ZIP Code is required"),
  billingCountry: z.string().nonempty("Country is required"),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingZip: z.string().optional(),
  shippingCountry: z.string().optional(),
  sameAsBilling: z.boolean().optional(),
  notes: z.string().optional(),
  lineItems: z
    .array(
      z.object({
        id: z.number(),
        description: z.string().nonempty("Description is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.number().min(0, "Unit Price must be at least 0"),
        tax: z.number().min(0).max(100, "Tax must be between 0 and 100"),
        total: z.number().min(0, "Total must be at least 0"),
      })
    )
    .nonempty("At least one valid item is required"),
});

export type SalesOrderFormValues = z.infer<typeof SalesOrderFormSchema>;

const defaultValues = {
  orderNumber: "",
  orderDate: "",
  deliveryDate: "",
  accountId: "",
  opportunityId: "",
  billingAddress: "",
  billingCity: "",
  billingState: "",
  billingZip: "",
  billingCountry: "",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingZip: "",
  shippingCountry: "",
  sameAsBilling: false,
  notes: "",
  lineItems: [defaultLineItems],
};
function SalesOrderFormFields() {
  const { control, watch } = useFormContext();
  const isSameAsBilling = !!watch("sameAsBilling");
  return (
    <>
      {/* Basic Information */}
      <FormSection>
        <FormGroup>
          <InputField
            label="Order Number"
            name="orderNumber"
            control={control}
            required
            placeholder="SO-001"
          />
          <SelectField
            label="Account"
            name="accountId"
            control={control}
            options={accountOptions}
            required
          />
        </FormGroup>
      </FormSection>

      {/* Dates */}
      <FormSection>
        <FormGroup>
          <DatePickerField
            label="Order Date"
            name="orderDate"
            control={control}
            required
          />
          <DatePickerField
            label="Delivery Date"
            name="deliveryDate"
            control={control}
            required
          />
        </FormGroup>
      </FormSection>

      {/* Opportunity */}
      <FormSection>
        <SelectField
          label="Opportunity"
          name="opportunityId"
          control={control}
          options={opportunityOptions}
        />
      </FormSection>

      {/* Line Items */}
      <LineItemFormSection />
      {/* Totals */}
      <FormSection>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Subtotal</span>
              <span className="text-gray-900">
                {/* ${calculateSubtotal().toFixed(2)} */}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Tax</span>
              <span className="text-gray-900">
                {/* ${calculateTotalTax().toFixed(2)} */}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-medium text-gray-900">Total</span>
              <span className="font-bold text-gray-900">
                {/* ${calculateTotal().toFixed(2)} */}
              </span>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Billing Address */}
      <FormSection>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Billing Address
        </h3>
        <div className="space-y-4">
          <InputField
            label="Street Address"
            name="billingAddress"
            control={control}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="City"
              name="billingCity"
              control={control}
              required
              placeholder="Enter city"
            />
            <InputField
              label="State"
              name="billingState"
              control={control}
              required
              placeholder="Enter state"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="ZIP Code"
              name="billingZip"
              control={control}
              required
              placeholder="Enter ZIP code"
            />
            <SelectField
              label="Country"
              name="billingCountry"
              control={control}
              options={countryOptions}
              required
            />
          </div>
        </div>
      </FormSection>

      {/* Shipping Address */}
      <FormSection>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Shipping Address
          </h3>
          <div className="flex items-center">
            <CheckboxField
              name="sameAsBilling"
              label="              Same as billing address"
              control={control}
            />
          </div>
        </div>
        {!isSameAsBilling && (
          <div className="space-y-4">
            <InputField
              label="Street Address"
              name="shippingAddress"
              control={control}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="City"
                name="shippingCity"
                control={control}
                required
                placeholder="Enter city"
              />
              <InputField
                label="State"
                name="shippingState"
                control={control}
                required
                placeholder="Enter state"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="ZIP Code"
                name="shippingZip"
                control={control}
                required
                placeholder="Enter ZIP code"
              />
              <SelectField
                label="Country"
                name="shippingCountry"
                control={control}
                options={countryOptions}
                required
              />
            </div>
          </div>
        )}
      </FormSection>

      {/* Notes */}
      <FormSection>
        <TextAreaField
          label="Notes"
          name="notes"
          control={control}
          placeholder="Add any additional notes..."
        />
      </FormSection>


    </>
  );
}
function SalesOrderForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createSalesOrder = (data: SalesOrderFormValues) => {
    console.log(data);
  };
  return (
    <Modal open={open} onClose={onClose} title="Create Sales Order">
      <ReusableForm
        zodSchema={SalesOrderFormSchema}
        defaultValues={defaultValues}
        onSubmit={createSalesOrder}
        renderActions={() => (
          <ActionType>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Order</Button>
          </ActionType>
        )}
      >
        <SalesOrderFormFields />
      </ReusableForm>
    </Modal>
  );
}

export default SalesOrderForm;
