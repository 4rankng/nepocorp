// Simple menu configuration
export const getMenuItems = () => {
  return [
    {
      name: 'Báo cáo',
      href: '/bao-cao',
      icon: 'ChartBarIcon',
    },
    {
      name: 'Lịch vận chuyển',
      href: '/lich-van-chuyen',
      icon: 'CalendarIcon',
    },
    {
      name: 'Nhân viên',
      href: '/nhan-vien',
      icon: 'UsersIcon',
    },
    {
      name: 'Khách hàng',
      href: '/khach-hang',
      icon: 'UserGroupIcon',
    },
    {
      name: 'Đối tác',
      href: '/doi-tac',
      icon: 'BuildingOfficeIcon',
    },
    {
      name: 'Phương tiện',
      href: '/phuong-tien',
      icon: 'TruckIcon',
      children: [
        { name: 'Đầu kéo', href: '/phuong-tien/dau-keo' },
        { name: 'Rơ-mooc', href: '/phuong-tien/ro-mooc' },
        { name: 'Container', href: '/phuong-tien/container' },
      ],
    },
    {
      name: 'Định mức',
      href: '/dinh-muc',
      icon: 'AdjustmentsHorizontalIcon',
      children: [
        { name: 'Bổ sung', href: '/dinh-muc/bo-sung' },
        { name: 'Định mức đường', href: '/dinh-muc/duong' },
        { name: 'Vỏ rỗng', href: '/dinh-muc/vo-rong' },
      ],
    },
    {
      name: 'Bảo dưỡng',
      href: '/bao-duong',
      icon: 'WrenchScrewdriverIcon',
    },
  ];
};