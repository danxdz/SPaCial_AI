const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Building SPC Dashboard Electron App...\n');

try {
  // Step 1: Build React app
  console.log('📦 Building React application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ React build completed\n');

  // Step 2: Build Electron app
  console.log('⚡ Building Electron application...');
  execSync('npm run electron-dist', { stdio: 'inherit' });
  console.log('✅ Electron build completed\n');

  console.log('🎉 SPC Dashboard has been built successfully!');
  console.log('📁 Check the "dist-electron" folder for the packaged application');
  console.log('\n📋 Available platforms:');
  console.log('   • Windows: .exe installer');
  console.log('   • macOS: .dmg disk image');
  console.log('   • Linux: .AppImage portable app');
  console.log('\n💡 The app can be distributed without requiring users to install Node.js or any dependencies!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
