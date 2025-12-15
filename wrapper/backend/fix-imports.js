import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to fix import paths in a file
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Get the directory depth from src/features/
  const relativePath = path.relative(path.join(__dirname, 'src'), filePath);
  const depth = (relativePath.match(/\//g) || []).length;
  const featureName = relativePath.split('/')[1]; // e.g., 'auth', 'users', etc.

  // Define which services are feature-specific vs shared
  const featureServices = {
    auth: ['kinde-service'],
    users: ['user-sync-service', 'user-classification-service'],
    organizations: ['organization-service', 'location-service', 'organization-assignment-service'],
    credits: ['credit-service', 'credit-allocation-service', 'seasonal-credit-service', 'fixed-enhanced-credit-service'],
    subscriptions: ['subscription-service', 'payment-service'],
    roles: ['custom-role-service', 'permission-matrix-service']
  };

  // Fix db imports - always from main src directory
  if (content.includes("'../db/") || content.includes('"../db/')) {
    const dbImportRegex = /from ['"](\.\.\/)+db\//g;
    content = content.replace(dbImportRegex, (match) => {
      const dots = '../'.repeat(depth);
      return `from '${dots}db/`;
    });
    changed = true;
  }

  // Fix middleware imports - always from main src directory
  if (content.includes("'../middleware/") || content.includes('"../middleware/')) {
    const middlewareImportRegex = /from ['"](\.\.\/)+middleware\//g;
    content = content.replace(middlewareImportRegex, (match) => {
      const dots = '../'.repeat(depth);
      return `from '${dots}middleware/`;
    });
    changed = true;
  }

  // Fix utils imports - always from main src directory
  if (content.includes("'../utils/") || content.includes('"../utils/')) {
    const utilsImportRegex = /from ['"](\.\.\/)+utils\//g;
    content = content.replace(utilsImportRegex, (match) => {
      const dots = '../'.repeat(depth);
      return `from '${dots}utils/`;
    });
    changed = true;
  }

  // Fix data imports - always from main src directory
  if (content.includes("'../data/") || content.includes('"../data/')) {
    const dataImportRegex = /from ['"](\.\.\/)+data\//g;
    content = content.replace(dataImportRegex, (match) => {
      const dots = '../'.repeat(depth);
      return `from '${dots}data/`;
    });
    changed = true;
  }

  // Fix services imports - check if it's a feature service or shared service
  const servicesRegex = /from ['"](\.\.\/)+services\/([^'"]+)\.js['"]/g;
  content = content.replace(servicesRegex, (match, dots, serviceName) => {
    const isFeatureService = featureServices[featureName] && featureServices[featureName].includes(serviceName);
    if (isFeatureService) {
      // Use local feature service
      return `from '../services/${serviceName}.js'`;
    } else {
      // Use shared service from main directory
      const mainDots = '../'.repeat(depth);
      return `from '${mainDots}services/${serviceName}.js'`;
    }
  });
  if (content.match(servicesRegex)) changed = true;

  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

// Find all JS files in features directory
function findJsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

// Main execution
const featuresDir = path.join(__dirname, 'src', 'features');
const jsFiles = findJsFiles(featuresDir);

console.log(`Found ${jsFiles.length} JS files in features directory`);

for (const file of jsFiles) {
  fixImportsInFile(file);
}

console.log('Import fixing complete!');
