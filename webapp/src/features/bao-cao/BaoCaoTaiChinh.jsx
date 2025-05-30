import React from 'react';
import { Box, Typography } from '@mui/material';

const BaoCaoTaiChinh = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 200px)', // Adjust height as needed
        textAlign: 'center',
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom>
        Báo Cáo Tài Chính
      </Typography>
      <Typography variant="h6" component="p">
        Tính năng này sẽ sớm được ra mắt!
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Chúng tôi đang làm việc chăm chỉ để mang đến cho bạn những phân tích tài chính chi tiết và
        hữu ích.
      </Typography>
    </Box>
  );
};

export default BaoCaoTaiChinh;
