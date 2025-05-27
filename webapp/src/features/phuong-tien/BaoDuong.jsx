import React, { useState, useEffect, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Paper,
  Card,
  CardContent,
  Chip,
  Collapse,
  Fab,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { vi } from 'date-fns/locale';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { dauKeoApi as maintenanceApi, roMoocApi as vehicleApi } from '@services/mockApi';
import { Search as SearchIcon } from '@mui/icons-material';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

// Mobile Card Component following DinhMucDau.jsx pattern
const MaintenanceCard = ({ record, onEdit, onDelete, isLoading }) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <Card
      onClick={handleExpandClick}
      sx={{
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        boxShadow: 'none',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 1,
          borderColor: 'primary.main',
        },
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Primary Information - Always Visible */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 1,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 0.5,
              }}
            >
              {record.licensePlate}
            </Typography>
            <Chip
              label={new Date(record.replacementDate).toLocaleDateString('vi-VN')}
              size="small"
              sx={{
                backgroundColor: 'primary.light',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Arrow as indicator only - not clickable */}
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Box>
          </Box>
        </Box>

        {/* Secondary Information - Collapsed by default */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: expanded ? 1 : 0,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {record.quantity} x {formatCurrency(record.unitPrice)}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {formatCurrency(record.total)}
          </Typography>
        </Box>

        {/* Expandable Section - Detailed Information */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ pt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Số lượng
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {record.quantity}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Đơn giá
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(record.unitPrice)}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Thời hạn bảo hành
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {record.warrantyPeriod} tháng
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Thành tiền
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: 'success.main',
                    fontFamily: 'monospace',
                  }}
                >
                  {formatCurrency(record.total)}
                </Typography>
              </Box>
              {record.note && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Ghi chú
                  </Typography>
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    {record.note}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Action Buttons - Only visible in expanded mode at bottom */}
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <EditButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(record);
                }}
                disabled={isLoading}
              />
              <DeleteButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(record);
                }}
                disabled={isLoading}
              />
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

const Section = ({ title, count, expanded, onToggle, onAdd, children }) => (
  <Paper
    elevation={0}
    sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
  >
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        px: 2,
        py: 2,
        bgcolor: expanded ? 'grey.100' : 'background.paper',
        borderBottom: expanded ? '1px solid' : 'none',
        borderColor: 'divider',
        transition: 'background 0.2s',
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
        {title}
      </Typography>
      {count > 0 && (
        <Chip
          label={count}
          size="small"
          sx={{
            backgroundColor: theme => alpha(theme.palette.text.secondary, 0.1),
            color: 'text.secondary',
            fontWeight: 500,
            fontSize: '0.75rem',
            mr: 2,
          }}
        />
      )}
      <AddButton
        size="small"
        onClick={e => {
          e.stopPropagation();
          onAdd();
        }}
      />
      <IconButton size="small" sx={{ ml: 1 }}>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
    </Box>
    <Collapse in={expanded} timeout="auto" unmountOnExit>
      <Box sx={{ p: { xs: 1, md: 2 } }}>{children}</Box>
    </Collapse>
  </Paper>
);

