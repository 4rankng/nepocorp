# Nepocorp Design Guide

Based on the vehicle management (`phuong-tien`) feature implementation, this guide establishes UI/UX design patterns and standards for the Nepocorp Transport Management System.

## Dialog & Modal Design Standards

### Dialog Headers

• Use clear, action-oriented titles that describe the current operation
• Always include a close button (X) in the top-right corner with hover states
• Differentiate between "edit" and "create" modes in the title text
• Apply consistent padding of 16px vertical, 24px horizontal
• Use Typography variant "h6" with font size 1.125rem and weight 600

### Dialog Content Structure

• Start with a brief description explaining the purpose of the dialog
• Use DialogContentText with appropriate spacing (margin-bottom: 3)
• Apply consistent padding of 24px with special handling for top padding
• Adapt descriptive text based on context (create vs edit operations)
• Use readable font sizes (0.875rem) with proper line height (1.5)

### Form Layout Principles

• Organize forms using Grid container with consistent spacing (typically 2)
• Group related fields together logically
• Use full width (xs=12) for primary or important fields
• Split related data pairs into columns (xs=6) for better space utilization
• Apply consistent margin-bottom (2) between form sections

### Dialog Actions Standards

• Place primary action (Save/Submit) on the right side
• Use outlined variant for cancel button with inherit color
• Use contained variant for primary action button
• Implement loading states with circular progress indicators
• Disable primary button when form is invalid or loading
• Show different text during loading states ("Đang lưu..." vs "Lưu")
• Apply consistent padding (16px 24px) and gap (1) between buttons

## Data Display Patterns

### Table Design

• Use Material-UI Table components with consistent styling
• Implement sticky headers for better navigation in long lists
• Apply zebra striping for better row distinction
• Include proper loading states with skeleton loaders
• Show empty states with meaningful messages and illustrations

### Status Indicators

• Use consistent color coding for different states
• Implement chip components for status display
• Apply proper contrast ratios for accessibility
• Use icons alongside text for better visual communication

### Action Buttons

• Group related actions together (Edit, Delete, View)
• Use icon buttons for space-efficient design
• Implement proper hover and focus states
• Apply consistent sizing and spacing
• Use tooltips for icon-only buttons

## Form Field Standards

### Input Field Design

• Use outlined variant as default for text fields
• Apply consistent sizing (typically "small" for dense layouts)
• Implement proper validation states with error messages
• Use placeholder text that provides helpful hints
• Apply fullWidth prop for better layout consistency

### Date and Time Pickers

• Use Material-UI DatePicker components
• Apply consistent date format across the application
• Implement proper validation for date ranges
• Use appropriate input adornments (calendar icons)

### Select Fields

• Use Material-UI Select components with proper placeholder text
• Implement search functionality for long option lists
• Apply consistent option formatting
• Use proper loading states for dynamic options

## Loading and Error States

### Loading Indicators

• Use skeleton loaders for table content
• Implement button loading states with progress indicators
• Apply consistent loading overlay patterns
• Use appropriate spinner sizes based on context

### Error Handling

• Display error messages clearly and contextually
• Use proper color coding (error theme colors)
• Implement retry mechanisms where appropriate
• Provide helpful error descriptions

## Responsive Design

### Breakpoint Strategy

• Design mobile-first with progressive enhancement
• Use Material-UI's breakpoint system consistently
• Implement proper table responsiveness (horizontal scroll when needed)
• Apply appropriate spacing adjustments for different screen sizes

### Touch Targets

• Ensure minimum 44px touch target size for mobile
• Apply appropriate spacing between interactive elements
• Use proper button sizing for touch interfaces

## Accessibility Standards

### Keyboard Navigation

• Implement proper tab order for all interactive elements
• Use appropriate ARIA labels for screen readers
• Ensure all functionality is keyboard accessible
• Apply proper focus indicators

### Color and Contrast

• Maintain WCAG AA contrast ratios
• Don't rely solely on color to convey information
• Use icons and text together for status indicators
• Apply proper color themes consistently

## Content and Language

### Vietnamese Language Support

• Use proper Vietnamese text throughout the interface
• Apply consistent terminology across features
• Implement proper text length handling for Vietnamese content
• Use culturally appropriate date and number formats

### Microcopy Guidelines

• Use clear, action-oriented button text
• Provide helpful placeholder text in form fields
• Write concise but informative error messages
• Use consistent voice and tone throughout the application

## Performance Considerations

### Component Optimization

• Implement proper component memoization where needed
• Use lazy loading for heavy components
• Apply efficient re-rendering strategies
• Minimize unnecessary API calls

### Data Loading

• Implement proper pagination for large datasets
• Use skeleton loaders during initial data fetch
• Apply efficient caching strategies
• Show progressive loading for better perceived performance
