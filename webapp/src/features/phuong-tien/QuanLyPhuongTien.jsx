import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Collapse,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
const TABS = [{ value: 'van-chuyen', label: 'Vận Chuyển' }];

// Section component for collapsible sections
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

// VanChuyen component integrated into the main component
const VanChuyenContent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Custom hooks for data management
  const dauKeoHook = useDauKeo();
  const roMoocHook = useRoMooc();
  const containerHook = useContainer();

  // Collapsible state
  const [expanded, setExpanded] = useState({ tractors: false, trailers: false, containers: false });
  const [loadedSections, setLoadedSections] = useState({
    tractors: false,
    trailers: false,
    containers: false,
  });

  // Dialog states for tractors
  const [tractorDialog, setTractorDialog] = useState({ open: false, edit: false, data: null });
  const [tractorDelete, setTractorDelete] = useState({ open: false, data: null });

  // Dialog states for trailers
  const [trailerDialog, setTrailerDialog] = useState({ open: false, edit: false, data: null });
  const [trailerDelete, setTrailerDelete] = useState({ open: false, data: null });

  // Dialog states for containers
  const [containerTypeDialog, setContainerTypeDialog] = useState({
    open: false,
    edit: false,
    data: null,
  });
  const [containerTypeDelete, setContainerTypeDelete] = useState({ open: false, data: null });

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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
        await dauKeoHook.update(tractorDialog.data.id, formData);
        setSnackbar({ open: true, message: 'Cập nhật đầu kéo thành công!', severity: 'success' });
      } else {
        await dauKeoHook.create(formData);
        setSnackbar({ open: true, message: 'Thêm đầu kéo thành công!', severity: 'success' });
      }
      setTractorDialog({ open: false, edit: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: dauKeoHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };

  const handleTractorDelete = async () => {
    try {
      await dauKeoHook.remove(tractorDelete.data.id);
      setSnackbar({ open: true, message: 'Xóa đầu kéo thành công!', severity: 'success' });
      setTractorDelete({ open: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: dauKeoHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };

  // CRUD handlers for trailers
  const handleTrailerSave = async formData => {
    try {
      if (trailerDialog.edit) {
        await roMoocHook.update(trailerDialog.data.id, formData);
        setSnackbar({ open: true, message: 'Cập nhật rơ-mooc thành công!', severity: 'success' });
      } else {
        await roMoocHook.create(formData);
        setSnackbar({ open: true, message: 'Thêm rơ-mooc thành công!', severity: 'success' });
      }
      setTrailerDialog({ open: false, edit: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: roMoocHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };

  const handleTrailerDelete = async () => {
    try {
      await roMoocHook.remove(trailerDelete.data.id);
      setSnackbar({ open: true, message: 'Xóa rơ-mooc thành công!', severity: 'success' });
      setTrailerDelete({ open: false, data: null });
    } catch (error) {
      setSnackbar({ open: true, message: roMoocHook.error || 'Có lỗi xảy ra', severity: 'error' });
    }
  };

  // CRUD handlers for container types
  const handleContainerTypeSave = async formData => {
    try {
      if (containerTypeDialog.edit) {
        await containerHook.update(containerTypeDialog.data.id, formData);
        setSnackbar({ open: true, message: 'Cập nhật container thành công!', severity: 'success' });
      } else {
        await containerHook.create(formData);
        setSnackbar({ open: true, message: 'Thêm container thành công!', severity: 'success' });
      }
      setContainerTypeDialog({ open: false, edit: false, data: null });
    } catch (error) {
      setSnackbar({
        open: true,
        message: containerHook.error || 'Có lỗi xảy ra',
        severity: 'error',
      });
    }
  };

  const handleContainerTypeDelete = async () => {
    try {
      await containerHook.remove(containerTypeDelete.data.id);
      setSnackbar({ open: true, message: 'Xóa container thành công!', severity: 'success' });
      setContainerTypeDelete({ open: false, data: null });
    } catch (error) {
      setSnackbar({
        open: true,
        message: containerHook.error || 'Có lỗi xảy ra',
        severity: 'error',
      });
    }
  };

  // Vehicle configurations for each section
  const vehicleConfigs = [
    {
      key: 'tractors',
      title: 'Đầu Kéo',
      type: 'tractor',
      data: dauKeoHook.data,
      loading: dauKeoHook.loading,
      error: dauKeoHook.error,
      dialog: tractorDialog,
      setDialog: setTractorDialog,
      deleteDialog: tractorDelete,
      setDeleteDialog: setTractorDelete,
      onSave: handleTractorSave,
      onDelete: handleTractorDelete,
      columns: tractorColumns,
      isMobile,
      fetchFn: dauKeoHook.fetchAll,
    },
    {
      key: 'trailers',
      title: 'Rơ-Mooc',
      type: 'trailer',
      data: roMoocHook.data,
      loading: roMoocHook.loading,
      error: roMoocHook.error,
      dialog: trailerDialog,
      setDialog: setTrailerDialog,
      deleteDialog: trailerDelete,
      setDeleteDialog: setTrailerDelete,
      onSave: handleTrailerSave,
      onDelete: handleTrailerDelete,
      columns: trailerColumns,
      isMobile,
      fetchFn: roMoocHook.fetchAll,
    },
    {
      key: 'containers',
      title: 'Loại Container',
      type: 'container',
      data: containerHook.data,
      loading: containerHook.loading,
      error: containerHook.error,
      dialog: containerTypeDialog,
      setDialog: setContainerTypeDialog,
      deleteDialog: containerTypeDelete,
      setDeleteDialog: setContainerTypeDelete,
      onSave: handleContainerTypeSave,
      onDelete: handleContainerTypeDelete,
      columns: containerTypeColumns,
      isMobile,
      fetchFn: containerHook.fetchAll,
    },
  ];

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      {vehicleConfigs.map(cfg => (
        <Section
          key={cfg.key}
          title={cfg.title}
          count={cfg.data.length}
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
              cfg.data.map(item => {
                // Use specific card components based on type
                if (cfg.type === 'tractor') {
                  return (
                    <DauKeoCard
                      key={item.id}
                      data={item}
                      onEdit={data => cfg.setDialog({ open: true, edit: true, data })}
                      onDelete={data => cfg.setDeleteDialog({ open: true, data })}
                      isLoading={cfg.loading}
                    />
                  );
                } else if (cfg.type === 'trailer') {
                  return (
                    <RoMoocCard
                      key={item.id}
                      data={item}
                      onEdit={data => cfg.setDialog({ open: true, edit: true, data })}
                      onDelete={data => cfg.setDeleteDialog({ open: true, data })}
                      isLoading={cfg.loading}
                    />
                  );
                } else if (cfg.type === 'container') {
                  return (
                    <ContainerCard
                      key={item.id}
                      data={item}
                      onEdit={data => cfg.setDialog({ open: true, edit: true, data })}
                      onDelete={data => cfg.setDeleteDialog({ open: true, data })}
                      isLoading={cfg.loading}
                    />
                  );
                }
                return null;
              })
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

      {/* Dialog components */}
      <DauKeoDialog
        open={tractorDialog.open}
        edit={tractorDialog.edit}
        data={tractorDialog.data}
        setData={data => setTractorDialog(d => ({ ...d, data }))}
        onClose={() => setTractorDialog({ open: false, edit: false, data: null })}
        onSave={handleTractorSave}
        isLoading={dauKeoHook.loading}
      />

      <RoMoocDialog
        open={trailerDialog.open}
        edit={trailerDialog.edit}
        data={trailerDialog.data}
        setData={data => setTrailerDialog(d => ({ ...d, data }))}
        onClose={() => setTrailerDialog({ open: false, edit: false, data: null })}
        onSave={handleTrailerSave}
        isLoading={roMoocHook.loading}
      />

      <ContainerDialog
        open={containerTypeDialog.open}
        edit={containerTypeDialog.edit}
        data={containerTypeDialog.data}
        setData={data => setContainerTypeDialog(d => ({ ...d, data }))}
        onClose={() => setContainerTypeDialog({ open: false, edit: false, data: null })}
        onSave={handleContainerTypeSave}
        isLoading={containerHook.loading}
      />

      {/* Delete Confirmation Dialogs */}
      <DauKeoDeleteDialog
        open={tractorDelete.open}
        data={tractorDelete.data}
        onClose={() => setTractorDelete({ open: false, data: null })}
        onConfirm={handleTractorDelete}
      />

      <RoMoocDeleteDialog
        open={trailerDelete.open}
        data={trailerDelete.data}
        onClose={() => setTrailerDelete({ open: false, data: null })}
        onConfirm={handleTrailerDelete}
      />

      <ContainerDeleteDialog
        open={containerTypeDelete.open}
        data={containerTypeDelete.data}
        onClose={() => setContainerTypeDelete({ open: false, data: null })}
        onConfirm={handleContainerTypeDelete}
      />
    </Box>
  );
};
// SwipeDetector component for handling touch events
const SwipeDetector = ({ children, onSwipeLeft, onSwipeRight }) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const handleTouchStart = useCallback(e => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);
  const handleTouchEnd = useCallback(
    e => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      // Only process horizontal swipes (ignore vertical scrolling)
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      const minDistance = 50;
      if (Math.abs(deltaX) > minDistance) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight]
  );
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal swipes
      }}
    >
      {children}
    </Box>
  );
};
const QuanLyPhuongTien = () => {
  const { tab: tabFromUrl = 'van-chuyen' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const tabsRef = useRef(null);

  // Set the active tab based on URL parameter
  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : 'van-chuyen';
  const currentTabIndex = TABS.findIndex(tab => tab.value === activeTab);

  // Redirect to the first tab if the current tab is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/phuong-tien/van-chuyen`, { replace: true });
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
      <Box className="p-6">
        <h1 className="text-2xl font-bold mb-6">Quản Lý Phương Tiện</h1>
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
              <TabPanel value="van-chuyen" sx={{ p: 0, mt: 2 }}>
                <VanChuyenContent />
              </TabPanel>
            </Box>
          </TabContext>
        </Box>
      </Box>
    </SwipeDetector>
  );
};
export default QuanLyPhuongTien;
