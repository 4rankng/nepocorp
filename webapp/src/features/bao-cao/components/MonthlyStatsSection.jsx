import React from 'react';
import { Paper, Typography, Grid, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#00C49F', '#0088FE', '#FFBB28'];

const MonthlyStatsSection = ({ data }) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            Thống Kê Theo Tháng
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="shipments" fill="#0088FE" name="Chuyến" />
            </BarChart>
          </ResponsiveContainer>
        </Grid>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom>
            Tổng Quan Hoạt Động
          </Typography>
          <Box sx={{ mt: 2 }}>
            {data.map((month, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  {month.month}
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box sx={{ flexGrow: 1, bgcolor: '#e0e0e0', height: 20, borderRadius: 1 }}>
                    <Box
                      sx={{
                        width: `${(month.shipments / 150) * 100}%`,
                        bgcolor: COLORS[index % COLORS.length],
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  </Box>
                  <Typography variant="body2">{month.shipments} chuyến</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MonthlyStatsSection;