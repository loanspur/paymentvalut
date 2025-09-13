const fs = require('fs');
const path = require('path');

// Function to remove console.log statements from a file
function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove console.log, console.error, console.warn, console.debug statements
    const consoleRegex = /^\s*console\.(log|error|warn|debug)\([^)]*\);\s*$/gm;
    const consoleRegexMultiline = /^\s*console\.(log|error|warn|debug)\([\s\S]*?\);\s*$/gm;
    
    // Remove single line console statements
    content = content.replace(consoleRegex, '');
    
    // Remove multiline console statements
    content = content.replace(consoleRegexMultiline, '');
    
    // Remove console statements that are part of if/else blocks
    content = content.replace(/^\s*console\.(log|error|warn|debug)\([^)]*\);\s*$/gm, '');
    
    // Clean up empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned: ${filePath}`);
  } catch (error) {
    console.error(`Error cleaning ${filePath}:`, error.message);
  }
}

// Function to recursively find and clean TypeScript files
function cleanDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      cleanDirectory(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      removeConsoleLogs(filePath);
    }
  });
}

// Clean the app/api directory
const apiDir = path.join(__dirname, '..', 'app', 'api');
if (fs.existsSync(apiDir)) {
  console.log('Cleaning console statements from API files...');
  cleanDirectory(apiDir);
  console.log('API cleanup completed!');
}

// Clean the supabase/functions directory
const functionsDir = path.join(__dirname, '..', 'supabase', 'functions');
if (fs.existsSync(functionsDir)) {
  console.log('Cleaning console statements from Edge Functions...');
  cleanDirectory(functionsDir);
  console.log('Edge Functions cleanup completed!');
}

console.log('Console cleanup completed!');
