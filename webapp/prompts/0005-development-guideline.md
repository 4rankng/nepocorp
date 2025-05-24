Frontend Development with React
Package Management and Setup
Always use Yarn instead of NPM for better performance and caching

Use yarn.lock for deterministic builds and dependency resolution

Leverage Yarn workspaces for monorepo management

Keep dependencies up to date with regular audits

Styling Framework Selection
Primary choice: Use Tailwind CSS for utility-first styling approach

Secondary choice: Use Material-UI (MUI) when component-based approach is preferred

Configure Tailwind with PostCSS for optimal performance

Create consistent design system with custom Tailwind configuration

Code Quality and Formatting
Always set up Prettier and ESLint with React-specific rules

Configure automatic formatting on save in IDE

Use consistent code style across the entire project

Implement pre-commit hooks for code quality enforcement

Development Workflow
Use mock API and mock data as default when starting new projects

Set up realistic mock endpoints that match production API structure

Use proper error handling for API calls with loading states

Implement proper data fetching patterns with caching

User Interface Patterns
Use modal boxes for confirmation dialogs with proper accessibility

Implement snackbar notifications for user feedback

Create reusable UI components following atomic design principles

Ensure consistent spacing and typography throughout the application

Path Management
Always use path aliases for cleaner imports

Configure both Vite/Webpack and TypeScript for path resolution

Use consistent alias naming conventions across projects

Organize imports with absolute paths for better maintainability

Component Development Best Practices
Component Structure
Use functional components with React Hooks over class components

Implement proper component decomposition following Single Responsibility Principle

Create custom hooks for reusable stateful logic

Use TypeScript for better type safety and developer experience

Naming Conventions
Use PascalCase for component names

Use camelCase for methods, functions, and variables

Use UPPER_CASE for global constants

Use descriptive and meaningful names for better code readability

Performance Optimization
Use React.memo for functional components to prevent unnecessary re-renders

Implement proper dependency arrays in useEffect hooks

Avoid creating objects and functions inside render methods

Use lazy loading for code splitting and better performance

Implement proper state management to minimize prop drilling

Additional Development Guidelines
Project Organization
Organize files by feature rather than by file type

Create clear separation between common and feature-specific components

Maintain consistent folder structure across projects

Use index files for cleaner imports
