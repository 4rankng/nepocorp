import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SwipeTabs } from '@/components';
import { alpha } from '@mui/material/styles';
import { Box, useTheme, useMediaQuery, Snackbar, Alert, Typography, Divider } from '@mui/material';
import { useNavigate, useParams, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { AddButton } from '@/components/ActionButtons';
// Import custom hooks for data management
import { useDauKeo, useRoMooc, useContainer } from './hooks';
// Import specific component files from centralized index
import {
  DauKeoDialog,
  DauKeoListResponsive,
  RoMoocDialog,
  RoMoocListResponsive,
  ContainerDialog,
  ContainerListResponsive,
} from './components';
import DeleteDialog from '@/components/DeleteDialog';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RvHookupIcon from '@mui/icons-material/RvHookup';
import InventoryIcon from '@mui/icons-material/Inventory2';
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
      <DauKeoListResponsive
        data={dauKeoHook.data}
        loading={dauKeoHook.loading}
        error={dauKeoHook.error}
        onEdit={data => setDialog({ open: true, edit: true, data })}
        onDelete={data => setDeleteDialog({ open: true, data })}
        emptyMessage="Chưa có dữ liệu đầu kéo"
      />
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
      <DeleteDialog
        open={deleteDialog.open}
        title="Xóa đầu kéo"
        message="Bạn có chắc chắn muốn xóa đầu kéo sau đây? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, data: null })}
        confirmText="Xóa"
        confirmColor="error"
        icon={LocalShippingIcon}
        type="delete"
        content={data => (
          <>
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              Thông tin đầu kéo:
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                Biển số:
              </Typography>
              <Typography variant="body2">{data?.bien_so || '-'}</Typography>
              <Typography variant="body2" fontWeight={500}>
                Mô tả:
              </Typography>
              <Typography variant="body2">{data?.mo_ta || '-'}</Typography>
            </Box>
          </>
        )}
        data={deleteDialog.data}
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
      <RoMoocListResponsive
        data={roMoocHook.data}
        loading={roMoocHook.loading}
        error={roMoocHook.error}
        onEdit={data => setDialog({ open: true, edit: true, data })}
        onDelete={data => setDeleteDialog({ open: true, data })}
        emptyMessage="Chưa có dữ liệu rơ-mooc"
      />
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
      <DeleteDialog
        open={deleteDialog.open}
        title="Xóa rơ-mooc"
        message="Bạn có chắc chắn muốn xóa rơ-mooc sau đây? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, data: null })}
        confirmText="Xóa"
        confirmColor="error"
        icon={RvHookupIcon}
        type="delete"
        content={data => (
          <>
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              Thông tin rơ-mooc:
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                Biển số:
              </Typography>
              <Typography variant="body2">{data?.bien_so || '-'}</Typography>
              <Typography variant="body2" fontWeight={500}>
                Mô tả:
              </Typography>
              <Typography variant="body2">{data?.mo_ta || '-'}</Typography>
            </Box>
          </>
        )}
        data={deleteDialog.data}
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
      <ContainerListResponsive
        data={containerHook.data}
        loading={containerHook.loading}
        error={containerHook.error}
        onEdit={data => setDialog({ open: true, edit: true, data })}
        onDelete={data => setDeleteDialog({ open: true, data })}
        emptyMessage="Chưa có dữ liệu container"
      />
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
      <DeleteDialog
        open={deleteDialog.open}
        title="Xóa container"
        message="Bạn có chắc chắn muốn xóa container sau đây? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ open: false, data: null })}
        confirmText="Xóa"
        confirmColor="error"
        icon={InventoryIcon}
        type="delete"
        content={data => (
          <>
            <Typography variant="subtitle2" color="error.main" gutterBottom>
              Thông tin container:
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 1 }}>
              <Typography variant="body2" fontWeight={500}>
                Phân loại:
              </Typography>
              <Typography variant="body2">{data?.phan_loai || '-'}</Typography>
              <Typography variant="body2" fontWeight={500}>
                Kích thước:
              </Typography>
              <Typography variant="body2">{data?.kich_thuoc || '-'}</Typography>
              <Typography variant="body2" fontWeight={500}>
                Trọng tải:
              </Typography>
              <Typography variant="body2">{data?.trong_tai || '-'}</Typography>
            </Box>
          </>
        )}
        data={deleteDialog.data}
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