const BaoDuong = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedSections, setExpandedSections] = useState({
    tire: true, // Expanded by default
  });
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    recordId: null,
    details: null,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    licensePlate: '',
    replacementDate: new Date(),
    warrantyPeriod: 6,
    quantity: 1,
    unitPrice: 0,
    total: 0,
    note: '',
  });

  const [errors, setErrors] = useState({});

  // Calculate total whenever quantity or unitPrice changes
  useEffect(() => {
    const total = (formData.quantity || 0) * (formData.unitPrice || 0);
    setFormData(prev => ({
      ...prev,
      total: total,
    }));
  }, [formData.quantity, formData.unitPrice]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [records, vehicles] = await Promise.all([maintenanceApi.getAll(), vehicleApi.getAll()]);
      setMaintenanceRecords(records.data || []);
      // Extract license plates from vehicles for dropdown
      const licensePlateOptions =
        vehicles.data?.map(v => ({
          id: v.id,
          licensePlate: v.licensePlate,
        })) || [];
      setLicensePlates(licensePlateOptions);
      setError('');
    } catch (err) {
      setError('Không thể tải dữ liệu bảo dưỡng');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      licensePlate: '',
      replacementDate: new Date(),
      warrantyPeriod: 6,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      note: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = record => {
    setIsEdit(true);
    setFormData({
      licensePlate: record.licensePlate,
      replacementDate: new Date(record.replacementDate),
      warrantyPeriod: record.warrantyPeriod,
      quantity: record.quantity,
      unitPrice: record.unitPrice,
      total: record.total,
      note: record.note || '',
      id: record.id,
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false);
    setErrors({});
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licensePlate) {
      newErrors.licensePlate = 'Vui lòng chọn biển số xe';
    }
    if (!formData.replacementDate) {
      newErrors.replacementDate = 'Vui lòng chọn ngày thay lốp';
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    }
    if (!formData.unitPrice || formData.unitPrice < 0) {
      newErrors.unitPrice = 'Đơn giá không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async e => {
    e?.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = {
        ...formData,
        replacementDate: formData.replacementDate.toISOString().split('T')[0],
        warrantyPeriod: Number(formData.warrantyPeriod),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        total: Number(formData.quantity) * Number(formData.unitPrice),
      };

      if (isEdit) {
        await maintenanceApi.update(formData.id, data);
        showSnackbar('Sửa thông tin bảo dưỡng thành công');
      } else {
        await maintenanceApi.create(data);
        showSnackbar('Thêm thông tin bảo dưỡng mới thành công');
      }
      await fetchData();
      handleCloseDialog();
    } catch (err) {
      const errorMessage = isEdit
        ? 'Đã xảy ra lỗi khi sửa thông tin bảo dưỡng'
        : 'Đã xảy ra lỗi khi thêm thông tin bảo dưỡng mới';
      showSnackbar(errorMessage, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = record => {
    setDeleteDialog({
      open: true,
      recordId: record.id,
      details: {
        'Biển số xe': record.licensePlate,
        'Ngày thay lốp': new Date(record.replacementDate).toLocaleDateString('vi-VN'),
        'Số lượng': record.quantity,
        'Đơn giá': formatCurrency(record.unitPrice),
        'Thành tiền': formatCurrency(record.total),
        'Ghi chú': record.note || 'Không có',
      },
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.recordId) return;

    setIsLoading(true);
    try {
      await maintenanceApi.delete(deleteDialog.recordId);
      showSnackbar('Xóa thông tin bảo dưỡng thành công');
      await fetchData();
      handleDeleteClose();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa thông tin bảo dưỡng', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter maintenance records based on search term
  const filteredRecords = React.useMemo(() => {
    if (!searchTerm.trim()) return maintenanceRecords;
    const search = searchTerm.toLowerCase();
    return maintenanceRecords.filter(
      record =>
        (record.licensePlate && record.licensePlate.toLowerCase().includes(search)) ||
        (record.note && record.note.toLowerCase().includes(search))
    );
  }, [maintenanceRecords, searchTerm]);

  const columns = [
    {
      key: 'licensePlate',
      label: 'Biển số xe',
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'replacementDate',
      label: 'Ngày thay lốp',
      render: value => new Date(value).toLocaleDateString('vi-VN'),
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'warrantyPeriod',
      label: 'Thời hạn bảo hành',
      render: value => `${value} tháng`,
      align: 'center',
      sortable: true,
      minWidth: 140,
    },
    {
      key: 'quantity',
      label: 'Số lượng',
      align: 'right',
      sortable: true,
      minWidth: 100,
    },
    {
      key: 'unitPrice',
      label: 'Đơn giá',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 120,
    },
    {
      key: 'total',
      label: 'Thành tiền',
      render: formatCurrency,
      align: 'right',
      sortable: true,
      minWidth: 140,
    },
    {
      key: 'note',
      label: 'Ghi chú',
      render: value => value || 'Không có',
      minWidth: 200,
      noWrap: true,
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenEditDialog(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeleteClick(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];

  const toggleSection = section => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAddNew = (type = 'tire') => {
    setIsEdit(false);
    setFormData({
      licensePlate: '',
      replacementDate: new Date(),
      warrantyPeriod: 6,
      quantity: 1,
      unitPrice: 0,
      total: 0,
      note: '',
      type: type,
    });
    setErrors({});
    setOpenDialog(true);
  };

  // Render mobile card view following DinhMucDau.jsx pattern
  const renderMobileView = () => (
    <Box>
      {filteredRecords.map(record => (
        <MaintenanceCard
          key={record.id}
          record={record}
          onEdit={handleOpenEditDialog}
          onDelete={handleDeleteClick}
          isLoading={isLoading}
        />
      ))}
      {!isLoading && filteredRecords.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy bảo dưỡng phù hợp' : 'Không có dữ liệu bảo dưỡng'}
        </Typography>
      )}
    </Box>
  );

  // Render desktop table view
  const renderDesktopView = () => (
    <StandardTable
      columns={columns}
      data={filteredRecords}
      loading={isLoading}
      error={error}
      emptyMessage="Không có dữ liệu bảo dưỡng nào"
      sx={{
        '& .MuiTableRow-hover:hover': {
          backgroundColor: 'action.hover',
        },
      }}
    />
  );

  return (
    <Box sx={{ width: '100%', position: 'relative' }}>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo biển số hoặc ghi chú..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Loading state */}
      {isLoading && (
        <Box textAlign="center" py={4}>
          <Typography>Đang tải dữ liệu...</Typography>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Content */}
      {!isLoading && !error && (
        <Box>
          {/* Lốp Xe Section */}
          <Section
            title="Lốp Xe"
            count={filteredRecords.length}
            expanded={expandedSections.tire}
            onToggle={() => toggleSection('tire')}
            onAdd={() => handleAddNew('tire')}
          >
            {isMobile ? renderMobileView() : renderDesktopView()}
          </Section>
        </Box>
      )}
      {/* FAB for add at bottom right (always visible) */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => handleAddNew('tire')}
        disabled={isLoading}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, md: 32 },
          right: { xs: 24, md: 32 },
          zIndex: 1201,
          boxShadow: 6,
        }}
      >
        <AddIcon />
      </Fab>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <DialogContent sx={{ p: '24px' }}>
          <DialogContentText
            sx={{
              mb: 3,
              color: 'text.primary',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {isEdit
              ? 'Sửa thông tin bảo dưỡng phương tiện.'
              : 'Nhập thông tin bảo dưỡng mới cho phương tiện.'}
          </DialogContentText>

          <Box component="form" noValidate autoComplete="off" onSubmit={handleSave}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormControl fullWidth size="small" error={!!errors.licensePlate}>
                <InputLabel>Biển số xe *</InputLabel>
                <Select
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleInputChange}
                  label="Biển số xe *"
                  sx={{
                    '& .MuiSelect-select': {
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  {licensePlates.map(plate => (
                    <MenuItem key={plate.id} value={plate.licensePlate}>
                      {plate.licensePlate}
                    </MenuItem>
                  ))}
                </Select>
                {errors.licensePlate && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    {errors.licensePlate}
                  </Typography>
                )}
              </FormControl>

              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
                <DatePicker
                  label="Ngày thay lốp *"
                  value={formData.replacementDate}
                  onChange={date => {
                    setFormData(prev => ({
                      ...prev,
                      replacementDate: date,
                    }));
                    if (errors.replacementDate) {
                      setErrors(prev => ({ ...prev, replacementDate: '' }));
                    }
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      size="small"
                      fullWidth
                      error={!!errors.replacementDate}
                      helperText={errors.replacementDate || ''}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        ...params.inputProps,
                        style: {
                          height: '40px',
                          padding: '8px 12px',
                          boxSizing: 'border-box',
                          fontSize: '0.875rem',
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'text.secondary',
                          },
                        },
                      }}
                    />
                  )}
                  components={{
                    OpenPickerIcon: CalendarMonthIcon,
                  }}
                />
              </LocalizationProvider>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                <Box sx={{ width: '30%' }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Số lượng *"
                    name="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData(prev => ({
                        ...prev,
                        quantity: value,
                      }));
                      if (errors.quantity) {
                        setErrors(prev => ({ ...prev, quantity: '' }));
                      }
                    }}
                    error={!!errors.quantity}
                    helperText={errors.quantity || ''}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    inputProps={{
                      min: 1,
                      style: {
                        height: '40px',
                        padding: '8px 12px',
                        boxSizing: 'border-box',
                        fontSize: '0.875rem',
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'text.secondary',
                        },
                      },
                    }}
                  />
                </Box>

                <Box sx={{ width: '70%' }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Đơn giá (VND) *"
                    name="unitPrice"
                    type="number"
                    value={formData.unitPrice}
                    onChange={e => {
                      const value = Math.max(0, parseInt(e.target.value) || 0);
                      setFormData(prev => ({
                        ...prev,
                        unitPrice: value,
                      }));
                      if (errors.unitPrice) {
                        setErrors(prev => ({ ...prev, unitPrice: '' }));
                      }
                    }}
                    error={!!errors.unitPrice}
                    helperText={errors.unitPrice || ''}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="body2" color="text.secondary">
                            VND
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      style: {
                        height: '40px',
                        padding: '8px 12px',
                        boxSizing: 'border-box',
                        fontSize: '0.875rem',
                        textAlign: 'right',
                      },
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'text.secondary',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>

              <TextField
                fullWidth
                size="small"
                label="Bảo hành (tháng)"
                name="warrantyPeriod"
                type="number"
                value={formData.warrantyPeriod}
                onChange={e => {
                  const value = Math.max(0, parseInt(e.target.value) || 0);
                  setFormData(prev => ({
                    ...prev,
                    warrantyPeriod: value,
                  }));
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: 0,
                  style: {
                    height: '40px',
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'text.secondary',
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Tổng tiền (VND)"
                value={formatCurrency(formData.total || 0)}
                disabled
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography variant="body2" color="text.secondary">
                        VND
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  style: {
                    height: '40px',
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                    textAlign: 'right',
                    color: 'text.primary',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'action.hover',
                    '&.Mui-disabled': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'divider',
                      },
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Ghi chú"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                multiline
                rows={3}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  style: {
                    padding: '8px 12px',
                    boxSizing: 'border-box',
                    fontSize: '0.875rem',
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '6px',
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'text.secondary',
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            disabled={isLoading}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            onClick={handleSave}
            disabled={isLoading || !formData.licensePlate || !formData.replacementDate}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              minWidth: '100px',
              textTransform: 'none',
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa thông tin bảo dưỡng"
        message="Bạn có chắc chắn muốn xóa thông tin bảo dưỡng này?"
        details={deleteDialog.details}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
        loading={isLoading}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BaoDuong;
