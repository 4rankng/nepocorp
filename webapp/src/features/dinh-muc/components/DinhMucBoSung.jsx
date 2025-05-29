import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  useTheme,
} from '@mui/material';
import { EditButton } from '@/components/ActionButtons';

const DinhMucBoSung = ({
  supplementaryStandard,
  onSaveSupplementary, // This will be handleSaveSupplementary from the hook
  // isLoading: propIsLoading, // To differentiate from internal loading if any
}) => {
  const muiTheme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(supplementaryStandard);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(supplementaryStandard);
  }, [supplementaryStandard]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(supplementaryStandard);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditValue(supplementaryStandard);
  };

  const handleSave = async () => {
    if (editValue === supplementaryStandard) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSaveSupplementary(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving supplementary standard:', error);
      // Optionally, show a local error message or rely on parent's snackbar
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        mt: { xs: 1, md: 2 },
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {isEditing ? (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="number"
              size="medium" // Scaled up
              variant="outlined"
              value={editValue}
              onChange={e => setEditValue(parseFloat(e.target.value) || 0)}
              onKeyDown={handleKeyPress}
              sx={{
                width: '120px', // Adjusted width
                '& .MuiInputBase-input': {
                  textAlign: 'center',
                  fontSize: '1.1rem', // Increased input font size
                },
              }}
              autoFocus
            />
            <Typography variant="subtitle1" sx={{ whiteSpace: 'nowrap' }}>
              {' '}
              {/* Scaled up */}
              lít/chuyến
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              onClick={handleSave}
              variant="contained"
              color="primary"
              size="medium" // Scaled up
              disabled={isSaving}
              sx={{ minWidth: '80px' }} // Adjusted minWidth
            >
              {isSaving ? <CircularProgress size={20} color="inherit" /> : 'Lưu'}
            </Button>
            <Button
              onClick={handleCancelEdit}
              variant="outlined"
              size="medium" // Scaled up
              sx={{ minWidth: '80px' }} // Adjusted minWidth
            >
              Hủy
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography
            variant="h3" // Scaled up further
            component="span"
            sx={{
              color: muiTheme.palette.primary.main,
              fontWeight: 'bold',
            }}
          >
            {supplementaryStandard}
          </Typography>
          <Typography
            variant="body1" // Scaled up
            component="span"
            sx={{ color: muiTheme.palette.text.secondary, whiteSpace: 'nowrap', ml: 0.5, mr: 1 }}
          >
            lít/chuyến
          </Typography>
          <EditButton onClick={handleEdit} size="medium" />
        </Box>
      )}
    </Paper>
  );
};

export default DinhMucBoSung;
