# Changelog

All notable changes to the SPC Dashboard project will be documented in this file.

## [2.0.0] - 2024-01-15

### 🔐 Security Enhancements
- **BREAKING**: Implemented bcrypt password hashing with 12 salt rounds
- **BREAKING**: Added AES-GCM encryption for confidential data storage
- **BREAKING**: Replaced weak XOR encryption with Web Crypto API
- **BREAKING**: Made password hashing methods async (requires await)
- Added secure key generation using crypto.getRandomValues()
- Implemented random initialization vectors for each encryption
- Added backward compatibility for migration from old encryption methods

### 🚀 New Features
- Added Electron desktop app support
- Implemented secure session management with auto-logout
- Added "Remember Me" functionality for trusted devices
- Enhanced brute force protection with progressive delays
- Added comprehensive security logging and monitoring

### 🛠️ Technical Improvements
- Updated all authentication services to use async password methods
- Enhanced error handling throughout the application
- Improved database service with better error handling
- Added proper TypeScript types for encryption methods
- Updated all components to handle async password operations

### 🧹 Code Cleanup
- Removed temporary fix files (fix-all-themes.js, fix-async.js, fix-themes.js)
- Cleaned up empty directories (charts, dashboard, data)
- Removed TypeScript build info files from version control
- Updated .gitignore to prevent tracking of temporary files

### 📚 Documentation
- Updated README.md with new security features
- Added comprehensive SECURITY.md documentation
- Created detailed CHANGELOG.md
- Updated installation instructions for Electron support

### 🔧 Dependencies
- Added bcryptjs for secure password hashing
- Added @types/bcryptjs for TypeScript support
- Updated package.json with new security dependencies

### ⚠️ Breaking Changes
- Password hashing methods are now async (requires await)
- Old password hashes will not work (database reset required)
- Encryption methods now use AES-GCM instead of XOR
- All authentication flows now require async/await patterns

### 🐛 Bug Fixes
- Fixed password verification inconsistency
- Resolved login issues after account creation
- Fixed encryption service initialization
- Corrected authentication flow errors

---

## [1.0.0] - 2024-01-01

### Initial Release
- Basic SPC Dashboard functionality
- User management system
- Database management
- Basic authentication
- Manufacturing modules (Sections, Families, Products, Routes, Features, Measurements)
- Role-based access control
- Multi-language support
- Notification system
