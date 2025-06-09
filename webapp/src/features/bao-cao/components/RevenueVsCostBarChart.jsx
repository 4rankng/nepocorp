import React from 'react';
import { Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const RevenueVsCostBarChart = ({ data }) => {
  return (
    <Paper sx={{ p: 2, height: 300 }}>
      <Typography variant="h6" gutterBottom>
        Doanh Thu vs Chi Phí
      </Typography>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => `${value}M VND`} />
          <Legend />
          <Bar dataKey="Doanh Thu" fill="#00C49F" />
          <Bar dataKey="Chi Phí" fill="#FF8042" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default RevenueVsCostBarChart;