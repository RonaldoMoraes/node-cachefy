const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Building and testing cachefy...\n');

try {
  // Build the project
  console.log('📦 Building project...');
  execSync('pnpm build', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Build completed\n');
  
  // Run the basic usage example
  console.log('🧪 Running basic usage example...');
  execSync('node -r ts-node/register examples/basic-usage.ts', { 
    stdio: 'inherit', 
    cwd: __dirname 
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}