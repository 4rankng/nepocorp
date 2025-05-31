import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import RouteIcon from '@mui/icons-material/Route'; // Using RouteIcon

const DinhMucDiDuongDeleteDialog = ({
  open,
  rowData,
  containerTypes, // Pass sortedContainerTypes here
  onClose,
  onConfirm,
  isLoading,
}) => {
  const getContainerTypeName = maLoaiContainer => {
    const foundType = containerTypes.find(ct => ct.ma_loai_container === maLoaiContainer);
    return foundType ? foundType.ten_loai_container : maLoaiContainer;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      aria-labelledby="delete-dinh-muc-di-duong-dialog"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="delete-dinh-muc-di-duong-dialog"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <RouteIcon color="error" />
        Định Mức Đi Đường
      </DialogTitle>
      <DialogContent>
        <DialogContentText component="div">
          Bạn có chắc chắn muốn xóa toàn bộ định mức cho tuyến đường sau đây? Hành động này không
          thể hoàn tác.
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'error.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'error.200',
            }}
          >
            <Typography variant="subtitle2" gutterBottom color="error.main">
              Thông tin tuyến đường:
            </Typography>
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={4}>
                <Typography variant="body2" fontWeight="500">
                  Mã tuyến:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2" fontWeight="medium">
                  {rowData?.ma_tuyen || '-'}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" fontWeight="500">
                  Điểm đi:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2" fontWeight="medium">
                  {rowData?.diem_di || '-'}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="body2" fontWeight="500">
                  Điểm đến:
                </Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography variant="body2" fontWeight="medium">
                  {rowData?.diem_den || '-'}
                </Typography>
              </Grid>
            </Grid>

            {rowData?.containerNorms && Object.keys(rowData.containerNorms).length > 0 && (
              <Box mt={1.5}>
                <Typography variant="body2" fontWeight="500" gutterBottom>
                  Định mức theo loại container:
                </Typography>
                <List dense disablePadding sx={{ maxHeight: 150, overflow: 'auto' }}>
                  {Object.entries(rowData.containerNorms).map(([maLoaiContainer, dinhMuc]) => (
                    <ListItem key={maLoaiContainer} disableGutters sx={{ py: 0.25 }}>
                      <ListItemText
                        primary={`${getContainerTypeName(maLoaiContainer)}:`}
                        secondary={dinhMuc !== undefined ? dinhMuc.toLocaleString('vi-VN') : '-'}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'normal' }}
                        secondaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 'medium',
                          textAlign: 'right',
                        }}
                        sx={{ display: 'flex', justifyContent: 'space-between' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          Hủy
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          autoFocus
          disabled={isLoading}
        >
          {isLoading ? 'Đang xóa...' : 'Xóa toàn bộ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DinhMucDiDuongDeleteDialog;
