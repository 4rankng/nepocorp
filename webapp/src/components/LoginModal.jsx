import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '@contexts/AuthContext';

const LoginModal = ({ open, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(username, password);
      if (result.success) {
        onClose();
        setUsername('');
        setPassword('');
      } else {
        // Use backend message if available, otherwise fallback
        setError(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }
    } catch (err) {
      // Handle specific error codes from backend
      let userFriendlyMessage = 'Đã xảy ra lỗi khi đăng nhập';

      switch (err.code) {
        case 'INVALID_CREDENTIALS':
          userFriendlyMessage = 'Tên đăng nhập hoặc mật khẩu không chính xác';
          break;
        case 'USER_NOT_ACTIVE':
          userFriendlyMessage =
            'Tài khoản của bạn chưa được kích hoạt. Vui lòng liên hệ quản trị viên.';
          break;
        case 'BAD_REQUEST':
          userFriendlyMessage = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.';
          break;
        default:
          // Use backend message if available, otherwise fallback
          userFriendlyMessage = err.message || 'Đã xảy ra lỗi khi đăng nhập';
      }

      setError(userFriendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setUsername('');
      setPassword('');
      setShowPassword(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'visible',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 0.5,
          borderRadius: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2.5,
            position: 'relative',
          }}
        >
          <IconButton
            aria-label="close"
            onClick={handleClose}
            disabled={loading}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: theme => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>

          <DialogContent sx={{ p: 4, pt: 5 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                NEPOCORP
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Chào mừng trở lại! Vui lòng đăng nhập vào tài khoản của bạn.
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {error}
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label="Tên đăng nhập"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={loading}
                  required
                  autoFocus
                  placeholder="Nhập tên đăng nhập"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                      },
                    },
                  }}
                />

                <TextField
                  fullWidth
                  label="Mật khẩu"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  placeholder="Nhập mật khẩu"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          onMouseDown={e => e.preventDefault()}
                          edge="end"
                          disabled={loading}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover fieldset': {
                        borderColor: '#667eea',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#667eea',
                      },
                    },
                  }}
                />

                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        disabled={loading}
                        sx={{
                          color: '#667eea',
                          '&.Mui-checked': {
                            color: '#667eea',
                          },
                        }}
                      />
                    }
                    label={<Typography variant="body2">Ghi nhớ đăng nhập</Typography>}
                  />
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !username || !password}
                  sx={{
                    mt: 1,
                    mb: 2,
                    py: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    '&:disabled': {
                      background: 'rgba(0, 0, 0, 0.12)',
                    },
                  }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </Button>
              </Box>
            </form>
          </DialogContent>
        </Box>
      </Paper>
    </Dialog>
  );
};

export default LoginModal;
