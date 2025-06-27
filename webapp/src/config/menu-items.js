// Menu configuration with hierarchical sections
export const getMenuItems = () => {
  return [
    {
      sectionTitle: 'Kế Hoạch',
      items: [
        {
          name: 'Tổng quan',
          href: '/tong-quan',
          icon: 'ChartBar',
        },
        {
          name: 'Lịch vận chuyển',
          href: '/lich-van-chuyen',
          icon: 'Calendar',
        },
      ]
    },
    {
      sectionTitle: 'Quản Lý',
      items: [
        {
          name: 'Nhân viên',
          href: '/nhan-vien',
          icon: 'Users',
        },
        {
          name: 'Đối tác',
          href: '/doi-tac',
          icon: 'ChainLink',
        },
        {
          name: 'Khách hàng',
          href: '/khach-hang',
          icon: 'Briefcase',
        },
        {
          name: 'Phương tiện',
          href: '/phuong-tien',
          icon: 'Truck',
        },
        {
          name: 'Định mức',
          href: '/dinh-muc',
          icon: 'Oil',
        },
      ]
    },
    {
      sectionTitle: 'Chi Phí',
      items: [
        {
          name: 'Bảo dưỡng',
          href: '/bao-duong',
          icon: 'Tire',
        },
      ]
    }
  ];
};