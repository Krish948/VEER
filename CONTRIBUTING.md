# Contributing to VEER

Thank you for your interest in contributing to VEER! We welcome contributions from the community.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature/bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

1. **Prerequisites**
   - Node.js 18+
   - npm or yarn
   - Git

2. **Local Development**
   ```bash
   git clone https://github.com/yourusername/veer.git
   cd veer
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run dev
   ```

## Code Style

- We use TypeScript for type safety
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure all components are properly typed

## Submitting Changes

1. **Create a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure all tests pass

2. **Pull Request Guidelines**
   - Keep PRs focused and atomic
   - Update documentation if needed
   - Add tests for new features
   - Follow the existing commit message format

## Adding Themes

To add new themes to VEER:

1. Open `src/types/theme.ts`
2. Add your theme object to the `themes` array
3. Follow the existing color naming conventions
4. Test your theme with different components
5. Add a meaningful name and description

## Reporting Issues

When reporting issues, please include:
- Operating system and version
- Browser and version (if applicable)
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if relevant

## Code of Conduct

Please be respectful and professional in all interactions. We're here to build something amazing together!