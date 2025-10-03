# Contributing to SPC Dashboard

Thank you for your interest in contributing to the SPC Dashboard project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git
- Basic knowledge of React, TypeScript, and SQLite

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd SPC-Dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Start Electron desktop app
npm run electron-dev
```

## 📋 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep functions small and focused

### Security Guidelines
- **NEVER** store passwords in plain text
- Always use the encryption service for sensitive data
- Use bcrypt for password hashing (already implemented)
- Validate all user inputs
- Follow the principle of least privilege

### Database Guidelines
- Use the database service for all database operations
- Always use parameterized queries to prevent SQL injection
- Test database changes thoroughly
- Consider migration scripts for schema changes

## 🔐 Security Considerations

### Password Handling
```typescript
// ✅ Correct - Use async password hashing
const hashedPassword = await encryption.hashPassword(password);

// ❌ Wrong - Never store plain text passwords
const hashedPassword = password; // DON'T DO THIS
```

### Data Encryption
```typescript
// ✅ Correct - Encrypt sensitive data
const encryptedData = await encryption.encrypt(sensitiveData);

// ❌ Wrong - Don't store sensitive data in plain text
const encryptedData = sensitiveData; // DON'T DO THIS
```

### Input Validation
```typescript
// ✅ Correct - Validate all inputs
if (!username || username.trim() === '') {
  throw new Error('Username is required');
}

// ❌ Wrong - Don't trust user input
const query = `SELECT * FROM users WHERE username = '${username}'`; // DON'T DO THIS
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Guidelines
- Write tests for new features
- Test both success and error cases
- Mock external dependencies
- Test security-critical functions thoroughly

## 📝 Pull Request Process

### Before Submitting
1. **Fork** the repository
2. **Create** a feature branch from `main`
3. **Make** your changes
4. **Test** your changes thoroughly
5. **Update** documentation if needed
6. **Commit** with clear, descriptive messages

### Pull Request Guidelines
- Use clear, descriptive titles
- Provide detailed descriptions of changes
- Include screenshots for UI changes
- Reference any related issues
- Ensure all tests pass
- Update documentation as needed

### Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

Examples:
```
feat(auth): add bcrypt password hashing
fix(login): resolve password verification issue
docs(readme): update installation instructions
```

## 🐛 Bug Reports

### Before Reporting
1. Check if the issue already exists
2. Try to reproduce the issue
3. Check the logs for error messages
4. Test with the latest version

### Bug Report Template
```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10]
- Browser: [e.g. Chrome 91]
- Version: [e.g. 2.0.0]

**Additional context**
Any other context about the problem.
```

## 💡 Feature Requests

### Before Requesting
1. Check if the feature already exists
2. Consider if it aligns with the project goals
3. Think about implementation complexity
4. Consider security implications

### Feature Request Template
```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions.

**Additional context**
Any other context or screenshots about the feature request.
```

## 🏗️ Architecture Overview

### Project Structure
```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── layout/        # Layout components
│   ├── modules/       # Main application modules
│   └── ui/            # Reusable UI components
├── services/
│   ├── database.ts    # Database service
│   ├── authService.ts # Authentication service
│   ├── encryption.ts  # Encryption service
│   └── logger.ts      # Logging service
├── stores/            # Zustand state management
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

### Key Services
- **Database Service**: Handles all database operations
- **Auth Service**: Manages authentication and authorization
- **Encryption Service**: Provides secure data encryption
- **Logger Service**: Handles logging and monitoring

## 🔒 Security Policy

### Reporting Security Issues
- **DO NOT** create public issues for security vulnerabilities
- Email security issues to: [security@example.com]
- Include detailed steps to reproduce
- Provide your contact information

### Security Best Practices
- Never commit sensitive data (passwords, keys, etc.)
- Use environment variables for configuration
- Validate all user inputs
- Implement proper error handling
- Follow the principle of least privilege

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior
- Be respectful and inclusive
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the community

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or inflammatory comments
- Personal attacks or political discussions
- Spam or excessive self-promotion

## 📞 Getting Help

- Check the documentation first
- Search existing issues
- Join our community discussions
- Contact maintainers for urgent issues

---

Thank you for contributing to SPC Dashboard! 🚀
