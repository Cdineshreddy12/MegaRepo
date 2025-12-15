// Test script to verify permission parsing works with JSON strings
const testPermissions = '{"crm":{"accounts":["read","read_all","create","update","delete","view_contacts","assign"],"communications":["read"]}}';

console.log('Testing permission parsing...');
console.log('Input:', testPermissions);

// Simulate the parsing logic
let processedPermissions = testPermissions;
if (typeof testPermissions === 'string') {
  try {
    processedPermissions = JSON.parse(testPermissions);
    console.log('✅ Parsed successfully:', processedPermissions);
  } catch (error) {
    console.error('❌ Parse failed:', error);
  }
}

// Test hierarchical processing
if (processedPermissions && typeof processedPermissions === 'object' && !Array.isArray(processedPermissions)) {
  const hierarchicalPerms = processedPermissions;
  console.log('✅ Processing hierarchical format');

  let totalOperations = 0;
  const mainModules = [];
  const subModules = [];

  Object.entries(hierarchicalPerms).forEach(([moduleKey, moduleData]) => {
    if (moduleData && typeof moduleData === 'object') {
      mainModules.push(moduleKey);

      Object.entries(moduleData).forEach(([subModuleKey, operations]) => {
        if (Array.isArray(operations)) {
          const subModuleName = `${moduleKey}.${subModuleKey}`;
          subModules.push(subModuleName);
          totalOperations += operations.length;
          console.log(`  📦 ${subModuleName}: ${operations.length} operations`);
        }
      });
    }
  });

  console.log(`📊 Summary: ${totalOperations} total operations, ${mainModules.length} apps, ${subModules.length} modules`);
} else {
  console.error('❌ Not hierarchical format');
}
