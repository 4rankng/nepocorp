/**
 * Creates a set of styles for a card component
 * @param {Object} theme - The theme object
 * @returns {Object} Card styles
 */
export const cardStyles = theme => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },
  '&.MuiPaper-root': {
    overflow: 'hidden',
  },
});
/**
 * Creates a set of styles for a button
 * @param {Object} theme - The theme object
 * @returns {Object} Button styles
 */
export const buttonStyles = theme => ({
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1, 3),
  '&.MuiButton-contained': {
    boxShadow: theme.shadows[2],
    '&:hover': {
      boxShadow: theme.shadows[4],
      transform: 'translateY(-1px)',
    },
    '&:active': {
      boxShadow: theme.shadows[2],
      transform: 'translateY(0)',
    },
  },
});
/**
 * Creates a set of styles for form inputs
 * @param {Object} theme - The theme object
 * @returns {Object} Input styles
 */
export const inputStyles = theme => ({
  '& .MuiOutlinedInput-root': {
    '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: 1,
      borderColor: theme.palette.primary.main,
    },
  },
  '& .MuiFormLabel-root': {
    color: theme.palette.text.secondary,
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
  },
});
/**
 * Creates a set of styles for a table
 * @param {Object} theme - The theme object
 * @returns {Object} Table styles
 */
export const tableStyles = theme => ({
  '& .MuiTable-root': {
    minWidth: 650,
  },
  '& .MuiTableCell-head': {
    fontWeight: 600,
    backgroundColor: theme.palette.grey[100],
    color: theme.palette.text.primary,
  },
  '& .MuiTableRow-root': {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.action.hover,
    },
    '&:hover': {
      backgroundColor: theme.palette.action.selected,
    },
  },
});
/**
 * Creates a set of styles for a paper component
 * @param {Object} theme - The theme object
 * @returns {Object} Paper styles
 */
export const paperStyles = theme => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  backgroundColor: theme.palette.background.paper,
  '&.MuiPaper-elevation': {
    border: `1px solid ${theme.palette.divider}`,
  },
});
/**
 * Creates a set of styles for a modal/dialog
 * @param {Object} theme - The theme object
 * @returns {Object} Modal styles
 */
export const modalStyles = theme => ({
  '& .MuiDialog-paper': {
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(4),
    width: '100%',
    maxWidth: theme.breakpoints.values.sm,
    margin: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
      padding: theme.spacing(2),
    },
  },
  '& .MuiDialogTitle-root': {
    padding: 0,
    marginBottom: theme.spacing(3),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  '& .MuiDialogContent-root': {
    padding: 0,
    '&:first-of-type': {
      paddingTop: theme.spacing(1),
    },
  },
  '& .MuiDialogActions-root': {
    padding: 0,
    marginTop: theme.spacing(3),
    '& > *': {
      marginLeft: theme.spacing(1),
    },
  },
});
