# Contributing to Copilot Usage Tracker

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Constructive feedback only
- Help each other learn and grow

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/copilot-usage-tracker.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Follow the development guide: [DEVELOPMENT.md](DEVELOPMENT.md)

## Contribution Types

### Bug Reports

Found a bug? Please report it:

1. Check existing issues first
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (OS, VS Code version, etc.)
   - Screenshots if applicable

### Feature Requests

Have an idea? We'd love to hear it:

1. Check existing issues for similar requests
2. Create an issue with:
   - Clear description of the feature
   - Use case and motivation
   - Potential implementation approach (optional)
   - Any relevant examples

### Code Contributions

### Pull Request Process

1. **Prepare Your Branch**
   - Keep commits focused and atomic
   - Rebase on latest main: `git rebase origin/main`
   - Write clear commit messages (see below)

2. **Code Style**
   - Run linter: `npm run lint -- --fix`
   - Use TypeScript strict mode
   - No `any` types
   - Add comments for complex logic
   - Update documentation

3. **Testing**
   - Manual test all affected features
   - Test edge cases
   - Verify performance impact

4. **Documentation**
   - Update README if user-facing changes
   - Update CHANGELOG.md
   - Add inline comments for complex code
   - Update DEVELOPMENT.md if needed

5. **Commit Messages**
   ```
   Short summary (50 chars max)
   
   More detailed explanation if needed.
   - Point 1
   - Point 2
   
   Fixes #123
   ```

6. **Submit PR**
   - Clear title and description
   - Reference related issues
   - Explain changes and rationale
   - Link to any relevant discussions

### Commit Message Guidelines

- First line: concise summary (50 characters max)
- Blank line
- Detailed explanation (if needed)
- Reference issues: `Fixes #123`, `Related to #456`

Examples:
```
Add token cost estimation

- Calculate estimated cost based on token count
- Support multiple pricing models
- Display in dashboard

Fixes #42
```

```
Fix database migration issue

The migration script was failing on Windows due to path handling.
Use path.join() instead of concatenation for cross-platform support.

Related to #89
```

## Code Standards

### TypeScript

✅ **DO:**
- Use strict mode
- Explicit types for function parameters and returns
- Use interfaces for data contracts
- Use async/await for promises
- Export public APIs, keep helpers private

❌ **DON'T:**
- Use `any` types
- Use `var` (use `const` or `let`)
- Mix callbacks and promises
- Import from internal implementation

### Error Handling

✅ **DO:**
- Always catch errors
- Log errors with context
- Provide meaningful error messages
- Handle edge cases

```typescript
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error("Operation failed", error);
  throw new Error("Failed to complete operation");
}
```

### Comments

✅ **DO:**
- Comment "why", not "what"
- Add JSDoc for public methods
- Explain non-obvious logic
- Keep comments up-to-date

```typescript
/**
 * Calculate token usage for the given text
 * @param text - Input text to estimate tokens
 * @param model - Model identifier (default: gpt-3.5-turbo)
 * @returns Estimated token count
 */
public estimateTokens(text: string, model: string = "gpt-3.5-turbo"): number {
  // Implementation uses tiktoken for accuracy
  // vs estimation algorithms
}
```

❌ **DON'T:**
```typescript
// This is bad
// i = i + 1; // Increment i

// This is obvious from the code
const x = 5; // Set x to 5
```

### File Organization

- One exported class/interface per file
- Related utilities can be grouped
- Keep files focused and under 400 lines
- Use clear, descriptive names

## Areas for Contribution

### High Priority
- [ ] Real GitHub Copilot Chat integration
- [ ] Performance optimizations
- [ ] Bug fixes
- [ ] Documentation improvements

### Medium Priority
- [ ] Enhanced filtering options
- [ ] Export to cloud storage
- [ ] Advanced analytics
- [ ] UI/UX improvements

### Nice to Have
- [ ] Additional export formats
- [ ] Localization
- [ ] Custom themes
- [ ] Plugin system

## Development Tips

### Debugging
- Use `logger.debug()` for detailed info
- Check extension logs: View → Output
- Use VS Code debugger: F5 in development window

### Testing Changes
- Manual testing checklist in [DEVELOPMENT.md](DEVELOPMENT.md)
- Build: `npm run build`
- Lint: `npm run lint`
- Test specific command: Type into palette

### Performance
- Profile with VS Code profiler
- Check database query performance
- Monitor extension host resources

## Handling Feedback

- Read feedback carefully
- Ask clarifying questions if needed
- Update based on suggestions
- Thank reviewers for their time

## Review Process

1. **Automated Checks**
   - ESLint validation
   - Build verification
   - Code format check

2. **Code Review**
   - Maintainers review for:
     - Code quality
     - Consistency with standards
     - Performance impact
     - Security concerns
   - You may be asked for changes

3. **Approval & Merge**
   - Once approved, PR is merged
   - Your contribution is now part of the project!

## Questions?

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for setup help
- Read existing code for patterns
- Ask in GitHub issues or discussions
- Comment on PRs for clarification

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for making Copilot Usage Tracker better! 🙏
