import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SwipeTabs } from '@/components';
import { alpha } from '@mui/material/styles';
import {
  Box,
  useTheme,
  useMediaQuery,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Grid,
  TextField,
} from '@mui/material';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import CloseIcon from '@mui/icons-material/Close';
// Import custom hooks for data management
import { useDauKeo, useRoMooc, useContainer } from './hooks';
// Import specific component files from centralized index
import {
  DauKeoCard,
  DauKeoDialog,
  DauKeoDeleteDialog,
  RoMoocCard,
  RoMoocDialog,
  RoMoocDeleteDialog,
  ContainerCard,
  ContainerDialog,
  ContainerDeleteDialog,
} from './components';
// Define valid tabs and their labels
const TABS = [
  { value: 'dau-keo', label: 'Đầu Kéo' },
  { value: 'ro-mooc', label: 'Rơ-Mooc' },
  { value: 'container', label: 'Container' },
];
// Individual tab content components
const DauKeoContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const dauKeoHook = useDauKeo();
  const [dialog, setDialog] = useState({ open: false, edit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, data: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  useEffect(() => {
    dauKeoHook.fetchAll();
  }, []);
  const columns = [
    { key: 'bien_so', label: 'BIỂN SỐ', render: v => v },
    { key: 'mo_ta', label: 'MÔ TẢ', render: v => v || '' },
  ];
  const handleSave = async formData => {
    try {
      if (dialog.edit) {
        await dauKeoHook.update(dialog.data.id, formData);
        setSnackbar({ open: true, message: 'Cập nhật đầu kéo thành công!', severity: 'success' });
      } else {
        await dauKeoHook.create(formData);
        setSnackbar({ open: true, message: 'Thêm đầu kéo thành công!', severity: 'success' });
      }
      setDialog({ open: false, edit: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: dauKeoHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };
  const handleDelete = async () => {
    try {
      await dauKeoHook.remove(deleteDialog.data.id);
      setSnackbar({ open: true, message: 'Xóa đầu kéo thành công!', severity: 'success' });
      setDeleteDialog({ open: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: dauKeoHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };
  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, sm: 11 } }}>
      {dauKeoHook.loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress size={24} />
        </Box>
      ) : dauKeoHook.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {dauKeoHook.error}
        </Alert>
      ) : isMobile ? (
        dauKeoHook.data.length === 0 ? (
          <Alert severity="info">Chưa có dữ liệu đầu kéo</Alert>
        ) : (
          dauKeoHook.data.map(item => (
            <DauKeoCard
              key={item.id}
              data={item}
              onEdit={data => setDialog({ open: true, edit: true, data })}
              onDelete={data => setDeleteDialog({ open: true, data })}
              isLoading={dauKeoHook.loading}
            />
          ))
        )
      ) : (
        <StandardTable
          columns={columns}
          data={dauKeoHook.data}
          emptyMessage="Chưa có dữ liệu đầu kéo"
          renderActions={row => (
            <>
              <EditButton onClick={() => setDialog({ open: true, edit: true, data: row })} />
              <DeleteButton onClick={() => setDeleteDialog({ open: true, data: row })} />
            </>
          )}
        />
      )}
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
      <DauKeoDialog
        open={dialog.open}
        edit={dialog.edit}
        data={dialog.data}
        onSave={handleSave}
        onClose={() => setDialog({ open: false, edit: false, data: null })}
      />
      <AddButton
        onClick={() => setDialog({ open: true, edit: false, data: null })}
        iconOnly={true}
        size="large" // For 24px icon in 56x56 FAB
        aria-label="Thêm đầu kéo"
        sx={{
          position: 'fixed',
          bottom: { xs: theme.spacing(3), sm: theme.spacing(4) }, // Match /doi-tac (24px, 32px)
          right: { xs: theme.spacing(3), sm: theme.spacing(4) }, // Match /doi-tac (24px, 32px)
          borderRadius: '50%',
          zIndex: theme.zIndex.speedDial || 1050,
          width: 56, // Match /doi-tac FAB size
          height: 56, // Match /doi-tac FAB size
          minWidth: 56, // Ensure minWidth is also set for iconOnly button
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)', // Match /doi-tac FAB shadow
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)', // Match /doi-tac FAB hover shadow
          },
          transition: 'all 0.2s ease-in-out', // Match /doi-tac FAB transition
        }}
      />
      <DauKeoDeleteDialog
        open={deleteDialog.open}
        data={deleteDialog.data}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false, data: null })}
      />
    </Box>
  );
};
const RoMoocContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const roMoocHook = useRoMooc();
  const [dialog, setDialog] = useState({ open: false, edit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, data: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  useEffect(() => {
    roMoocHook.fetchAll();
  }, []);
  const columns = [
    { key: 'bien_so', label: 'BIỂN SỐ', render: v => v },
    { key: 'mo_ta', label: 'MÔ TẢ', render: v => v || '' },
  ];
  const handleSave = async formData => {
    try {
      if (dialog.edit) {
        await roMoocHook.update(dialog.data.id, formData);
        setSnackbar({ open: true, message: 'Cập nhật rơ-mooc thành công!', severity: 'success' });
      } else {
        await roMoocHook.create(formData);
        setSnackbar({ open: true, message: 'Thêm rơ-mooc thành công!', severity: 'success' });
      }
      setDialog({ open: false, edit: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: roMoocHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };
  const handleDelete = async () => {
    try {
      await roMoocHook.remove(deleteDialog.data.id);
      setSnackbar({ open: true, message: 'Xóa rơ-mooc thành công!', severity: 'success' });
      setDeleteDialog({ open: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: roMoocHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };
  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, sm: 11 } }}>
      {/* Old AddButton block removed, FAB is already at the end of the component */}
      {roMoocHook.loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress size={24} />
        </Box>
      ) : roMoocHook.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {roMoocHook.error}
        </Alert>
      ) : isMobile ? (
        roMoocHook.data.length === 0 ? (
          <Alert severity="info">Chưa có dữ liệu rơ-mooc</Alert>
        ) : (
          roMoocHook.data.map(item => (
            <RoMoocCard
              key={item.id}
              data={item}
              onEdit={data => setDialog({ open: true, edit: true, data })}
              onDelete={data => setDeleteDialog({ open: true, data })}
              isLoading={roMoocHook.loading}
            />
          ))
        )
      ) : (
        <StandardTable
          columns={columns}
          data={roMoocHook.data}
          emptyMessage="Chưa có dữ liệu rơ-mooc"
          renderActions={row => (
            <>
              <EditButton onClick={() => setDialog({ open: true, edit: true, data: row })} />
              <DeleteButton onClick={() => setDeleteDialog({ open: true, data: row })} />
            </>
          )}
        />
      )}
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
      <RoMoocDialog
        open={dialog.open}
        edit={dialog.edit}
        data={dialog.data}
        onSave={handleSave}
        onClose={() => setDialog({ open: false, edit: false, data: null })}
      />
      <RoMoocDeleteDialog
        open={deleteDialog.open}
        data={deleteDialog.data}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false, data: null })}
      />
      <AddButton
        onClick={() => setDialog({ open: true, edit: false, data: null })}
        iconOnly={true}
        size="large"
        aria-label="Thêm rơ mooc"
        sx={{
          position: 'fixed',
          bottom: { xs: theme.spacing(3), sm: theme.spacing(4) },
          right: { xs: theme.spacing(3), sm: theme.spacing(4) },
          borderRadius: '50%',
          zIndex: theme.zIndex.speedDial || 1050,
          width: 56,
          height: 56,
          minWidth: 56,
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </Box>
  );
};
const ContainerContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerHook = useContainer();
  const [dialog, setDialog] = useState({ open: false, edit: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, data: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  useEffect(() => {
    containerHook.fetchAll();
  }, []);
  const columns = [{ key: 'phan_loai', label: 'LOẠI CONTAINER', render: v => v || '' }];
  const handleSave = async formData => {
    try {
      if (dialog.edit) {
        await containerHook.update(dialog.data.id, formData);
        setSnackbar({ open: true, message: 'Cập nhật container thành công!', severity: 'success' });
      } else {
        await containerHook.create(formData);
        setSnackbar({ open: true, message: 'Thêm container thành công!', severity: 'success' });
      }
      setDialog({ open: false, edit: false, data: null });
    } catch (error) {
      setSnackbar({
        open: true,
        message: containerHook.error || 'Có lỗi xảy ra',
        severity: 'error',
      });
    }
  };
  const handleDelete = async () => {
    try {
      await containerHook.remove(deleteDialog.data.id);
      setSnackbar({ open: true, message: 'Xóa container thành công!', severity: 'success' });
      setDeleteDialog({ open: false, data: null });
    } catch (error) {
      setSnackbar({
        open: true,
        message: containerHook.error || 'Có lỗi xảy ra',
        severity: 'error',
      });
    }
  };
  return (
    <Box sx={{ position: 'relative', pb: { xs: 10, sm: 11 } }}>
      {/* Old AddButton block removed, FAB is already at the end of the component */}
      {containerHook.loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress size={24} />
        </Box>
      ) : containerHook.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {containerHook.error}
        </Alert>
      ) : isMobile ? (
        containerHook.data.length === 0 ? (
          <Alert severity="info">Chưa có dữ liệu container</Alert>
        ) : (
          containerHook.data.map(item => (
            <ContainerCard
              key={item.id}
              data={item}
              onEdit={data => setDialog({ open: true, edit: true, data })}
              onDelete={data => setDeleteDialog({ open: true, data })}
              isLoading={containerHook.loading}
            />
          ))
        )
      ) : (
        <StandardTable
          columns={columns}
          data={containerHook.data}
          emptyMessage="Chưa có dữ liệu container"
          renderActions={row => (
            <>
              <EditButton onClick={() => setDialog({ open: true, edit: true, data: row })} />
              <DeleteButton onClick={() => setDeleteDialog({ open: true, data: row })} />
            </>
          )}
        />
      )}
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
      <ContainerDialog
        open={dialog.open}
        edit={dialog.edit}
        data={dialog.data}
        onSave={handleSave}
        onClose={() => setDialog({ open: false, edit: false, data: null })}
      />
      <ContainerDeleteDialog
        open={deleteDialog.open}
        data={deleteDialog.data}
        onConfirm={handleDelete}
        onClose={() => setDeleteDialog({ open: false, data: null })}
      />
      <AddButton
        onClick={() => setDialog({ open: true, edit: false, data: null })}
        iconOnly={true}
        size="large"
        aria-label="Thêm container"
        sx={{
          position: 'fixed',
          bottom: { xs: theme.spacing(3), sm: theme.spacing(4) },
          right: { xs: theme.spacing(3), sm: theme.spacing(4) },
          borderRadius: '50%',
          zIndex: theme.zIndex.speedDial || 1050,
          width: 56,
          height: 56,
          minWidth: 56,
          boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
          '&:hover': {
            transform: 'scale(1.05)',
            boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      />
    </Box>
  );
};
const QuanLyPhuongTien = () => {
  const { tab: tabFromUrl = 'dau-keo' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // Set the active tab based on URL parameter
  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : 'dau-keo';
  // Redirect to the first tab if the current tab is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/phuong-tien/dau-keo`, { replace: true });
    }
  }, [tabFromUrl, navigate]);
  const handleTabChange = useCallback(
    newValue => {
      navigate(`/phuong-tien/${newValue}`);
    },
    [navigate]
  );
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dau-keo':
        return <DauKeoContent />;
      case 'ro-mooc':
        return <RoMoocContent />;
      case 'container':
        return <ContainerContent />;
      default:
        return <DauKeoContent />;
    }
  };
  return (
    <div className="w-full">
      <SwipeTabs
        tabs={TABS}
        activeTab={activeTab}
        basePath="/phuong-tien"
        onTabChange={handleTabChange}
        stickyTabs={true}
      >
        <div className="p-4">{renderTabContent()}</div>
      </SwipeTabs>
    </div>
  );
};
export default QuanLyPhuongTien;
