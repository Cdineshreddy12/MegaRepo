import React, { useState } from 'react';
import { Package, Truck, Calendar, AlertCircle } from 'lucide-react';
import FormField from '../common/FormField';

function ProductOrderForm() {
  const [formData, setFormData] = useState({
    orderNumber: '',
    orderDate: '',
    expectedDelivery: '',
    supplier: '',
    shippingMethod: '',
    notes: ''
  });

  const [items, setItems] = useState([
    { id: 1, description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Required field validations
    if (!formData.orderNumber) newErrors.orderNumber = 'Order Number is required';
    if (!formData.orderDate) newErrors.orderDate = 'Order Date is required';
    if (!formData.expectedDelivery) newErrors.expectedDelivery = 'Expected Delivery Date is required';
    if (!formData.supplier) newErrors.supplier = 'Supplier is required';
    if (!formData.shippingMethod) newErrors.shippingMethod = 'Shipping Method is required';

    // Items validation
    const validItems = items.filter(item => 
      item.description.trim() && item.quantity > 0 && item.unitPrice > 0
    );
    if (validItems.length === 0) {
      newErrors.items = 'At least one valid item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleItemChange = (id, field, value) => {
    setItems(prevItems => 
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate total
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const addItem = () => {
    const newId = Math.max(...items.map(item => item.id)) + 1;
    setItems([...items, { id: newId, description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const renderFieldError = (fieldName) => {
    if (errors[fieldName]) {
      return (
        <div className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle size={16} className="mr-1" />
          {errors[fieldName]}
        </div>
      );
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Handle form submission
      console.log('Form submitted:', { formData, items });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Create Product Order</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Order Number"
            name="orderNumber"
            value={formData.orderNumber}
            onChange={handleChange}
            error={errors.orderNumber}
            required
            placeholder="PO-001"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Order Date <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md pl-10 shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.orderDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {renderFieldError('orderDate')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Expected Delivery <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Truck className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                name="expectedDelivery"
                value={formData.expectedDelivery}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md pl-10 shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  errors.expectedDelivery ? 'border-red-300' : 'border-gray-300'
                }`}
              />
            </div>
            {renderFieldError('expectedDelivery')}
          </div>
        </div>

        {/* Supplier Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            label="Supplier"
            name="supplier"
            type="select"
            value={formData.supplier}
            onChange={handleChange}
            error={errors.supplier}
            required
            options={[
              { value: "1", label: "Tech Supplies Inc" },
              { value: "2", label: "Global Hardware Ltd" }
            ]}
          />
          <FormField
            label="Shipping Method"
            name="shippingMethod"
            type="select"
            value={formData.shippingMethod}
            onChange={handleChange}
            error={errors.shippingMethod}
            required
            options={[
              { value: "ground", label: "Ground" },
              { value: "express", label: "Express" },
              { value: "overnight", label: "Overnight" }
            ]}
          />
        </div>

        {/* Line Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Order Items <span className="text-red-500">*</span>
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-blue-700"
            >
              <Package size={16} className="mr-2" />
              Add Item
            </button>
          </div>
          {renderFieldError('items')}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-12 gap-4 mb-2 text-sm font-medium text-gray-700">
              <div className="col-span-4">Product <span className="text-red-500">*</span></div>
              <div className="col-span-2">SKU</div>
              <div className="col-span-2">Quantity <span className="text-red-500">*</span></div>
              <div className="col-span-2">Unit Price <span className="text-red-500">*</span></div>
              <div className="col-span-2">Total</div>
            </div>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4">
                    <select
                      value={item.description}
                      onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Select Product</option>
                      <option value="Product A">Product A</option>
                      <option value="Product B">Product B</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      value={item.description ? 'SKU-001' : ''}
                      readOnly
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value))}
                        className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={item.total.toFixed(2)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Total Amount</span>
              <span className="font-bold text-gray-900">${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <FormField
          label="Order Notes"
          name="notes"
          type="textarea"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Enter any special instructions or notes..."
        />



        <div className="flex justify-end space-x-4">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700"
          >
            Place Order
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProductOrderForm;