import React from 'react';
import { Grid, Box, Typography, Skeleton } from '@mui/material';
import StatCard from './StatCard';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccountBalance as AccountBalanceIcon,
  PeopleAlt as PeopleAltIcon,
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  MonetizationOn as MonetizationOnIcon,
} from '@mui/icons-material';
import { calculateStatsOverview, calculateGrowthRate } from '@/features/bang-cong-no/utils';

const StatsGrid = ({
  transactions = [],
  previousTransactions = [],
  loading = false,
  title = 'Tổng quan tài chính',
  showTitle = true,
  variant = 'default', // 'default', 'compact'
  sx = {},
}) => {
  const stats = calculateStatsOverview(transactions);
  const previousStats = calculateStatsOverview(previousTransactions);

  // Calculate growth rates
  const receivableGrowth = calculateGrowthRate(
    stats.totalReceivable,
    previousStats.totalReceivable
  );
  const payableGrowth = calculateGrowthRate(stats.totalPayable, previousStats.totalPayable);
  const balanceGrowth = calculateGrowthRate(stats.netBalance, previousStats.netBalance);

  const getStatsConfig = () => {
    // HTML demo specific stats configuration
    if (variant === 'html-demo') {
      return [
        {
          title: 'Tổng phải thu',
          value: 723975720,
          type: 'currency',
          color: '#e53e3e',
          icon: TrendingUpIcon,
          subtitle: '48 khách hàng có nợ',
          variant: 'danger',
        },
        {
          title: 'Phải thu quá hạn',
          value: 485320100,
          type: 'currency',
          color: '#3182ce',
          icon: WarningIcon,
          subtitle: '67% tổng nợ',
          variant: 'default',
        },
        {
          title: 'Thu trong tháng',
          value: 125500000,
          type: 'currency',
          color: '#48bb78',
          icon: TrendingUpIcon,
          subtitle: '↑ 12% so với tháng trước',
          variant: 'success',
        },
        {
          title: 'Khách hàng',
          value: 52,
          type: 'number',
          color: '#3182ce',
          icon: PeopleAltIcon,
          subtitle: '4 khách hàng mới',
          variant: 'default',
        },
      ];
    }

    const baseStats = [
      {
        title: 'Tổng phải thu',
        value: stats.totalReceivable,
        type: 'currency',
        color: '#d32f2f',
        icon: TrendingUpIcon,
        trend: receivableGrowth,
        trendLabel: 'so với kỳ trước',
        variant: stats.totalReceivable > stats.totalPayable ? 'highlighted' : 'default',
      },
      {
        title: 'Tổng phải trả',
        value: stats.totalPayable,
        type: 'currency',
        color: '#2e7d32',
        icon: TrendingDownIcon,
        trend: payableGrowth,
        trendLabel: 'so với kỳ trước',
      },
      {
        title: 'Số dư ròng',
        value: Math.abs(stats.netBalance),
        type: 'currency',
        color: stats.netBalance >= 0 ? '#d32f2f' : '#2e7d32',
        icon: AccountBalanceIcon,
        trend: balanceGrowth,
        trendLabel: stats.netBalance >= 0 ? 'Dương tính' : 'Âm tính',
        variant: Math.abs(stats.netBalance) > 100000000 ? 'danger' : 'default', // 100M VND threshold
      },
    ];

    if (variant === 'compact') {
      return baseStats;
    }

    // Extended stats for default variant
    return [
      ...baseStats,
      {
        title: 'Giao dịch quá hạn',
        value: stats.overdueCount,
        type: 'number',
        color: '#ff9800',
        icon: WarningIcon,
        subtitle: `${stats.overdueCount} giao dịch`,
        variant: stats.overdueCount > 10 ? 'danger' : 'default',
      },
      {
        title: 'Giao dịch gần đây',
        value: stats.recentTransactions,
        type: 'number',
        color: '#9c27b0',
        icon: ReceiptIcon,
        subtitle: 'Trong tháng qua',
      },
      {
        title: 'Tổng giao dịch',
        value: transactions.length,
        type: 'number',
        color: '#1976d2',
        icon: MonetizationOnIcon,
        subtitle: 'Tất cả giao dịch',
      },
    ];
  };

  const statsConfig = getStatsConfig();

  if (loading) {
    return (
      <Box sx={{ ...sx }}>
        {showTitle && (
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              mb: 3,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
            }}
          >
            {title}
          </Typography>
        )}
        <Grid container spacing={3}>
          {Array.from({ length: variant === 'html-demo' ? 4 : variant === 'compact' ? 3 : 6 }).map(
            (_, index) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={variant === 'html-demo' ? 3 : variant === 'compact' ? 4 : 2}
                key={index}
              >
                <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
              </Grid>
            )
          )}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ ...sx }}>
      {showTitle && (
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            mb: 3,
            color: 'text.primary',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
          }}
        >
          {title}
        </Typography>
      )}

      <Grid container spacing={3}>
        {statsConfig.map((stat, index) => (
          <Grid
            item
            xs={12}
            sm={6}
            md={
              variant === 'html-demo'
                ? 3
                : variant === 'compact'
                  ? 4
                  : statsConfig.length === 6
                    ? 2
                    : 4
            }
            key={index}
          >
            <StatCard
              title={stat.title}
              value={stat.value}
              type={stat.type}
              color={stat.color}
              icon={stat.icon}
              trend={stat.trend}
              trendLabel={stat.trendLabel}
              subtitle={stat.subtitle}
              variant={stat.variant}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StatsGrid;
