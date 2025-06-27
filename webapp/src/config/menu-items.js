// Menu configuration with hierarchical sections
export const getMenuItems = () => {
  return [
    {
      sectionTitle: 'Tổng quan',
      items: [
        {
          name: 'Tài chính',
          href: '/tai-chinh',
          icon: 'ChartBar',
        },
        {
          name: 'Lịch vận chuyển',
          href: '/lich-van-chuyen',
          icon: 'Calendar',
        },
        {
          name: 'Bảo dưỡng',
          href: '/bao-duong',
          icon: 'Tire',
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
      sectionTitle: 'Công nợ',
      items: [
        {
          name: 'Phiếu chi',
          href: '/phieu-chi',
          icon: 'ShoppingCart',
        },
        {
          name: 'Phiếu thu',
          href: '/phieu-thu',
          icon: 'Banknote',
        },
      ]
    }
  ];
};
