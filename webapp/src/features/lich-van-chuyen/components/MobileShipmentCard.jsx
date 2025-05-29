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
import { PencilIcon, TrashIcon } from '@assets/icons/index.jsx'; // Assuming path to project icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getStatusColor } from '@features/lich-van-chuyen/utils/styleUtils';
import { getDisplayTrangThai } from '@features/lich-van-chuyen/utils/lichVanChuyenUtils'; // Added import
const MobileShipmentCard = ({
  plan,
  isExpanded,
  onCardExpand,
  onEdit,
  onDelete,
  canEditDelete,
}) => {
  const statusColor = getStatusColor(plan.trangThai);
  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'visible',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        },
        transition: 'all 0.2s ease-in-out',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1976d2',
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {plan.dienGiai || 'Không có diễn giải'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                label={getDisplayTrangThai(plan.trangThai)}
                size="small"
                sx={{
                  backgroundColor: statusColor,
                  color: '#fff',
                  fontWeight: 500,
                  fontSize: '12px',
                }}
              />
              <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '12px' }}>
                {plan.ngayThang}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ fontSize: 14, mr: 0.5, color: '#6b7280' }} />
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '12px' }}>
                  {plan.khachHang || 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocalShippingIcon sx={{ fontSize: 14, mr: 0.5, color: '#6b7280' }} />
                <Typography variant="caption" sx={{ color: '#6b7280', fontSize: '12px' }}>
                  {plan.bienSoXe || 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {canEditDelete && (
              <IconButton
                size="small"
                onClick={() => onEdit(plan)}
                sx={{
                  color: '#6b7280',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    color: '#1976d2',
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
            {canEditDelete && (
              <IconButton
                size="small"
                onClick={() => onDelete(plan)}
                sx={{
                  color: '#6b7280',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.04)',
                    color: '#d32f2f',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={() => onCardExpand(plan.id)}
              sx={{
                color: '#6b7280',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>
        </Box>
        {/* Route Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            p: 1.5,
            bgcolor: '#f8f9fa',
            borderRadius: 1,
            border: '1px solid #e5e7eb',
          }}
        >
          <LocationOnIcon sx={{ color: '#6b7280', mr: 1, fontSize: 18 }} />
          <Typography variant="body2" sx={{ flexGrow: 1, color: '#374151', fontSize: '14px' }}>
            <strong>{plan.tuyenDuong?.diemDi || 'N/A'}</strong>
            {' → '}
            <strong>
              {Array.isArray(plan.tuyenDuong?.diemDen)
                ? plan.tuyenDuong.diemDen.join(', ')
                : plan.tuyenDuong?.diemDen || 'N/A'}
            </strong>
          </Typography>
        </Box>
        {/* Expandable Content */}
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Divider sx={{ mb: 2, borderColor: '#e5e7eb' }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', flex: 1 }}>
                Số lượng container:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#374151', textAlign: 'right', flex: 1 }}
              >
                {plan.soLuongContainer || 0}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', flex: 1 }}>
                Loại container:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#374151', textAlign: 'right', flex: 1 }}
              >
                {plan.loaiContainer || 'N/A'}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', flex: 1 }}>
                Cước vận chuyển:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#374151', textAlign: 'right', flex: 1 }}
              >
                {plan.cuocVanChuyen?.toLocaleString('vi-VN') || 0} VNĐ
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1,
                borderBottom: '1px solid #f5f5f5',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', flex: 1 }}>
                Cước thuê vận chuyển:
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#374151', textAlign: 'right', flex: 1 }}
              >
                {plan.cuocThueVanChuyen?.toLocaleString('vi-VN') || 0} VNĐ
              </Typography>
            </Box>
            {plan.doiTac && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', flex: 1 }}>
                  Đối tác vận chuyển:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#374151', textAlign: 'right', flex: 1 }}
                >
                  {plan.doiTac}
                </Typography>
              </Box>
            )}
            {plan.ngayHaHang && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', flex: 1 }}>
                  Ngày hạ hàng:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#374151', textAlign: 'right', flex: 1 }}
                >
                  {plan.ngayHaHang}
                </Typography>
              </Box>
            )}
          </Box>
          {plan.thongTinContainer && plan.thongTinContainer.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#6b7280', mb: 1 }}>
                Thông tin container:
              </Typography>
              {plan.thongTinContainer.map((container, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    p: 1.5,
                    mb: 1,
                    bgcolor: '#f8f9fa',
                    borderRadius: 1,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    <strong>Container:</strong> {container.soContainer || 'N/A'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#374151' }}>
                    <strong>Seal:</strong> {container.soSeal || 'N/A'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
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
    thongTinContainer: PropTypes.arrayOf(
      PropTypes.shape({
        soContainer: PropTypes.string,
        soSeal: PropTypes.string,
      })
    ),
  }).isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onCardExpand: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  canEditDelete: PropTypes.bool, // Added prop type
};
MobileShipmentCard.defaultProps = {
  canEditDelete: false, // Default to false if not provided
};
export default MobileShipmentCard;
