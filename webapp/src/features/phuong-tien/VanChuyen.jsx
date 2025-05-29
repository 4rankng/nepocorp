/**
 * PhuongTien Component - Vehicle Management
 *
 * This component has been integrated with the new mock API paradigm.
 *
 * Integration changes:
 * - Replaced inline mock APIs with calls to @services/mockApi
 * - Updated field mappings to match mock data structure:
 *   - DauKeo (Tractors): bien_so, mo_ta
 *   - RoMooc (Trailers): bien_so, mo_ta
 *   - Container: id (container number), phan_loai (type)
 * - Added CRUD handlers for all three entity types
 * - Updated mobile card renders and table columns
 *
 * TODO: Implement form dialogs for CRUD operations following DinhMuc pattern
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Collapse,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Grid,
  TextField,
} from '@mui/material';
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
// Import new mock API paradigm
import {
  fetchAllDauKeo,
  addDauKeo,
  editDauKeo,
  removeDauKeo,
  fetchAllRoMooc,
  addRoMooc,
  editRoMooc,
  removeRoMooc,
  fetchAllContainer,
  addContainer,
  editContainer,
  removeContainer,
} from '@services/mockApi';
import VehicleDialog from './components/VehicleDialog';
import TractorDeleteDialog from './components/TractorDeleteDialog';
import TrailerDeleteDialog from './components/TrailerDeleteDialog';
import ContainerDeleteDialog from './components/ContainerDeleteDialog';
import VehicleCard from './components/VehicleCard';
// API services using new mock API paradigm
const tractorApi = {
  getAll: fetchAllDauKeo,
  create: addDauKeo,
  update: editDauKeo,
  delete: removeDauKeo,
};
const trailerApi = {
  getAll: fetchAllRoMooc,
  create: addRoMooc,
  update: editRoMooc,
  delete: removeRoMooc,
};
const containerTypeApi = {
  getAll: fetchAllContainer,
  create: addContainer,
  update: editContainer,
  delete: removeContainer,
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
const VanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Collapsible state
  const [expanded, setExpanded] = useState({ tractors: false, trailers: false, containers: false });
  const [loadedSections, setLoadedSections] = useState({
    tractors: false,
    trailers: false,
    containers: false,
  });
  // Tractors
  const [tractors, setTractors] = useState([]);
  const [tractorLoading, setTractorLoading] = useState(false);
  const [tractorError, setTractorError] = useState('');
  const [tractorDialog, setTractorDialog] = useState({ open: false, edit: false, data: null });
  const [tractorDelete, setTractorDelete] = useState({ open: false, data: null });
  // Trailers
  const [trailers, setTrailers] = useState([]);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState('');
  const [trailerDialog, setTrailerDialog] = useState({ open: false, edit: false, data: null });
  const [trailerDelete, setTrailerDelete] = useState({ open: false, data: null });
  // Container Types
  const [containerTypes, setContainerTypes] = useState([]);
  const [containerTypeLoading, setContainerTypeLoading] = useState(false);
  const [containerTypeError, setContainerTypeError] = useState('');
  const [containerTypeDialog, setContainerTypeDialog] = useState({
    open: false,
    edit: false,
    data: null,
  });
  const [containerTypeDelete, setContainerTypeDelete] = useState({ open: false, data: null });
  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  // Counts
  const [counts, setCounts] = useState({ tractors: 0, trailers: 0, containers: 0 });
  // Fetch counts for all sections on mount
  useEffect(() => {
    tractorApi.getAll().then(data => setCounts(c => ({ ...c, tractors: data.length })));
    trailerApi.getAll().then(data => setCounts(c => ({ ...c, trailers: data.length })));
    containerTypeApi.getAll().then(data => setCounts(c => ({ ...c, containers: data.length })));
  }, []);
  // Helper to refetch count for a section
  const refetchCount = useCallback(key => {
    if (key === 'tractors') {
      tractorApi.getAll().then(data => setCounts(c => ({ ...c, tractors: data.length })));
    }
    if (key === 'trailers') {
      trailerApi.getAll().then(data => setCounts(c => ({ ...c, trailers: data.length })));
    }
    if (key === 'containers') {
      containerTypeApi.getAll().then(data => setCounts(c => ({ ...c, containers: data.length })));
    }
  }, []);
  // Lazy loading: fetch only when section is expanded for the first time
  const handleToggleSection = (key, fetchFn) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    if (!loadedSections[key] && !expanded[key]) {
      fetchFn();
      setLoadedSections(prev => ({ ...prev, [key]: true }));
    }
  };
  // Columns - updated to match mock data structure
  const tractorColumns = [
    { key: 'bien_so', label: 'BIỂN SỐ', render: v => v },
    { key: 'mo_ta', label: 'MÔ TẢ', render: v => v || '' },
  ];
  const trailerColumns = [
    { key: 'bien_so', label: 'BIỂN SỐ', render: v => v },
    { key: 'mo_ta', label: 'MÔ TẢ', render: v => v || '' },
  ];
  const containerTypeColumns = [
    { key: 'phan_loai', label: 'LOẠI CONTAINER', render: v => v || '' },
  ];
  // CRUD handlers for tractors
  const handleTractorSave = async formData => {
    try {
      if (tractorDialog.edit) {
        await tractorApi.update(tractorDialog.data.id, formData);
        setTractors(prev =>
          prev.map(item => (item.id === tractorDialog.data.id ? { ...item, ...formData } : item))
        );
        setSnackbar({ open: true, message: 'Cập nhật đầu kéo thành công!', severity: 'success' });
      } else {
        const newTractor = await tractorApi.create(formData);
        setTractors(prev => [...prev, newTractor]);
        setSnackbar({ open: true, message: 'Thêm đầu kéo thành công!', severity: 'success' });
      }
      setTractorDialog({ open: false, edit: false, data: null });
      refetchCount('tractors');
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };
  const handleTractorDelete = async () => {
    try {
      await tractorApi.delete(tractorDelete.data.id);
      setTractors(prev => prev.filter(item => item.id !== tractorDelete.data.id));
      setSnackbar({ open: true, message: 'Xóa đầu kéo thành công!', severity: 'success' });
      setTractorDelete({ open: false, data: null });
      refetchCount('tractors');
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };
  // CRUD handlers for trailers
  const handleTrailerSave = async formData => {
    try {
      if (trailerDialog.edit) {
        await trailerApi.update(trailerDialog.data.id, formData);
        setTrailers(prev =>
          prev.map(item => (item.id === trailerDialog.data.id ? { ...item, ...formData } : item))
        );
        setSnackbar({ open: true, message: 'Cập nhật rơ-mooc thành công!', severity: 'success' });
      } else {
        const newTrailer = await trailerApi.create(formData);
        setTrailers(prev => [...prev, newTrailer]);
        setSnackbar({ open: true, message: 'Thêm rơ-mooc thành công!', severity: 'success' });
      }
      setTrailerDialog({ open: false, edit: false, data: null });
      refetchCount('trailers');
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };
  const handleTrailerDelete = async () => {
    try {
      await trailerApi.delete(trailerDelete.data.id);
      setTrailers(prev => prev.filter(item => item.id !== trailerDelete.data.id));
      setSnackbar({ open: true, message: 'Xóa rơ-mooc thành công!', severity: 'success' });
      setTrailerDelete({ open: false, data: null });
      refetchCount('trailers');
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };
  // CRUD handlers for container types
  const handleContainerTypeSave = async formData => {
    try {
      if (containerTypeDialog.edit) {
        await containerTypeApi.update(containerTypeDialog.data.id, formData);
        setContainerTypes(prev =>
          prev.map(item =>
            item.id === containerTypeDialog.data.id ? { ...item, ...formData } : item
          )
        );
        setSnackbar({ open: true, message: 'Cập nhật container thành công!', severity: 'success' });
      } else {
        const newContainer = await containerTypeApi.create(formData);
        setContainerTypes(prev => [...prev, newContainer]);
        setSnackbar({ open: true, message: 'Thêm container thành công!', severity: 'success' });
      }
      setContainerTypeDialog({ open: false, edit: false, data: null });
      refetchCount('containers');
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };
  const handleContainerTypeDelete = async () => {
    try {
      await containerTypeApi.delete(containerTypeDelete.data.id);
      setContainerTypes(prev => prev.filter(item => item.id !== containerTypeDelete.data.id));
      setSnackbar({ open: true, message: 'Xóa container thành công!', severity: 'success' });
      setContainerTypeDelete({ open: false, data: null });
      refetchCount('containers');
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };
  // Refactor vehicleConfigs to include fetchFn for each section
  const vehicleConfigs = [
    {
      key: 'tractors',
      title: 'Đầu Kéo',
      type: 'tractor',
      data: tractors,
      loading: tractorLoading,
      error: tractorError,
      dialog: tractorDialog,
      setDialog: setTractorDialog,
      deleteDialog: tractorDelete,
      setDeleteDialog: setTractorDelete,
      onSave: handleTractorSave,
      onDelete: handleTractorDelete,
      columns: tractorColumns,
      isMobile,
      fetchFn: () => {
        setTractorLoading(true);
        tractorApi
          .getAll()
          .then(data => {
            setTractors(data);
            setCounts(c => ({ ...c, tractors: data.length }));
          })
          .catch(() => setTractorError('Không thể tải danh sách đầu kéo'))
          .finally(() => setTractorLoading(false));
      },
    },
    {
      key: 'trailers',
      title: 'Rơ-Mooc',
      type: 'trailer',
      data: trailers,
      loading: trailerLoading,
      error: trailerError,
      dialog: trailerDialog,
      setDialog: setTrailerDialog,
      deleteDialog: trailerDelete,
      setDeleteDialog: setTrailerDelete,
      onSave: handleTrailerSave,
      onDelete: handleTrailerDelete,
      columns: trailerColumns,
      isMobile,
      fetchFn: () => {
        setTrailerLoading(true);
        trailerApi
          .getAll()
          .then(data => {
            setTrailers(data);
            setCounts(c => ({ ...c, trailers: data.length }));
          })
          .catch(() => setTrailerError('Không thể tải danh sách rơ-mooc'))
          .finally(() => setTrailerLoading(false));
      },
    },
    {
      key: 'containers',
      title: 'Loại Container',
      type: 'container',
      data: containerTypes,
      loading: containerTypeLoading,
      error: containerTypeError,
      dialog: containerTypeDialog,
      setDialog: setContainerTypeDialog,
      deleteDialog: containerTypeDelete,
      setDeleteDialog: setContainerTypeDelete,
      onSave: handleContainerTypeSave,
      onDelete: handleContainerTypeDelete,
      columns: containerTypeColumns,
      isMobile,
      fetchFn: () => {
        setContainerTypeLoading(true);
        containerTypeApi
          .getAll()
          .then(data => {
            setContainerTypes(data);
            setCounts(c => ({ ...c, containers: data.length }));
          })
          .catch(() => setContainerTypeError('Không thể tải danh sách loại container'))
          .finally(() => setContainerTypeLoading(false));
      },
    },
  ];
  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      {vehicleConfigs.map(cfg => (
        <Section
          key={cfg.key}
          title={cfg.title}
          count={counts[cfg.key]}
          expanded={expanded[cfg.key]}
          onToggle={() => handleToggleSection(cfg.key, cfg.fetchFn)}
          onAdd={() => cfg.setDialog({ open: true, edit: false, data: null })}
        >
          {cfg.loading && !loadedSections[cfg.key] ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress size={24} />
            </Box>
          ) : cfg.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {cfg.error}
            </Alert>
          ) : cfg.isMobile ? (
            cfg.data.length === 0 ? (
              <Alert severity="info">Chưa có dữ liệu {cfg.title.toLowerCase()}</Alert>
            ) : (
              cfg.data.map(item => (
                <VehicleCard
                  key={item.id}
                  data={item}
                  type={cfg.type}
                  onEdit={data => cfg.setDialog({ open: true, edit: true, data })}
                  onDelete={data => cfg.setDeleteDialog({ open: true, data })}
                  isLoading={cfg.loading}
                />
              ))
            )
          ) : (
            <StandardTable
              columns={cfg.columns}
              data={cfg.data}
              emptyMessage={`Chưa có dữ liệu ${cfg.title.toLowerCase()}`}
              renderActions={row => (
                <>
                  <EditButton
                    onClick={() => cfg.setDialog({ open: true, edit: true, data: row })}
                  />
                  <DeleteButton onClick={() => cfg.setDeleteDialog({ open: true, data: row })} />
                </>
              )}
            />
          )}
        </Section>
      ))}
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      {/* --- Tractor Dialog --- */}
      <VehicleDialog
        open={tractorDialog.open}
        title={tractorDialog.edit ? 'Chỉnh sửa đầu kéo' : 'Thêm đầu kéo'}
        isLoading={tractorLoading}
        onClose={() => setTractorDialog({ open: false, edit: false, data: null })}
        onSave={() => handleTractorSave(tractorDialog.data)}
        fields={[
          {
            label: 'Biển số',
            name: 'bien_so',
            value: tractorDialog.data?.bien_so || '',
            onChange: e =>
              setTractorDialog(d => ({ ...d, data: { ...d.data, bien_so: e.target.value } })),
            autoFocus: true,
          },
          {
            label: 'Mô tả',
            name: 'mo_ta',
            value: tractorDialog.data?.mo_ta || '',
            onChange: e =>
              setTractorDialog(d => ({ ...d, data: { ...d.data, mo_ta: e.target.value } })),
          },
        ]}
      />
      {/* --- Trailer Dialog --- */}
      <VehicleDialog
        open={trailerDialog.open}
        title={trailerDialog.edit ? 'Chỉnh sửa rơ-mooc' : 'Thêm rơ-mooc'}
        isLoading={trailerLoading}
        onClose={() => setTrailerDialog({ open: false, edit: false, data: null })}
        onSave={() => handleTrailerSave(trailerDialog.data)}
        fields={[
          {
            label: 'Biển số',
            name: 'bien_so',
            value: trailerDialog.data?.bien_so || '',
            onChange: e =>
              setTrailerDialog(d => ({ ...d, data: { ...d.data, bien_so: e.target.value } })),
            autoFocus: true,
          },
          {
            label: 'Mô tả',
            name: 'mo_ta',
            value: trailerDialog.data?.mo_ta || '',
            onChange: e =>
              setTrailerDialog(d => ({ ...d, data: { ...d.data, mo_ta: e.target.value } })),
          },
        ]}
      />
      {/* --- Container Dialog --- */}
      <VehicleDialog
        open={containerTypeDialog.open}
        title={containerTypeDialog.edit ? 'Chỉnh sửa loại container' : 'Thêm loại container'}
        isLoading={containerTypeLoading}
        onClose={() => setContainerTypeDialog({ open: false, edit: false, data: null })}
        onSave={() => handleContainerTypeSave(containerTypeDialog.data)}
        fields={[
          {
            label: 'Loại container',
            name: 'phan_loai',
            value: containerTypeDialog.data?.phan_loai || '',
            onChange: e =>
              setContainerTypeDialog(d => ({
                ...d,
                data: { ...d.data, phan_loai: e.target.value },
              })),
            autoFocus: true,
          },
        ]}
      />
      {/* Delete Confirmation Dialogs */}
      <Dialog
        open={tractorDelete.open}
        onClose={() => setTractorDelete({ open: false, data: null })}
        onKeyDown={e => e.key === 'Escape' && setTractorDelete({ open: false, data: null })}
        aria-labelledby="delete-tractor-dialog"
      >
        <DialogTitle id="delete-tractor-dialog">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>Bạn có chắc chắn muốn xóa đầu kéo sau đây?</DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thông tin đầu kéo:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2">Biển số:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {tractorDelete.data?.bien_so || '-'}
              </Typography>
              <Typography variant="body2">Mô tả:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {tractorDelete.data?.mo_ta || 'Không có'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTractorDelete({ open: false, data: null })} color="primary">
            Hủy
          </Button>
          <Button onClick={handleTractorDelete} color="error" variant="contained" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={trailerDelete.open}
        onClose={() => setTrailerDelete({ open: false, data: null })}
        onKeyDown={e => e.key === 'Escape' && setTrailerDelete({ open: false, data: null })}
        aria-labelledby="delete-trailer-dialog"
      >
        <DialogTitle id="delete-trailer-dialog">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>Bạn có chắc chắn muốn xóa rơ-mooc sau đây?</DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thông tin rơ-mooc:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2">Biển số:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {trailerDelete.data?.bien_so || '-'}
              </Typography>
              <Typography variant="body2">Mô tả:</Typography>
              <Typography variant="body2" fontWeight="medium">
                {trailerDelete.data?.mo_ta || 'Không có'}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrailerDelete({ open: false, data: null })} color="primary">
            Hủy
          </Button>
          <Button onClick={handleTrailerDelete} color="error" variant="contained" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={containerTypeDelete.open}
        onClose={() => setContainerTypeDelete({ open: false, data: null })}
        onKeyDown={e => e.key === 'Escape' && setContainerTypeDelete({ open: false, data: null })}
        aria-labelledby="delete-container-dialog"
      >
        <DialogTitle id="delete-container-dialog">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa container {containerTypeDelete.data?.phan_loai || 'này'}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setContainerTypeDelete({ open: false, data: null })}
            color="primary"
          >
            Hủy
          </Button>
          <Button onClick={handleContainerTypeDelete} color="error" variant="contained" autoFocus>
            Xóa
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default VanChuyen;
