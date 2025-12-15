import { validationResult } from "express-validator";
import { Product, SerialNumber, Movement } from "../models/Inventory.js";

export const createProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Get selected org from query params if provided
    const { entityId } = req.query;

    // Resolve orgCode properly - if entityId is provided, it might be an org _id that needs to be resolved to orgCode
    let orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (entityId && !orgCode) {
      // If entityId looks like an ObjectId, try to resolve it to orgCode
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData) {
            orgCode = orgData.orgCode;
            console.log(`✅ Resolved entityId ${entityId} to orgCode: ${orgCode} for product creation`);
          } else {
            console.warn(`⚠️ Could not find organization with _id: ${entityId} for product creation`);
            orgCode = entityId; // Fallback to using entityId as orgCode
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up orgCode for entityId ${entityId} in product creation:`, lookupError.message);
          orgCode = entityId; // Fallback to using entityId as orgCode
        }
      } else {
        // entityId is already an orgCode
        orgCode = entityId;
      }
    }

    const productData = {
      ...req.body,
      createdBy: req.user.userId || req.user.id,
      orgCode: orgCode
    };

    const existingProduct = await Product.findOne({ sku: productData.sku });
    if (existingProduct) {
      return res.status(409).json({ message: "Product already exists" });
    }

    const product = new Product(productData);
    await product.save();

    res.status(201).json(product);
  } catch (err) {
    next(err); // Let errorHandler take care
  }
};


export const getProducts = async (req, res) => {
  try {
    console.log("getProducts called"); // DEBUG LOG

    // Get effective user (handles both external and local auth)
    const { getEffectiveUser, getPermissionFilters } = await import('../utils/authHelpers.js');
    const user = await getEffectiveUser(req);

    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    console.log('✅ Got effective user:', {
      id: user.id,
      role: user.role,
      isExternal: user.isExternalUser
    });

    // Get permission-based query filters with org switcher support
    const { entityId } = req.query;
    const query = await getPermissionFilters(user, 'inventory', entityId);

    console.log('🔍 Final query filters:', JSON.stringify(query));

    const products = await Product.find(query).sort({ createdAt: -1 });

    // Always return an array, even if empty
    res.json(products);
  } catch (err) {
    console.error("Error getting products:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getProduct = async (req, res) => {
  try {
    console.log("getProduct called with ID:", req.params.id); // DEBUG LOG
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("getProduct error:", err.message);
    res.status(500).send("Server Error");
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now(), updatedBy: req.user.userId || req.user.id },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const adjustStockLevel = async (req, res) => {
  try {
    const { productId, adjustment } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.stockLevel += adjustment;

    if (product.stockLevel < 0) {
      return res
        .status(400)
        .json({ message: "Stock level cannot be negative" });
    }

    await product.save();

    res.json({ message: "Stock level updated", product });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const recordProductMovement = async (req, res) => {
  try {
    // Get selected org from query params if provided
    const { entityId } = req.query;

    // Resolve orgCode properly - if entityId is provided, it might be an org _id that needs to be resolved to orgCode
    let orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (entityId && !orgCode) {
      // If entityId looks like an ObjectId, try to resolve it to orgCode
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData) {
            orgCode = orgData.orgCode;
            console.log(`✅ Resolved entityId ${entityId} to orgCode: ${orgCode} for movement creation`);
          } else {
            console.warn(`⚠️ Could not find organization with _id: ${entityId} for movement creation`);
            orgCode = entityId; // Fallback to using entityId as orgCode
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up orgCode for entityId ${entityId} in movement creation:`, lookupError.message);
          orgCode = entityId; // Fallback to using entityId as orgCode
        }
      } else {
        // entityId is already an orgCode
        orgCode = entityId;
      }
    }

    const movementData = {
      ...req.body,
      createdBy: req.user.userId || req.user.id,
      orgCode: orgCode
    };

    const movement = new Movement(movementData);
    await movement.save();

    res.status(201).json(movement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// FIXED: This was filtering by productId but not using it correctly
export const getProductMovements = async (req, res) => {
  try {
    const { productId } = req.params;

    // Get effective user (handles both external and local auth)
    const { getEffectiveUser, getPermissionFilters } = await import('../utils/authHelpers.js');
    const user = await getEffectiveUser(req);

    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    console.log('✅ Got effective user:', {
      id: user.id,
      role: user.role,
      isExternal: user.isExternalUser
    });

    // Get permission-based query filters with org switcher support
    const { entityId } = req.query;
    let query = await getPermissionFilters(user, 'inventory', entityId);

    // If productId is provided, add it to the query
    if (productId) {
      query.productId = productId;
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    const movements = await Movement.find(query)
      .populate('productId', 'name sku') // Populate product details
      .sort({ createdAt: -1 });

    // Return empty array instead of 404 when no movements found
    res.json(movements);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getProductMovement = async (req, res) => {
  try {
    const { id } = req.params;

    const movement = await Movement.findById(id)
      .populate('productId', 'name sku brand category')
      .populate('createdBy', 'firstName lastName email')

    if (!movement) {
      return res.status(404).json({ message: "Movement not found" });
    }
    
    res.json(movement);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
}

export const updateProductMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const movement = await Movement.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now(), updatedBy: req.user.userId || req.user.id },
      { new: true }
    ).populate('productId', 'name sku');
    if (!movement) {
      return res.status(404).json({ message: "Movement not found" });
    }
    res.json({ message: "Movement updated", movement });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const deleteProductMovement = async (req, res) => {
  try {
    const { id } = req.params;

    const movement = await Movement.findByIdAndDelete(id);

    if (!movement) {
      return res.status(404).json({ message: "Movement not found" });
    }

    res.json({ message: "Movement deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
}

export const createSerialNumber = async (req, res, next) => {
  try {
    // Get selected org from query params if provided
    const { entityId } = req.query;

    // Resolve orgCode properly - if entityId is provided, it might be an org _id that needs to be resolved to orgCode
    let orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    if (entityId && !orgCode) {
      // If entityId looks like an ObjectId, try to resolve it to orgCode
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData) {
            orgCode = orgData.orgCode;
            console.log(`✅ Resolved entityId ${entityId} to orgCode: ${orgCode} for serial number creation`);
          } else {
            console.warn(`⚠️ Could not find organization with _id: ${entityId} for serial number creation`);
            orgCode = entityId; // Fallback to using entityId as orgCode
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up orgCode for entityId ${entityId} in serial number creation:`, lookupError.message);
          orgCode = entityId; // Fallback to using entityId as orgCode
        }
      } else {
        // entityId is already an orgCode
        orgCode = entityId;
      }
    }

    const serialNumberData = {
      ...req.body,
      createdBy: req.user.userId || req.user.id,
      orgCode: orgCode
    };

    const serialNumber = new SerialNumber(serialNumberData);
    await serialNumber.save();

    res.status(201).json(serialNumber);
  } catch (err) {
    next(err); // Pass error to middleware
  }
};

// FIXED: Return empty array instead of 404, and fix variable naming
export const getSerialNumbers = async (req, res) => {
  try {
    console.log("getSerialNumbers called"); // DEBUG LOG

    // Get effective user (handles both external and local auth)
    const { getEffectiveUser, getPermissionFilters } = await import('../utils/authHelpers.js');
    const user = await getEffectiveUser(req);

    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    console.log('✅ Got effective user:', {
      id: user.id,
      role: user.role,
      isExternal: user.isExternalUser
    });

    // Get permission-based query filters with org switcher support
    const { entityId } = req.query;
    const query = await getPermissionFilters(user, 'inventory', entityId);

    console.log('🔍 Final query filters:', JSON.stringify(query));

    const serialNumbers = await SerialNumber.find(query)
      .populate('productId', 'name sku brand') // Populate product details
      .populate('customer', 'name email') // Populate customer details if needed
      .sort({ createdAt: -1 });

    // Return empty array instead of 404 when no serial numbers found
    res.json(serialNumbers);
  } catch (err) {
    console.error("getSerialNumbers error:", err.message);
    res.status(500).send("Server Error");
  }
};

export const getSerialNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const serialNumber = await SerialNumber.findById(id)
      .populate('productId', 'name sku brand')
      .populate('customer', 'name email');

    if (!serialNumber) {
      return res.status(404).json({ message: "Serial Number not found" });
    }

    res.json(serialNumber);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const updateSerialNumber = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const serialNumber = await SerialNumber.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now(), updatedBy: req.user.userId || req.user.id },
      { new: true }
    ).populate('productId', 'name sku brand')
     .populate('customer', 'name email');

    if (!serialNumber) {
      return res.status(404).json({ message: "Serial Number not found" });
    }

    res.json({ message: "Serial Number updated", serialNumber });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const deleteSerialNumber = async (req, res) => {
  try {
    const { id } = req.params;

    const serialNumber = await SerialNumber.findByIdAndDelete(id);

    if (!serialNumber) {
      return res.status(404).json({ message: "Serial Number not found" });
    }

    res.json({ message: "Serial Number deleted successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export default {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  adjustStockLevel,
  recordProductMovement,
  getProductMovements,
  getProductMovement,
  updateProductMovement,
  deleteProductMovement,
  createSerialNumber,
  getSerialNumbers,
  getSerialNumber,
  updateSerialNumber,
  deleteSerialNumber,
};