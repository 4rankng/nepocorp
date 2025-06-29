import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid, 
  Paper,
  Chip
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';

const BalanceSummary = ({ balanceSummary, loading = false }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return '#2e7d32'; // Green - positive balance
    if (balance < 0) return '#d32f2f'; // Red - negative balance
    return '#616161'; // Gray - zero balance
  };

  const getBalanceIcon = (balance) => {
    if (balance > 0) return <TrendingUpIcon />;
    if (balance < 0) return <TrendingDownIcon />;
    return <AccountBalanceIcon />;
  };

  const getBalanceLabel = (balance) => {
    if (balance > 0) return 'Dương';
    if (balance < 0) return 'Âm';
    return 'Cân bằng';
  };

  if (loading) {
    return (
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          {[1, 2, 3].map((item) => (
            <Grid item xs={12} md={4} key={item}>
              <Box sx={{ 
                height: 80, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  }

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ 
        color: 'text.primary',
        fontWeight: 600,
        mb: 2
      }}>
        Tổng quan tài chính
      </Typography>
      
      <Grid container spacing={3}>
        {/* Total Debit */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%',
            border: '1px solid #e3f2fd',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 1
            }
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ 
                  p: 1,
                  borderRadius: 1,
                  bgcolor: '#e3f2fd',
                  color: '#1976d2',
                  display: 'flex',
                  mr: 2
                }}>
                  <TrendingUpIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Tổng nợ
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 600,
                color: '#1976d2',
                wordBreak: 'break-all'
              }}>
                {formatCurrency(balanceSummary.totalDebit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Credit */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%',
            border: '1px solid #e8f5e8',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 1
            }
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ 
                  p: 1,
                  borderRadius: 1,
                  bgcolor: '#e8f5e8',
                  color: '#2e7d32',
                  display: 'flex',
                  mr: 2
                }}>
                  <TrendingDownIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Tổng có
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 600,
                color: '#2e7d32',
                wordBreak: 'break-all'
              }}>
                {formatCurrency(balanceSummary.totalCredit)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Net Balance */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%',
            border: `1px solid ${getBalanceColor(balanceSummary.balance)}20`,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 1
            }
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ 
                  p: 1,
                  borderRadius: 1,
                  bgcolor: `${getBalanceColor(balanceSummary.balance)}10`,
                  color: getBalanceColor(balanceSummary.balance),
                  display: 'flex',
                  mr: 2
                }}>
                  {getBalanceIcon(balanceSummary.balance)}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Số dư
                  </Typography>
                  <Chip 
                    label={getBalanceLabel(balanceSummary.balance)}
                    size="small"
                    sx={{
                      bgcolor: `${getBalanceColor(balanceSummary.balance)}10`,
                      color: getBalanceColor(balanceSummary.balance),
                      fontSize: '0.7rem',
                      height: 20
                    }}
                  />
                </Box>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 600,
                color: getBalanceColor(balanceSummary.balance),
                wordBreak: 'break-all'
              }}>
                {formatCurrency(Math.abs(balanceSummary.balance))}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {balanceSummary.balance >= 0 
                  ? 'Số dư tích cực' 
                  : 'Cần thu thêm'
                }
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BalanceSummary;