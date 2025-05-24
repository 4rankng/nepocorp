import { useTheme as useMuiTheme } from '@mui/material/styles';

/**
 * Custom hook that provides access to the theme object
 * @returns {Object} The theme object
 */
export const useTheme = () => {
  const theme = useMuiTheme();
  return theme;
};

/**
 * Hook that returns a function to get theme spacing
 * @returns {Function} A function that takes a number and returns a spacing string
 */
export const useSpacing = () => {
  const theme = useMuiTheme();
  return value => theme.spacing(value);
};

/**
 * Hook that returns a function to get theme color with alpha
 * @returns {Function} A function that takes a color and opacity and returns a color string with alpha
 */
export const useAlpha = () => {
  const theme = useMuiTheme();
  return (color, opacity) => {
    if (!color) return color;
    if (opacity === 1 || opacity === undefined) return color;
    return theme.palette.augmentColor({
      color: { main: color },
    }).light; // Using light variant for alpha channel
  };
};
