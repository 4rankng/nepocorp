import React from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Box,
  Typography,
  Divider,
  Paper,
  CircularProgress,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const ConfirmationDialog = ({
  open,
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  details = null,
  onConfirm,
  onCancel,
  confirmText = 'Xóa',
  cancelText = 'Hủy',
  confirmColor = 'primary',
  icon: Icon = null,
  iconColor = 'primary',
  type = 'info', // 'info' | 'delete' | 'warning'
  maxWidth = 'sm',
  content = null, // Custom content render function
  data = null, // Data to pass to content render function
  isLoading = false,
  disableEscapeKeyDown = false,
}) => {
  const getDialogStyles = () => {
    switch (type) {
      case 'delete':
        return {
          bgColor: 'error.50',
          borderColor: 'error.200',
          iconColor: 'error',
        };
      case 'warning':
        return {
          bgColor: 'warning.50',
          borderColor: 'warning.200',
          iconColor: 'warning',
        };
      default:
        return {
          bgColor: 'grey.50',
          borderColor: 'grey.200',
          iconColor: iconColor,
        };
    }
  };

  const styles = getDialogStyles();

  const handleKeyDown = React.useCallback(
    e => {
      if (!disableEscapeKeyDown && e.key === 'Escape' && onCancel) {
        onCancel();
      }
    },
    [disableEscapeKeyDown, onCancel]
  );

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      onKeyDown={handleKeyDown}
      aria-labelledby="confirmation-dialog-title"
      maxWidth={maxWidth}
      fullWidth
    >
      <DialogTitle
        id="confirmation-dialog-title"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {Icon && <Icon color={styles.iconColor} />}
        {title}
        <Box sx={{ flex: 1 }} />
        <IconButton
          aria-label="close"
          onClick={onCancel}
          sx={{
            position: 'relative',
            right: -8,
            color: theme => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {message && (
          <DialogContentText component="div" id="confirmation-dialog-description" sx={{ mb: 2 }}>
            {message}
          </DialogContentText>
        )}

        {(details || content) && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: styles.bgColor,
              borderColor: styles.borderColor,
              mb: 2,
            }}
          >
            {content ? (
              content(data)
            ) : (
              <>
                <Box display="flex" alignItems="center" mb={1}>
                  <Typography variant="subtitle2" color={`${styles.iconColor}.main`}>
                    Thông tin chi tiết
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                {Object.entries(details).map(([key, value]) => (
                  <Box key={key} display="flex" mb={1}>
                    <Typography variant="body2" sx={{ minWidth: '100px', fontWeight: 500 }}>
                      {key}:
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {value || '-'}
                    </Typography>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit" disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          color={confirmColor}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
