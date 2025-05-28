export const getStatusColor = status => {
  switch (status) {
    case 'tam_thoi':
      return '#757575'; // grey - Temporary
    case 'len_lich':
      return '#2196f3'; // blue - Scheduled
    case 'dang_chay':
      return '#ff9800'; // orange - In transit
    case 'hoan_thanh':
      return '#4caf50'; // green - Completed
    case 'huy_bo':
      return '#f44336'; // red - Cancelled
    default:
      return '#bdbdbd'; // light grey - Unknown/Default
  }
};
