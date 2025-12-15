/**
 * Adds common base schema options to mongoose schemas
 * This includes transformations for toJSON/toObject, versioning, etc.
 * @param {mongoose.Schema} schema - Mongoose schema to enhance
 * @returns {mongoose.Schema} Enhanced schema with base options
 */
export function withBaseSchemaOptions(schema) {
  // Add toJSON transformation if not already set
  if (!schema.options.toJSON) {
    schema.set('toJSON', {
      transform: function(doc, ret) {
        // Convert _id to id
        ret.id = ret._id;
        delete ret._id;
        
        // Remove __v
        delete ret.__v;
        
        return ret;
      },
      virtuals: true
    });
  } else {
    // If toJSON exists, enhance it with id transformation
    const existingTransform = schema.options.toJSON.transform;
    schema.set('toJSON', {
      ...schema.options.toJSON,
      transform: function(doc, ret) {
        // Apply existing transform if any
        if (existingTransform) {
          existingTransform(doc, ret);
        }
        
        // Add id field
        if (ret._id && !ret.id) {
          ret.id = ret._id;
        }
        
        // Remove __v if not needed
        if (ret.__v !== undefined) {
          delete ret.__v;
        }
        
        return ret;
      },
      virtuals: schema.options.toJSON.virtuals !== false
    });
  }

  // Add toObject transformation if not already set
  if (!schema.options.toObject) {
    schema.set('toObject', {
      transform: function(doc, ret) {
        // Convert _id to id
        ret.id = ret._id;
        delete ret._id;
        
        // Remove __v
        delete ret.__v;
        
        return ret;
      },
      virtuals: true
    });
  } else {
    // If toObject exists, enhance it with id transformation
    const existingTransform = schema.options.toObject.transform;
    schema.set('toObject', {
      ...schema.options.toObject,
      transform: function(doc, ret) {
        // Apply existing transform if any
        if (existingTransform) {
          existingTransform(doc, ret);
        }
        
        // Add id field
        if (ret._id && !ret.id) {
          ret.id = ret._id;
        }
        
        // Remove __v if not needed
        if (ret.__v !== undefined) {
          delete ret.__v;
        }
        
        return ret;
      },
      virtuals: schema.options.toObject.virtuals !== false
    });
  }

  return schema;
}

export default withBaseSchemaOptions;

