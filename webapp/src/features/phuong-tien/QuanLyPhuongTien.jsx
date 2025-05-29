import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import SwipeDetector from '../../components/SwipeDetector';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Tab,
  Tabs,
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
import { TabContext, TabPanel } from '@mui/lab';
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
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Danh sách Đầu Kéo
        </Typography>
        <AddButton onClick={() => setDialog({ open: true, edit: false, data: null })} />
      </Box>

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
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Danh sách Rơ-Mooc
        </Typography>
        <AddButton onClick={() => setDialog({ open: true, edit: false, data: null })} />
      </Box>

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

  const columns = [
    { key: 'phan_loai', label: 'LOẠI CONTAINER', render: v => v || '' },
  ];

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
      setSnackbar({ open: true, message: containerHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await containerHook.remove(deleteDialog.data.id);
      setSnackbar({ open: true, message: 'Xóa container thành công!', severity: 'success' });
      setDeleteDialog({ open: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: containerHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Danh sách Container
        </Typography>
        <AddButton onClick={() => setDialog({ open: true, edit: false, data: null })} />
      </Box>

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
    </Box>
  );
};

const QuanLyPhuongTien = () => {
  const { tab: tabFromUrl = 'dau-keo' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const tabsRef = useRef(null);

  // Set the active tab based on URL parameter
  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : 'dau-keo';
  const currentTabIndex = TABS.findIndex(tab => tab.value === activeTab);

  // Redirect to the first tab if the current tab is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/phuong-tien/dau-keo`, { replace: true });
    }
  }, [tabFromUrl, navigate]);
  // Center the active tab when it changes
  useEffect(() => {
    if (tabsRef.current && currentTabIndex !== -1) {
      const tabElement = tabsRef.current.querySelector(`[data-value="${activeTab}"]`);
      if (tabElement) {
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeTab, currentTabIndex]);
  const handleTabChange = (event, newValue) => {
    navigate(`/phuong-tien/${newValue}`);
  };
  // Handle swipe gestures - navigate to next/previous tab
  const handleSwipeLeft = useCallback(() => {
    // Swipe left = go to next tab (if not on last tab)
    if (currentTabIndex < TABS.length - 1) {
      const nextTab = TABS[currentTabIndex + 1].value;
      navigate(`/phuong-tien/${nextTab}`);
    }
  }, [currentTabIndex, navigate]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = go to previous tab (if not on first tab)
    if (currentTabIndex > 0) {
      const prevTab = TABS[currentTabIndex - 1].value;
      navigate(`/phuong-tien/${prevTab}`);
    }
  }, [currentTabIndex, navigate]);
  return (
    <SwipeDetector onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <TabContext value={activeTab}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                ref={tabsRef}
                value={activeTab}
                onChange={handleTabChange}
                scrollButtons="auto"
                aria-label="Quản lý phương tiện tabs"
                sx={{
                  '& .MuiTabs-scrollButtons': {
                    opacity: 1,
                    '&.Mui-disabled': { opacity: 0.3 },
                  },
                  '& .MuiTabs-indicator': {
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                  },
                  '& .MuiTabs-flexContainer': {
                    justifyContent: 'flex-start',
                  },
                }}
                TabIndicatorProps={{
                  children: <span className="MuiTabs-indicatorSpan" />,
                }}
              >
                {TABS.map(tab => (
                  <Tab
                    key={tab.value}
                    label={tab.label}
                    value={tab.value}
                    disableRipple
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'color 0.3s ease-in-out',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 600,
                      },
                    }}
                  />
                ))}
              </Tabs>
            </Box>
            {/* Tab content with swipe support */}
            <Box
              sx={{
                position: 'relative',
                minHeight: '60vh',
                overflow: 'hidden',
              }}
            >
              <TabPanel value="dau-keo" sx={{ p: 0, mt: 2 }}>
                <DauKeoContent />
              </TabPanel>
              <TabPanel value="ro-mooc" sx={{ p: 0, mt: 2 }}>
                <RoMoocContent />
              </TabPanel>
              <TabPanel value="container" sx={{ p: 0, mt: 2 }}>
                <ContainerContent />
              </TabPanel>
            </Box>
          </TabContext>
        </Box>
    </SwipeDetector>
  );
};
export default QuanLyPhuongTien;
