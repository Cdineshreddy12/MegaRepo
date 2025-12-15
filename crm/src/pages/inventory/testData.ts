export const product = {
  name: "Laptop Pro X1",
  sku: "LAP-PRO-X1",
  category: "electronics",
  brand: "TechBrand",
  basePrice: 899.99,
  sellingPrice: 999.99,
  quantity: 25,
  minStockLevel: 10,
  location: "warehouse-a",
  status: "active",
  warrantyPeriod: 12,
  taxRate: 20,
  description: "High-performance laptop for professionals",
  specifications: "Intel i7, 16GB RAM, 512GB SSD",
};

export const productInstances = [{
  id: 2,
  serialNumber: "LPX1-2024-002",
  product: "Laptop Pro X1",
  status: "sold",
  customer: "Tech Solutions Inc",
  warrantyStart: "2024-01-15",
  warrantyEnd: "2025-01-15",
  price: 999.99,
}];

export const movements = [
  {
    id: "MOV-2024-001",
    product: "Laptop Pro X1",
    type: "inbound",
    quantity: 50,
    fromLocation: "Supplier",
    toLocation: "Warehouse A",
    reference: "PO-2024-001",
    createdBy: "John Doe",
    createdAt: "2024-03-15T10:30:00",
    notes: "Regular stock replenishment",
  },
];


export const productDefaultValues = {
  name: "",
  sku: "",
  category: "",
  brand: "",
  basePrice: 0,
  sellingPrice: 0,
  quantity: 0,
  minStockLevel: 0,
  location: "",
  status: "active", // Updated to match the expected type
  warrantyPeriod: 0,
  taxRate: 0,
  description: "",
  specifications: "",
};

export const serialNumberDefaultValues = {
  serialNumber: "",
  product: "",
  status: "available",
  customer: "",
  warrantyStart: "",
  warrantyEnd: "",
  price: 0,
};

export const movementDefaultValues = {
  product: "",
  type: "inbound", // Default to a valid type
  quantity: 0,
  fromLocation: "",
  toLocation: "",
  reference: "",
  notes: "",
};