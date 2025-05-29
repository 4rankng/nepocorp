import React, { useState, useEffect } from 'react';
import { Box, Dialog, DialogContent, IconButton, Typography, useTheme } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const HelpDialog = ({ helpContent, markdownPath }) => {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();

  // Simple markdown parser for basic formatting
  const parseMarkdown = text => {
    if (!text) return '';

    return (
      text
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        // Line breaks
        .replace(/\n/gim, '<br/>')
    );
  };

  const loadMarkdownContent = async path => {
    try {
      setLoading(true);
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load markdown file: ${response.status}`);
      }
      const text = await response.text();
      setContent(text);
    } catch (error) {
      console.error('Error loading markdown file:', error);
      setContent('Không thể tải nội dung trợ giúp.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (markdownPath) {
      loadMarkdownContent(markdownPath);
    } else if (helpContent) {
      setContent(helpContent);
    }
  }, [markdownPath, helpContent]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.secondary,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Đang tải...
        </Typography>
      );
    }

    if (markdownPath) {
      // Render parsed markdown
      return (
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.primary,
            lineHeight: 1.6,
            '& h1, & h2, & h3': {
              margin: '16px 0 8px 0',
              color: theme.palette.text.primary,
            },
            '& h1': { fontSize: '1.5rem' },
            '& h2': { fontSize: '1.3rem' },
            '& h3': { fontSize: '1.1rem' },
            '& strong': { fontWeight: 600 },
            '& em': { fontStyle: 'italic' },
          }}
          dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />
      );
    } else {
      // Render plain text
      return (
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.text.primary,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          {content}
        </Typography>
      );
    }
  };

  return (
    <>
      {/* Help Button */}
      <IconButton
        onClick={handleOpen}
        sx={{
          color: theme.palette.info.main,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
        }}
        aria-label="help"
      >
        <HelpOutlineIcon />
      </IconButton>

      {/* Help Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 1,
          },
        }}
      >
        <DialogContent sx={{ p: 3 }}>{renderContent()}</DialogContent>
      </Dialog>
    </>
  );
};

export default HelpDialog;
