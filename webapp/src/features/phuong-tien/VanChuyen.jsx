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

import React, { useState, useEffect, useMemo } from 'react';
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
  const [expanded, setExpanded] = useState({ tractors: true, trailers: false, containers: false });

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

  // Fetch data
  useEffect(() => {
    setTractorLoading(true);
    tractorApi
      .getAll()
      .then(data => setTractors(data))
      .catch(() => setTractorError('Không thể tải danh sách đầu kéo'))
      .finally(() => setTractorLoading(false));

    setTrailerLoading(true);
    trailerApi
      .getAll()
      .then(data => setTrailers(data))
      .catch(() => setTrailerError('Không thể tải danh sách rơ-mooc'))
      .finally(() => setTrailerLoading(false));

    setContainerTypeLoading(true);
    containerTypeApi
      .getAll()
      .then(data => setContainerTypes(data))
      .catch(() => setContainerTypeError('Không thể tải danh sách loại container'))
      .finally(() => setContainerTypeLoading(false));
  }, []);

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
    { key: 'id', label: 'SỐ CONTAINER', render: v => v },
    { key: 'phan_loai', label: 'LOẠI CONTAINER', render: v => v || '' },
  ];

  // Render mobile card for each section
  const renderTractorCard = tractor => (
    <Card
      key={tractor.id}
      sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600}>{tractor.bien_so}</Typography>
          <Box display="flex" gap={1}>
            <EditButton
              size="small"
              onClick={() => setTractorDialog({ open: true, edit: true, data: tractor })}
            />
            <DeleteButton
              size="small"
              onClick={() => setTractorDelete({ open: true, data: tractor })}
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {tractor.mo_ta}
        </Typography>
      </CardContent>
    </Card>
  );
  const renderTrailerCard = trailer => (
    <Card
      key={trailer.id}
      sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600}>{trailer.bien_so}</Typography>
          <Box display="flex" gap={1}>
            <EditButton
              size="small"
              onClick={() => setTrailerDialog({ open: true, edit: true, data: trailer })}
            />
            <DeleteButton
              size="small"
              onClick={() => setTrailerDelete({ open: true, data: trailer })}
            />
          </Box>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {trailer.mo_ta}
        </Typography>
      </CardContent>
    </Card>
  );
  const renderContainerTypeCard = container => (
    <Card
      key={container.id}
      sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600}>{container.phan_loai}</Typography>
          <Box display="flex" gap={1}>
            <EditButton
              size="small"
              onClick={() => setContainerTypeDialog({ open: true, edit: true, data: container })}
            />
            <DeleteButton
              size="small"
              onClick={() => setContainerTypeDelete({ open: true, data: container })}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

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
    } catch (error) {
      setSnackbar({ open: true, message: `Lỗi: ${error.message}`, severity: 'error' });
    }
  };

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Section
        title="Đầu Kéo"
        count={tractors.length}
        expanded={expanded.tractors}
        onToggle={() => setExpanded(prev => ({ ...prev, tractors: !prev.tractors }))}
        onAdd={() => setTractorDialog({ open: true, edit: false, data: null })}
      >
        {tractorLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={24} />
          </Box>
        ) : tractorError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {tractorError}
          </Alert>
        ) : isMobile ? (
          tractors.length === 0 ? (
            <Alert severity="info">Chưa có dữ liệu đầu kéo</Alert>
          ) : (
            tractors.map(renderTractorCard)
          )
        ) : (
          <StandardTable
            columns={tractorColumns}
            data={tractors}
            emptyMessage="Chưa có dữ liệu đầu kéo"
            renderActions={row => (
              <>
                <EditButton
                  onClick={() => setTractorDialog({ open: true, edit: true, data: row })}
                />
                <DeleteButton onClick={() => setTractorDelete({ open: true, data: row })} />
              </>
            )}
          />
        )}
      </Section>
      <Section
        title="Rơ-Mooc"
        count={trailers.length}
        expanded={expanded.trailers}
        onToggle={() => setExpanded(prev => ({ ...prev, trailers: !prev.trailers }))}
        onAdd={() => setTrailerDialog({ open: true, edit: false, data: null })}
      >
        {trailerLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={24} />
          </Box>
        ) : trailerError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {trailerError}
          </Alert>
        ) : isMobile ? (
          trailers.length === 0 ? (
            <Alert severity="info">Chưa có dữ liệu rơ-mooc</Alert>
          ) : (
            trailers.map(renderTrailerCard)
          )
        ) : (
          <StandardTable
            columns={trailerColumns}
            data={trailers}
            emptyMessage="Chưa có dữ liệu rơ-mooc"
            renderActions={row => (
              <>
                <EditButton
                  onClick={() => setTrailerDialog({ open: true, edit: true, data: row })}
                />
                <DeleteButton onClick={() => setTrailerDelete({ open: true, data: row })} />
              </>
            )}
          />
        )}
      </Section>
      <Section
        title="Loại Container"
        count={containerTypes.length}
        expanded={expanded.containers}
        onToggle={() => setExpanded(prev => ({ ...prev, containers: !prev.containers }))}
        onAdd={() => setContainerTypeDialog({ open: true, edit: false, data: null })}
      >
        {containerTypeLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={24} />
          </Box>
        ) : containerTypeError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {containerTypeError}
          </Alert>
        ) : isMobile ? (
          containerTypes.length === 0 ? (
            <Alert severity="info">Chưa có dữ liệu loại container</Alert>
          ) : (
            containerTypes.map(renderContainerTypeCard)
          )
        ) : (
          <StandardTable
            columns={containerTypeColumns}
            data={containerTypes}
            emptyMessage="Chưa có dữ liệu loại container"
            renderActions={row => (
              <>
                <EditButton
                  onClick={() => setContainerTypeDialog({ open: true, edit: true, data: row })}
                />
                <DeleteButton onClick={() => setContainerTypeDelete({ open: true, data: row })} />
              </>
            )}
          />
        )}
      </Section>

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
            onChange: e => setTractorDialog(d => ({ ...d, data: { ...d.data, bien_so: e.target.value } })),
            autoFocus: true,
          },
          {
            label: 'Mô tả',
            name: 'mo_ta',
            value: tractorDialog.data?.mo_ta || '',
            onChange: e => setTractorDialog(d => ({ ...d, data: { ...d.data, mo_ta: e.target.value } })),
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
            onChange: e => setTrailerDialog(d => ({ ...d, data: { ...d.data, bien_so: e.target.value } })),
            autoFocus: true,
          },
          {
            label: 'Mô tả',
            name: 'mo_ta',
            value: trailerDialog.data?.mo_ta || '',
            onChange: e => setTrailerDialog(d => ({ ...d, data: { ...d.data, mo_ta: e.target.value } })),
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
            onChange: e => setContainerTypeDialog(d => ({ ...d, data: { ...d.data, phan_loai: e.target.value } })),
            autoFocus: true,
          },
        ]}
      />

      {/* Delete Confirmation Dialogs */}
      <Dialog
        open={tractorDelete.open}
        onClose={() => setTractorDelete({ open: false, data: null })}
        onKeyDown={(e) => e.key === 'Escape' && setTractorDelete({ open: false, data: null })}
        aria-labelledby="delete-tractor-dialog"
      >
        <DialogTitle id="delete-tractor-dialog">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa đầu kéo sau đây?
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Thông tin đầu kéo:</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2">Biển số:</Typography>
              <Typography variant="body2" fontWeight="medium">{tractorDelete.data?.bien_so || '-'}</Typography>
              <Typography variant="body2">Mô tả:</Typography>
              <Typography variant="body2" fontWeight="medium">{tractorDelete.data?.mo_ta || 'Không có'}</Typography>
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
        onKeyDown={(e) => e.key === 'Escape' && setTrailerDelete({ open: false, data: null })}
        aria-labelledby="delete-trailer-dialog"
      >
        <DialogTitle id="delete-trailer-dialog">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa rơ-mooc sau đây?
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>Thông tin rơ-mooc:</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2">Biển số:</Typography>
              <Typography variant="body2" fontWeight="medium">{trailerDelete.data?.bien_so || '-'}</Typography>
              <Typography variant="body2">Mô tả:</Typography>
              <Typography variant="body2" fontWeight="medium">{trailerDelete.data?.mo_ta || 'Không có'}</Typography>
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
        onKeyDown={(e) => e.key === 'Escape' && setContainerTypeDelete({ open: false, data: null })}
        aria-labelledby="delete-container-dialog"
      >
        <DialogTitle id="delete-container-dialog">Xác nhận xóa</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Bạn có chắc chắn muốn xóa container {containerTypeDelete.data?.phan_loai || 'này'}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContainerTypeDelete({ open: false, data: null })} color="primary">
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
