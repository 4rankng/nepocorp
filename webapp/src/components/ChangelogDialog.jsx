import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
} from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CloseIcon from '@mui/icons-material/Close';
const ChangelogDialog = ({ open, onClose, version }) => {
  const [changelog, setChangelog] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (open && version) {
      setLoading(true);
      setError(null);
      // Fetch changelog from public directory
      fetch(`/changelog/v${version}.md`, { cache: 'no-cache' })
        .then(response => {
          if (!response.ok) {
            throw new Error('Không tìm thấy thông tin phiên bản này');
          }
          return response.text();
        })
        .then(text => {
          setChangelog(text);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [open, version]);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme => theme.shadows[24],
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          zIndex: 1,
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          sx={{
            minWidth: 'auto',
            p: 1,
            bgcolor: 'white',
            borderRadius: '50%',
            boxShadow: 1,
            '&:hover': {
              bgcolor: 'grey.100',
              boxShadow: 2,
            },
          }}
          aria-label="đóng"
        >
          <CloseIcon />
        </Button>
      </Box>
      <DialogContent sx={{ py: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" align="center" py={4}>
            {error}
          </Typography>
        ) : (
          <Box
            sx={theme => ({
              '& h1': {
                fontSize: '1.75rem',
                fontWeight: 600,
                mb: 3,
                pb: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                color: theme.palette.text.primary,
              },
              '& h2': {
                fontSize: '1.5rem',
                fontWeight: 600,
                mt: 4,
                mb: 3,
                color: theme.palette.primary.main,
                '&:not(:first-of-type)': {
                  pt: 2,
                  borderTop: `1px dashed ${theme.palette.divider}`,
                },
              },
              '& h3': {
                fontSize: '1.25rem',
                fontWeight: 600,
                mt: 3,
                mb: 2,
                color: theme.palette.text.primary,
              },
              '& h4, & h5, & h6': {
                fontSize: '1.1rem',
                fontWeight: 600,
                mt: 2,
                mb: 1.5,
                color: theme.palette.text.primary,
              },
              '& p': {
                mb: 2,
                lineHeight: 1.7,
                color: theme.palette.text.secondary,
                '&:last-child': { mb: 0 },
              },
              '& a': {
                color: theme.palette.primary.main,
                textDecoration: 'none',
                '&:hover': { textDecoration: 'underline' },
              },
              '& ul, & ol': {
                pl: 3,
                mb: 2,
                '& li': {
                  mb: 1,
                  color: theme.palette.text.secondary,
                  '&::marker': { color: theme.palette.primary.main },
                  '& > p': { display: 'inline', mb: 0 },
                },
                '& ul, & ol': { mt: 1, mb: 0, pl: 3 },
              },
              '& code': {
                fontFamily: 'monospace',
                fontSize: '0.9em',
                background:
                  theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                color:
                  theme.palette.mode === 'dark'
                    ? theme.palette.primary.light
                    : theme.palette.primary.dark,
              },
              '& pre': {
                borderRadius: 1,
                overflow: 'auto',
                mb: 3,
                p: 1,
                background:
                  theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
                '& code': { background: 'none', color: 'inherit', p: 0 },
              },
              '& blockquote': {
                borderLeft: `4px solid ${theme.palette.primary.main}`,
                pl: 2,
                py: 0.5,
                my: 2,
                color: theme.palette.text.secondary,
                fontStyle: 'italic',
                background:
                  theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[50],
                '& p': { mb: 0 },
              },
              '& table': {
                width: '100%',
                borderCollapse: 'collapse',
                my: 3,
                '& th, & td': {
                  border: `1px solid ${theme.palette.divider}`,
                  p: 1,
                  textAlign: 'left',
                },
                '& th': {
                  background: theme.palette.grey[100],
                  fontWeight: 600,
                },
                '& tr:nth-of-type(even)': {
                  background: theme.palette.action.hover,
                },
              },
              '& img': {
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 1,
                my: 2,
              },
            })}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <Typography variant="h4" component="h1" gutterBottom {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <Typography variant="h5" component="h2" gutterBottom {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <Typography variant="h6" component="h3" gutterBottom {...props} />
                ),
                h4: ({ node, ...props }) => (
                  <Typography variant="subtitle1" component="h4" gutterBottom {...props} />
                ),
                p: ({ node, ...props }) => <Typography variant="body1" paragraph {...props} />,
                li: ({ node, ...props }) => (
                  <Typography component="li" variant="body1" {...props} sx={{ pl: 1 }} />
                ),
                a: ({ node, ...props }) => <a style={{ color: '#1976d2' }} {...props} />,
                code: ({ node, inline, className, children, ...props }) =>
                  inline ? (
                    <code {...props}>{children}</code>
                  ) : (
                    <pre>
                      <code {...props}>{children}</code>
                    </pre>
                  ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    {...props}
                    style={{
                      borderLeft: '4px solid #1976d2',
                      margin: 0,
                      paddingLeft: 16,
                      color: '#666',
                      background: '#f9f9f9',
                    }}
                  />
                ),
                table: ({ node, ...props }) => (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} {...props} />
                ),
                th: ({ node, ...props }) => (
                  <th
                    style={{ border: '1px solid #e0e0e0', padding: 8, background: '#f5f5f5' }}
                    {...props}
                  />
                ),
                td: ({ node, ...props }) => (
                  <td style={{ border: '1px solid #e0e0e0', padding: 8 }} {...props} />
                ),
              }}
            >
              {changelog}
            </ReactMarkdown>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
};
ChangelogDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  version: PropTypes.string,
};
export default ChangelogDialog;
