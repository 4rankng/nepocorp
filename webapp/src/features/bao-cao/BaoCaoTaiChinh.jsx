import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Paper,
} from '@mui/material';
import { format, subMonths } from 'date-fns';
import {
  KPICard,
  RevenueVsCostBarChart,
  ProfitTrendLineChart,
  CustomerShipmentsBarChart,
  RevenueDistributionPieChart,
  MonthlyStatsSection,
} from './components';

const BaoCaoTaiChinh = () => {
  const [dateRange, setDateRange] = useState('6months');
  const [dashboardData, setDashboardData] = useState({
    totalShipments: 487,
    totalRevenue: 2000000000,
    averageRevenue: 4100000,
    totalProfit: 461000000,
    monthlyData: [],
    customerData: [],
    revenueVsCost: [],
    profitTrend: [],
  });
  const [loading, setLoading] = useState(true);

  const generateMonthlyData = (months) => {
    return months.map((month, index) => ({
      month: month.substring(0, 3),
      revenue: Math.floor(Math.random() * 500000000) + 200000000,
      cost: Math.floor(Math.random() * 300000000) + 150000000,
      shipments: Math.floor(Math.random() * 100) + 50,
    }));
  };

  const generateCustomerData = () => {
    const customers = [
      'Công ty ABC',
      'Công ty XYZ',
      'Khách hàng DEF',
      'Doanh nghiệp GHI',
      'Công ty JKL',
    ];

    return customers.map(name => ({
      name,
      shipments: Math.floor(Math.random() * 150) + 50,
      revenue: Math.floor(Math.random() * 500000000) + 100000000,
    })).sort((a, b) => b.shipments - a.shipments);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const monthsCount = dateRange === '3months' ? 3 : dateRange === '6months' ? 6 : 12;
      const months = [];

      for (let i = monthsCount - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        months.push(format(date, 'MMM yyyy'));
      }

      const monthlyData = generateMonthlyData(months);
      const customerData = generateCustomerData();

      // Calculate totals
      const totalRevenue = monthlyData.reduce((sum, item) => sum + item.revenue, 0);
      const totalCost = monthlyData.reduce((sum, item) => sum + item.cost, 0);
      const totalShipments = monthlyData.reduce((sum, item) => sum + item.shipments, 0);
      const totalProfit = totalRevenue - totalCost;

      // Format data for charts
      const revenueVsCost = monthlyData.map(item => ({
        month: item.month,
        'Doanh Thu': item.revenue / 1000000,
        'Chi Phí': item.cost / 1000000,
      }));

      const profitTrend = monthlyData.map(item => ({
        month: item.month,
        'Lợi Nhuận': (item.revenue - item.cost) / 1000000,
      }));

      setDashboardData({
        totalShipments,
        totalRevenue,
        averageRevenue: totalRevenue / totalShipments,
        totalProfit,
        monthlyData,
        customerData,
        revenueVsCost,
        profitTrend,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const formatCurrency = (value) => {
    if (value >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    return value.toLocaleString();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Đang tải dữ liệu...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1, bgcolor: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={1}>
        <FormControl size="small">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            sx={{ minWidth: 120, fontSize: '0.875rem' }}
          >
            <MenuItem value="3months">3 Tháng</MenuItem>
            <MenuItem value="6months">6 Tháng</MenuItem>
            <MenuItem value="12months">12 Tháng</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Main Content Container */}
      <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Row 1: 4 KPI Cards */}
        <Box sx={{ flex: '0 0 auto', mb: 1 }}>
          <Grid container spacing={1}>
            <Grid item xs={6} lg={3}>
              <Box sx={{ p: 1, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: 1, height: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Tổng Chuyến Hàng
                </Typography>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {dashboardData.totalShipments}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} lg={3}>
              <Box sx={{ p: 1, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: 1, height: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Doanh Thu
                </Typography>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'primary.main' }}>
                  ${formatCurrency(dashboardData.totalRevenue)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} lg={3}>
              <Box sx={{ p: 1, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: 1, height: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Doanh Thu TB/Chuyến
                </Typography>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  ${formatCurrency(dashboardData.averageRevenue)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} lg={3}>
              <Box sx={{ p: 1, textAlign: 'center', bgcolor: '#f8f9fa', borderRadius: 1, height: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                  Lợi Nhuận
                </Typography>
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'success.main' }}>
                  ${formatCurrency(dashboardData.totalProfit)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Row 2: 2 Charts */}
        <Box sx={{ flex: '1 1 50%', mb: 1 }}>
          <Grid container spacing={1} sx={{ height: '100%' }}>
            <Grid item xs={12} lg={6} sx={{ height: '100%' }}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1, height: '100%', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <RevenueVsCostBarChart data={dashboardData.revenueVsCost} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6} sx={{ height: '100%' }}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1, height: '100%', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <ProfitTrendLineChart data={dashboardData.profitTrend} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Row 3: 2 Charts */}
        <Box sx={{ flex: '1 1 50%' }}>
          <Grid container spacing={1} sx={{ height: '100%' }}>
            <Grid item xs={12} lg={6} sx={{ height: '100%' }}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1, height: '100%', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <CustomerShipmentsBarChart data={dashboardData.customerData} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} lg={6} sx={{ height: '100%' }}>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 1, height: '100%', border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', overflow: 'hidden' }}>
                  <RevenueDistributionPieChart data={dashboardData.customerData} />
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

      </Box>
    </Box>
  );
};

export default BaoCaoTaiChinh;
