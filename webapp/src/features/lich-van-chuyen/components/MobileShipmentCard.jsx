import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Avatar,
  Button,
} from '@mui/material';
import {
  PencilIcon,
  TrashIcon
} from '@assets/icons/index.jsx'; // Assuming path to project icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getStatusColor } from '../utils/styleUtils'; // Added import

// Local getStatusColor removed

const MobileShipmentCard = ({
  plan,
  isExpanded,
  onCardExpand,
  onEdit,
  onDelete
}) => {
  const statusColor = getStatusColor(plan.trangThai);

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: 'none',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
          <Avatar
            sx={{
              bgcolor: statusColor,
              width: 40,
              height: 40,
              mr: 2,
              mt: 0.5
            }}
          >
            {plan.trangThai === 'Hoàn thành' ? <CheckCircleIcon /> : <LocalShippingIcon />}
          </Avatar>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {plan.dienGiai || 'Không có diễn giải'}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={plan.trangThai}
                size="small"
                sx={{
                  backgroundColor: statusColor,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {plan.ngayThang}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {plan.khachHang || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShippingIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {plan.bienSoXe || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={() => onCardExpand(plan.id)}
            sx={{
              mt: 0.5,
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease'
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>

        {/* Route Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
          <LocationOnIcon sx={{ color: 'success.main', mr: 1, fontSize: 18 }} />
          <Typography variant="body2" sx={{ flexGrow: 1 }}>
            <strong>{plan.tuyenDuong?.diemDi || 'N/A'}</strong>
            {' → '}
            <strong>{
              Array.isArray(plan.tuyenDuong?.diemDen)
                ? plan.tuyenDuong.diemDen.join(', ')
                : plan.tuyenDuong?.diemDen || 'N/A'
            }</strong>
          </Typography>
        </Box>

        {/* Expandable Content */}
        <Collapse in={isExpanded} timeout="auto">
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Số lượng container
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {plan.soLuongContainer || 0}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Loại container
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {plan.loaiContainer || 'N/A'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Cước vận chuyển
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                {plan.cuocVanChuyen?.toLocaleString('vi-VN') || 0} VNĐ
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block">
                Cước thuê vận chuyển
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                {plan.cuocThueVanChuyen?.toLocaleString('vi-VN') || 0} VNĐ
              </Typography>
            </Box>
          </Box>

          {plan.doiTac && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Đối tác vận chuyển
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {plan.doiTac}
              </Typography>
            </Box>
          )}

          {plan.ngayHaHang && (
            <Box sx={{ mb: 2, p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Ngày hạ hàng
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {plan.ngayHaHang}
              </Typography>
            </Box>
          )}

          {plan.thongTinContainer && plan.thongTinContainer.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Thông tin container
              </Typography>
              {plan.thongTinContainer.map((container, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    p: 1,
                    mb: 1,
                    bgcolor: 'grey.100',
                    borderRadius: 1
                  }}
                >
                  <Typography variant="body2">
                    <strong>Container:</strong> {container.soContainer || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Seal:</strong> {container.soSeal || 'N/A'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PencilIcon />}
              onClick={() => onEdit(plan)} // Changed to pass the whole plan
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                minHeight: 44 // Touch-optimized
              }}
            >
              Sửa
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<TrashIcon />}
              onClick={() => onDelete(plan)} // Changed to pass the whole plan
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                minHeight: 44 // Touch-optimized
              }}
            >
              Xóa
            </Button>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

MobileShipmentCard.propTypes = {
  plan: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    trangThai: PropTypes.string,
    dienGiai: PropTypes.string,
    ngayThang: PropTypes.string,
    khachHang: PropTypes.string,
    bienSoXe: PropTypes.string,
    tuyenDuong: PropTypes.shape({
      diemDi: PropTypes.string,
      diemDen: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    }),
    soLuongContainer: PropTypes.number,
    loaiContainer: PropTypes.string,
    cuocVanChuyen: PropTypes.number,
    cuocThueVanChuyen: PropTypes.number,
    doiTac: PropTypes.string,
    ngayHaHang: PropTypes.string,
    thongTinContainer: PropTypes.arrayOf(PropTypes.shape({
      soContainer: PropTypes.string,
      soSeal: PropTypes.string,
    })),
  }).isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onCardExpand: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default MobileShipmentCard;
