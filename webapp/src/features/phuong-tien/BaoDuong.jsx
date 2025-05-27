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
import { lopXeApi } from '@services/mockApi';
import { Search as SearchIcon } from '@mui/icons-material';
import MaintenanceCard from './components/MaintenanceCard';
import MaintenanceDialog from './components/MaintenanceDialog';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
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

  // Helper to add months to a date
  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + Number(months));
    return d;
  }

  const [formData, setFormData] = useState({
    licensePlate: '',
    replacementDate: new Date(),
    warrantyPeriod: 6,
    ngayHetHan: addMonths(new Date(), 6),
    quantity: 1,
    unitPrice: 0,
    total: 0,
    note: '',
  });

  const [errors, setErrors] = useState({});

  // Auto-calculate ngayHetHan when replacementDate or warrantyPeriod changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ngayHetHan: addMonths(prev.replacementDate, prev.warrantyPeriod),
    }));
    // eslint-disable-next-line
  }, [formData.replacementDate, formData.warrantyPeriod]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const recordsRes = await lopXeApi.getAll();
      setMaintenanceRecords(recordsRes.data || []);
      // Extract unique license plates from records
      const licensePlateOptions = Array.from(
        new Set((recordsRes.data || []).map(r => r.licensePlate))
      ).map(plate => ({ id: plate, licensePlate: plate }));
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
    const replacementDate = new Date();
    const warrantyPeriod = 6;
    setFormData({
      licensePlate: '',
      replacementDate,
      warrantyPeriod,
      ngayHetHan: addMonths(replacementDate, warrantyPeriod),
      quantity: 1,
      unitPrice: 0,
      total: 0,
      note: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = record => {
    const replacementDate = new Date(record.replacementDate);
    const warrantyPeriod = record.warrantyPeriod;
    setIsEdit(true);
    setFormData({
      licensePlate: record.licensePlate,
      replacementDate,
      warrantyPeriod,
      ngayHetHan: addMonths(replacementDate, warrantyPeriod),
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
      // Ensure ngayHetHan is always calculated if missing
      let ngayHetHan = formData.ngayHetHan;
      if (!ngayHetHan) {
        ngayHetHan = addMonths(formData.replacementDate, formData.warrantyPeriod);
      }
      const data = {
        ...formData,
        replacementDate: formData.replacementDate.toISOString().split('T')[0],
        ngayHetHan: ngayHetHan ? ngayHetHan.toISOString().split('T')[0] : null,
        warrantyPeriod: Number(formData.warrantyPeriod),
        quantity: Number(formData.quantity),
        unitPrice: Number(formData.unitPrice),
        total: Number(formData.quantity) * Number(formData.unitPrice),
      };

      if (isEdit) {
        await lopXeApi.update(formData.id, data);
        showSnackbar('Sửa thông tin bảo dưỡng thành công');
      } else {
        await lopXeApi.create(data);
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
      await lopXeApi.delete(deleteDialog.recordId);
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
      key: 'ngayHetHan',
      label: 'Ngày hết hạn',
      render: (value, record) => {
        let date = value;
        if (!date && record.replacementDate && record.warrantyPeriod) {
          date = addMonths(record.replacementDate, record.warrantyPeriod);
        }
        return date ? new Date(date).toLocaleDateString('vi-VN') : '-';
      },
      sortable: false,
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
    const replacementDate = new Date();
    const warrantyPeriod = 6;
    setFormData({
      licensePlate: '',
      replacementDate,
      warrantyPeriod,
      ngayHetHan: addMonths(replacementDate, warrantyPeriod),
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

      {/* Add/Edit Dialog */}
      <MaintenanceDialog
        open={openDialog}
        isEdit={isEdit}
        isLoading={isLoading}
        formData={formData}
        errors={errors}
        onClose={() => setOpenDialog(false)}
        onChange={handleInputChange}
        onSave={handleSave}
      />

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
