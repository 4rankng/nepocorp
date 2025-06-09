import React from 'react';
import { Paper, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const CustomerShipmentsBarChart = ({ data }) => {
  return (
    <Paper sx={{ p: 2, height: 400 }}>
      <Typography variant="h6" gutterBottom>
        Chuyến Hàng Theo Khách Hàng
      </Typography>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart 
          data={data} 
          layout="horizontal"
          margin={{ left: 80 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Bar dataKey="shipments" fill="#00C49F" name="Số Chuyến" />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  );
};

export default CustomerShipmentsBarChart;