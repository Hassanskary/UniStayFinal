# 🤝 Contributing Guide - ESH Project

Thank you for your interest in contributing to the ESH project! This guide will help you understand how to contribute effectively.

## 📋 How to Contribute

### 1. Bug Reports

If you find a bug in the project, please:

- **Search first**: Make sure the issue hasn't been reported before
- **Use the template**: Use the Bug Report template when opening a new Issue
- **Provide complete details**: 
  - Description of the problem
  - Steps to reproduce the issue
  - Expected behavior
  - Screenshots (if possible)
  - System and browser information

### 2. Feature Requests

To suggest new features:

- **Describe the feature**: Clearly explain the requested feature
- **Justify the feature**: Explain why this feature is useful
- **Proposed implementation**: If you have ideas about implementation
- **Examples**: Provide usage examples

### 3. Code Contributions

#### Local Environment Setup

1. **Fork the Project**
```bash
git clone https://github.com/your-username/ESH-Housing-System.git
cd ESH-Housing-System
```

2. **Create a New Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

3. **Install Dependencies**
```bash
# Frontend
cd FinalGP/finalgp.client
npm install

# Backend
cd ../FinalGP.Server
dotnet restore
```

#### Code Standards

- **Formatting**: Follow the formatting standards used in the project
- **Comments**: Add explanatory comments for complex code
- **Naming**: Use clear and descriptive names for variables and functions
- **Testing**: Ensure the code works correctly

#### Commit Guidelines

Use clear and descriptive commit messages:

```bash
# Good
git commit -m "feat: add advanced search system"

# Bad
git commit -m "fix bug"
```

Examples of commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation update
- `style:` - Formatting improvements
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

#### Submitting Pull Requests

1. **Update Branch**
```bash
git fetch origin
git rebase origin/main
```

2. **Create Pull Request**
- Use the appropriate PR template
- Link PR to related Issue
- Write a clear description of changes

3. **Code Review**
- Ensure all tests pass
- Respond to review comments
- Keep PR updated

## 🎯 Contribution Areas

### Frontend (React)
- Improve user interface
- Add new interactive features
- Performance optimization
- Fix compatibility issues

### Backend (ASP.NET Core)
- Add new API endpoints
- Improve performance and security
- Fix database issues
- Improve documentation

### Documentation
- Update README
- Add usage examples
- Improve code comments
- Create user guides

### Testing
- Add unit tests
- Add integration tests
- Improve test coverage

## 📞 Communication

- **Issues**: Use GitHub Issues for general discussions
- **Discussions**: Use GitHub Discussions for extended conversations
- **Email**: For private inquiries

## 🏆 Recognition

All contributors will be added to the project's contributors list. Outstanding contributions will be featured in the README.

## 📄 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT).

---

**Thank you for helping make ESH better!** 🚀 