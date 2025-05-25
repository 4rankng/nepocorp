export const getStatusColor = (status) => {
  switch (status) {
    case 'Lên lịch': return '#2196f3'; // blue
    case 'Đang vận chuyển': return '#ff9800'; // orange
    case 'Hoàn thành': return '#4caf50'; // green
    case 'Hủy': return '#f44336'; // red
    default: return '#9e9e9e'; // grey
  }
};
