import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const KPICard = ({ title, value, color = 'textPrimary' }) => {
  return (
    <Card>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3" component="div" color={color}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default KPICard;