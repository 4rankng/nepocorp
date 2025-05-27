import React, { useState, useEffect, useMemo } from 'react';
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
  DialogContent,
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

// Mock APIs (replace with real API calls)
const mockDelay = ms => new Promise(res => setTimeout(res, ms));
const mockApi =
  (data, error = null) =>
  async () => {
    await mockDelay(500);
    if (error) throw new Error(error);
    return { data };
  };

const initialTractors = [
  { id: 1, licensePlate: '51C-12345', description: 'Đầu kéo Hino' },
  { id: 2, licensePlate: '51C-67890', description: 'Đầu kéo Hyundai' },
];
const initialTrailers = [
  { id: 1, licensePlate: '51R-11111', trailerType: "40'", description: 'Rơ-mooc 40 feet' },
  { id: 2, licensePlate: '51R-22222', trailerType: "20'", description: 'Rơ-mooc 20 feet' },
];
const initialContainerTypes = [
  { id: 1, type: "20'DC", description: 'Container 20 feet Dry' },
  { id: 2, type: "40'HC", description: 'Container 40 feet High Cube' },
];

const tractorApi = {
  getAll: mockApi(initialTractors),
  create: async data => {
    await mockDelay(300);
    return { data: { ...data, id: Date.now() } };
  },
  update: async (id, data) => {
    await mockDelay(300);
    return { data: { ...data, id } };
  },
  delete: async id => {
    await mockDelay(300);
    return { data: id };
  },
};
const trailerApi = {
  getAll: mockApi(initialTrailers),
  create: async data => {
    await mockDelay(300);
    return { data: { ...data, id: Date.now() } };
  },
  update: async (id, data) => {
    await mockDelay(300);
    return { data: { ...data, id } };
  },
  delete: async id => {
    await mockDelay(300);
    return { data: id };
  },
};
const containerTypeApi = {
  getAll: mockApi(initialContainerTypes),
  create: async data => {
    await mockDelay(300);
    return { data: { ...data, id: Date.now() } };
  },
  update: async (id, data) => {
    await mockDelay(300);
    return { data: { ...data, id } };
  },
  delete: async id => {
    await mockDelay(300);
    return { data: id };
  },
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
        variant="outlined"
        sx={{ fontWeight: 500, borderColor: 'primary.main', color: 'primary.main', mr: 2 }}
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

const PhuongTien = () => {
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
      .then(res => setTractors(res.data))
      .catch(() => setTractorError('Không thể tải danh sách đầu kéo'))
      .finally(() => setTractorLoading(false));
    setTrailerLoading(true);
    trailerApi
      .getAll()
      .then(res => setTrailers(res.data))
      .catch(() => setTrailerError('Không thể tải danh sách rơ-mooc'))
      .finally(() => setTrailerLoading(false));
    setContainerTypeLoading(true);
    containerTypeApi
      .getAll()
      .then(res => setContainerTypes(res.data))
      .catch(() => setContainerTypeError('Không thể tải danh sách loại container'))
      .finally(() => setContainerTypeLoading(false));
  }, []);

  // Columns
  const tractorColumns = [
    { key: 'licensePlate', label: 'BIỂN SỐ', render: v => v },
    { key: 'description', label: 'MÔ TẢ', render: v => v || '' },
  ];
  const trailerColumns = [
    { key: 'licensePlate', label: 'BIỂN SỐ', render: v => v },
    { key: 'trailerType', label: 'LOẠI RƠ-MOOC', render: v => v },
    { key: 'description', label: 'MÔ TẢ', render: v => v || '' },
  ];
  const containerTypeColumns = [
    { key: 'type', label: 'LOẠI CONTAINER', render: v => v },
    { key: 'description', label: 'MÔ TẢ', render: v => v || '' },
  ];

  // Render mobile card for each section
  const renderTractorCard = tractor => (
    <Card
      key={tractor.id}
      sx={{ mb: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography fontWeight={600}>{tractor.licensePlate}</Typography>
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
          {tractor.description}
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
          <Typography fontWeight={600}>{trailer.licensePlate}</Typography>
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
          Loại: {trailer.trailerType}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {trailer.description}
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
          <Typography fontWeight={600}>{container.type}</Typography>
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
        <Typography variant="body2" color="text.secondary">
          {container.description}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ position: 'relative', pb: 8 }}>
      <Section
        title="Danh sách đầu kéo"
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
        title="Danh sách rơ-mooc"
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
        title="Danh sách loại container"
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
      {/* Dialogs and snackbars for add/edit/delete for each section would go here, following DinhMuc pattern */}
      {/* ... */}
    </Box>
  );
};

export default PhuongTien;
