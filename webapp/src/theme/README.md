# Theme System

This directory contains the application's theme configuration, built upon Material-UI's theming capabilities.

## Theme Structure (`index.js`)

The main theme is defined in `index.js` and exported as `theme`. It's created using Material-UI's `createTheme` function and includes customizations for:

- **Palette:** Defines the color scheme (primary, secondary, error, success, warning, info, text, background colors, etc.).
- **Typography:** Configures font families (primarily "Inter"), sizes, weights, and default styles for text elements (headings, body text, buttons).
- **Spacing:** Sets the base spacing unit (default is 8px). `theme.spacing(value)` can be used to generate spacing values.
- **Shape:** Defines global border-radius values.
- **Shadows:** Provides predefined elevation shadows.
- **Breakpoints:** Configures responsive breakpoints.
- **Components:** Includes global style overrides for various Material-UI components (e.g., `MuiButton`, `MuiTextField`, `MuiTable`) to ensure a consistent look and feel.

The theme is also made responsive using `responsiveFontSizes`.

## Using the Theme

**1. Accessing the Theme in Components:**

The primary way to access theme properties within React components is by using the `useTheme` hook from Material-UI:

```jsx
import { useTheme } from '@mui/material/styles'; // Or from '@/hooks/useTheme'
// ...
const MyComponent = () => {
  const theme = useTheme();
  // Now you can use theme properties:
  // theme.palette.primary.main
  // theme.typography.h1
  // theme.spacing(2)
  // theme.shape.borderRadius
  return (
    <div style={{ color: theme.palette.text.primary, padding: theme.spacing(2) }}>
      Styled Content
    </div>
  );
};
```

Alternatively, for class components or outside React's render lifecycle, you might need to pass the theme as a prop or use higher-order components if necessary, though functional components with hooks are preferred.

**2. Styling with the `sx` Prop:**

Material-UI components support the `sx` prop, which allows you to apply styles directly using theme values:

```jsx
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';

// Example
<Box sx={{ 
  backgroundColor: 'primary.main', // Accesses theme.palette.primary.main
  color: 'primary.contrastText',
  padding: 2, // Accesses theme.spacing(2) if theme.spacing is the default 8px factor
  borderRadius: 1, // Accesses theme.shape.borderRadius if it's a number
  '&:hover': {
    backgroundColor: 'primary.dark',
  }
}}>
  Hello
</Box>

<Button sx={{ fontWeight: 'bold' }}>
  Submit
</Button>
```
Note: String values for colors like `'primary.main'` in the `sx` prop are automatically resolved from `theme.palette`. Numerical values for padding, margin, and border-radius are often multiplied by `theme.spacing(1)` or use `theme.shape.borderRadius` directly if they are numbers.

**3. Theme Utilities (`utils.js`)**

The `webapp/src/theme/utils.js` file contains helper functions for creating common style patterns (e.g., `cardStyles`, `buttonStyles`). These should be used where applicable to promote consistency:

```jsx
import { cardStyles } from './utils'; // Adjust import path as needed
import Paper from '@mui/material/Paper';
import { useTheme } from '@mui/material/styles';

const MyCard = (props) => {
  const theme = useTheme();
  return <Paper sx={cardStyles(theme)} {...props} />;
}
```

## Guidelines for Maintaining Consistency

1.  **Prioritize Theme Values:** Always prefer using values from the `theme` object (e.g., `theme.palette.primary.main`, `theme.typography.body1.fontSize`) over hardcoding colors, font sizes, or spacing units. This ensures that any future theme updates are automatically reflected across the application.

2.  **Use `sx` Prop for MUI Components:** For Material-UI components, use the `sx` prop for instance-specific styling. This allows direct access to theme properties.

3.  **Material-UI First for Styling:** For UI elements that Material-UI provides components for, use them and style them using the theme.

4.  **Tailwind CSS for Layout:** Tailwind CSS can be used for general layout, grid systems, flexbox utilities, and situations where MUI components are not a direct fit. However, when it comes to colors, typography, and spacing that are defined in the Material-UI theme, prefer using the MUI theme values even if applying them via Tailwind (e.g. by configuring Tailwind to use these values, or by using inline styles with theme values where necessary). The goal is to have a single source of truth for the design language.

5.  **Avoid Local Themes:** Do not define local theme objects within components (as was done previously in `StandardTable.jsx`). Always use the global theme via `useTheme()`.

6.  **Responsive Design:** Utilize Material-UI's breakpoint helpers (`theme.breakpoints.up()`, `theme.breakpoints.down()`, etc.) within the `sx` prop or styled components for responsive styling.

7.  **Accessibility:**
    *   Ensure sufficient color contrast, especially between text and backgrounds. Use tools to check contrast ratios. The current theme aims for good contrast, but be mindful when combining colors.
    *   Use appropriate typography for readability.

By following these guidelines, we can maintain a consistent and professional look and feel throughout the application.
