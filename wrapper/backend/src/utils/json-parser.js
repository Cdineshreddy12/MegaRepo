/**
 * Safely parse JSON data that might be stored as objects or strings
 * Handles the case where Drizzle ORM returns JavaScript objects directly
 * vs when data is stored as JSON strings
 */

export function safeJsonParse(data, fallback = {}, fieldName = 'data') {
  try {
    // If data is null or undefined, return fallback
    if (data === null || data === undefined) {
      return fallback;
    }

    // If data is already an object (and not a string), return it directly
    if (typeof data === 'object' && data !== null) {
      console.log(`✅ [JsonParser] ${fieldName} is already an object, using directly`);
      return data;
    }

    // If data is a string, try to parse it
    if (typeof data === 'string') {
      if (data.trim() === '') {
        console.log(`⚠️ [JsonParser] ${fieldName} is empty string, using fallback`);
        return fallback;
      }
      
      console.log(`🔍 [JsonParser] Parsing ${fieldName} from string`);
      return JSON.parse(data);
    }

    // For any other data type, log warning and return fallback
    console.log(`⚠️ [JsonParser] Unexpected data type for ${fieldName}:`, typeof data);
    return fallback;

  } catch (error) {
    console.error(`❌ [JsonParser] Failed to parse ${fieldName}:`, {
      error: error.message,
      dataType: typeof data,
      dataPreview: typeof data === 'string' ? data.substring(0, 100) : String(data).substring(0, 100)
    });
    return fallback;
  }
}

/**
 * Parse role permissions with proper error handling
 */
export function parseRolePermissions(permissions) {
  return safeJsonParse(permissions, {}, 'permissions');
}

/**
 * Parse role restrictions with proper error handling
 */
export function parseRoleRestrictions(restrictions) {
  return safeJsonParse(restrictions, {}, 'restrictions');
}

/**
 * Parse role metadata with proper error handling
 */
export function parseRoleMetadata(metadata) {
  return safeJsonParse(metadata, {}, 'metadata');
}

/**
 * Safely stringify data for database storage
 */
export function safeJsonStringify(data, fieldName = 'data') {
  try {
    if (data === null || data === undefined) {
      return null;
    }

    // If it's already a string, return it
    if (typeof data === 'string') {
      // Validate it's valid JSON
      JSON.parse(data);
      return data;
    }

    // Convert object to JSON string
    return JSON.stringify(data);

  } catch (error) {
    console.error(`❌ [JsonParser] Failed to stringify ${fieldName}:`, {
      error: error.message,
      dataType: typeof data
    });
    return null;
  }
} 