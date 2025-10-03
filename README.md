# SPC Dashboard - Statistical Process Control System

A comprehensive Statistical Process Control (SPC) application built with React, TypeScript, and SQLite. This system provides quality control management for manufacturing processes with role-based access control and real-time data management.

## 🚀 Features

### Core Functionality
- **User Management**: Role-based authentication (Admin, Controle, Method, Production)
- **Registration System**: Secure user registration with admin approval
- **Database Management**: SQLite database with file system storage
- **Real-time Notifications**: Internal notification system for user actions
- **Multi-language Support**: English, French, and Spanish

### Manufacturing Modules
- **Sections (Ateliers)**: Workshop management with workstation assignments
- **Families**: Product family organization
- **Products**: Product catalog with specifications
- **Routes (Gammes)**: Manufacturing route definitions
- **Features**: Quality characteristics and specifications
- **Measurements**: Data collection and analysis

### Security & Access Control
- **Encrypted Passwords**: Secure password hashing
- **Registration Codes**: Admin-generated codes for user registration
- **Method User Validation**: Section-based user approval
- **Session Management**: Auto-logout and session validation

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **State Management**: Zustand
- **Database**: SQLite with SQL.js
- **Authentication**: Custom JWT-like system with bcrypt
- **Security**: bcryptjs for password hashing, Web Crypto API for data encryption
- **Build Tool**: Vite
- **Desktop**: Electron for cross-platform desktop app
- **Icons**: Heroicons

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd SPC-Dashboard

# Install dependencies
npm install

# Start development server (web version)
npm run dev

# Start Electron desktop app
npm run electron-dev

# Build for production
npm run build
npm run electron-build
```

### First-Time Setup
1. Open the application in your browser
2. You'll be prompted to create the first admin account
3. Set up your admin username and password
4. The system will create default groups, ateliers, and workstations
5. You can now create registration codes for other users

## 🏗️ Architecture

### Database Schema
- **Users**: User accounts with roles and assignments
- **Groups**: Permission groups for access control
- **Ateliers**: Manufacturing sections/workshops
- **Workstations**: Individual workstations within ateliers
- **Registration Codes**: Temporary codes for user registration
- **Validation Requests**: Pending user registration approvals
- **Notifications**: Internal notification system
- **Manufacturing Data**: Families, Products, Routes, Features, Measurements

### File Structure
```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── layout/        # Layout components (Sidebar, etc.)
│   ├── modules/       # Main application modules
│   └── ui/            # Reusable UI components
├── services/
│   ├── database.ts    # Database service
│   ├── authService.ts # Authentication service
│   ├── encryption.ts  # Password encryption
│   └── logger.ts      # Logging service
├── stores/
│   ├── useUserStore.ts    # User state management
│   ├── useAppStore.ts     # App preferences
│   ├── useThemeStore.ts   # Theme management
│   └── useI18nStore.ts    # Internationalization
└── types/
    └── spc.ts         # TypeScript type definitions
```

## 👥 User Roles

### Admin
- Full system access
- User management
- Registration code creation
- Database management
- System configuration

### Controle (Quality Control)
- Access to quality control modules
- Feature management
- Measurement analysis
- Quality reporting

### Method (Manufacturing Methods)
- Route and feature management
- User validation for assigned sections
- Process optimization
- Method documentation

### Production (Operators)
- Measurement data entry
- Route execution
- Basic reporting
- No administrative access

## 🔐 Security Features

### Password Security
- **bcrypt Hashing**: All passwords are hashed using bcrypt with 12 salt rounds
- **Secure Storage**: Passwords are never stored in plain text
- **Production Users**: Can have optional passwords for operator convenience
- **Password Verification**: Secure password verification using bcrypt.compare()

### Data Encryption
- **AES-GCM Encryption**: Confidential data encrypted using AES-GCM with 256-bit keys
- **Random IVs**: Each encryption uses a unique initialization vector
- **Key Management**: Secure key generation using crypto.getRandomValues()
- **Backward Compatibility**: Supports migration from old encryption methods

### Authentication System
- **Session Management**: Secure session tokens with expiration
- **Auto-logout**: Inactivity-based automatic logout (30 minutes)
- **Remember Me**: Secure auto-login for trusted devices
- **Brute Force Protection**: Login attempt limiting with progressive delays
- **Role-Based Access**: Granular permissions per role
- **Secure Registration**: Admin-approved user registration
- **Data Validation**: Input sanitization and validation

## 📱 Usage

### For Administrators
1. **Create Registration Codes**: Generate codes for new users
2. **Manage Users**: Approve/reject registration requests
3. **Configure System**: Set up ateliers, workstations, and groups
4. **Monitor Activity**: View logs and system activity

### For Method Users
1. **Validate Users**: Approve users for your assigned sections
2. **Manage Routes**: Create and maintain manufacturing routes
3. **Define Features**: Set up quality characteristics
4. **Monitor Processes**: Track manufacturing performance

### For Production Users
1. **Enter Measurements**: Record quality data
2. **Follow Routes**: Execute manufacturing processes
3. **View Reports**: Access production reports
4. **Update Status**: Mark process completion

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Environment Variables
- No environment variables required for basic setup
- Database is stored locally in the application directory

## 📊 Database Management

### Storage Modes
- **Browser Mode**: In-memory SQLite database (development)
- **File System Mode**: Persistent SQLite file (production)

### Backup & Restore
- **Export**: Download database as SQLite file
- **Import**: Upload and restore database file
- **Clear Data**: Reset all data (admin only)

## 🔧 Configuration

### System Settings
- **Theme**: Light, Dark, or System preference
- **Language**: English, French, Spanish
- **Notifications**: Browser and violation alerts
- **Auto-save**: Automatic data persistence

### User Preferences
- **Dashboard Layout**: Customizable dashboard
- **Keyboard Shortcuts**: Configurable hotkeys
- **Display Options**: Chart colors and settings

## 📈 Monitoring & Logging

### Activity Logs
- **User Actions**: Login, logout, data changes
- **System Events**: Database operations, errors
- **Security Events**: Failed logins, access attempts
- **Performance**: Response times, query performance

### Notifications
- **Registration Requests**: New user approvals needed
- **System Alerts**: Critical system events
- **Quality Alerts**: Out-of-control measurements
- **User Updates**: Account changes and status

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the logs for error details
- Contact your system administrator
- Create an issue in the repository

## 🔄 Updates

### Version 2.0.0
- Complete rewrite with modern React architecture
- Enhanced security with bcrypt password hashing
- AES-GCM encryption for confidential data
- Improved user management system
- Better database performance
- Responsive design improvements
- Electron desktop app support
- Secure session management
- Brute force protection

---

**SPC Dashboard** - Empowering quality control through technology