import React from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Stack,
  Paper
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  SearchOff as SearchOffIcon,
  Add as AddIcon,
  FilterAlt as FilterAltIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

const EmptyState = ({
  type = 'default', // 'default', 'search', 'filter', 'transactions'
  title,
  description,
  actionLabel,
  onAction,
  icon: CustomIcon,
  showAction = true,
  sx = {}
}) => {
  const getDefaultContent = () => {
    switch (type) {
      case 'search':
        return {
          icon: SearchOffIcon,
          title: 'Không tìm thấy kết quả',
          description: 'Không có giao dịch nào khớp với từ khóa tìm kiếm của bạn. Hãy thử với từ khóa khác.',
          actionLabel: 'Xóa tìm kiếm',
          iconColor: '#ff9800'
        };
      
      case 'filter':
        return {
          icon: FilterAltIcon,
          title: 'Không có dữ liệu khớp với bộ lọc',
          description: 'Không có giao dịch nào phù hợp với các bộ lọc đã chọn. Hãy thử điều chỉnh bộ lọc.',
          actionLabel: 'Xóa bộ lọc',
          iconColor: '#2196f3'
        };
      
      case 'transactions':
        return {
          icon: ReceiptIcon,
          title: 'Chưa có giao dịch nào',
          description: 'Bạn chưa có giao dịch nào trong hệ thống. Hãy thêm giao dịch đầu tiên để bắt đầu.',
          actionLabel: 'Thêm giao dịch',
          iconColor: '#4caf50'
        };
      
      default:
        return {
          icon: AssignmentIcon,
          title: 'Không có dữ liệu',
          description: 'Không có dữ liệu để hiển thị.',
          actionLabel: 'Thêm mới',
          iconColor: '#9e9e9e'
        };
    }
  };

  const defaultContent = getDefaultContent();
  const IconComponent = CustomIcon || defaultContent.icon;
  const displayTitle = title || defaultContent.title;
  const displayDescription = description || defaultContent.description;
  const displayActionLabel = actionLabel || defaultContent.actionLabel;

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 6, 
        textAlign: 'center',
        bgcolor: 'grey.50',
        border: '2px dashed',
        borderColor: 'grey.300',
        borderRadius: 2,
        ...sx 
      }}
    >
      <Stack spacing={3} alignItems="center">
        {/* Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: `${defaultContent.iconColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <IconComponent 
            sx={{ 
              fontSize: 40,
              color: defaultContent.iconColor
            }} 
          />
        </Box>

        {/* Content */}
        <Stack spacing={1} alignItems="center" maxWidth={400}>
          <Typography 
            variant="h6" 
            color="text.primary"
            sx={{ fontWeight: 600 }}
          >
            {displayTitle}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ textAlign: 'center', lineHeight: 1.6 }}
          >
            {displayDescription}
          </Typography>
        </Stack>

        {/* Action Button */}
        {showAction && onAction && (
          <Button
            variant="contained"
            startIcon={type === 'transactions' ? <AddIcon /> : undefined}
            onClick={onAction}
            sx={{
              px: 3,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            {displayActionLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

export default EmptyState;