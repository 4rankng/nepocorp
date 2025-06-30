// Menu configuration with hierarchical sections
export const getMenuItems = () => {
  return [
    {
      sectionTitle: 'Quản lý',
      items: [
        {
          name: 'Tài chính',
          href: '/tai-chinh',
          icon: 'ChartBar',
        },
                {
          name: 'Công nợ',
          href: '/bang-cong-no',
          icon: 'Wallet',
        },

        {
          name: 'Bảo dưỡng',
          href: '/bao-duong',
          icon: 'Tire',
        },
                {
          name: 'Lịch vận chuyển',
          href: '/lich-van-chuchuyen',
          icon: 'Calendar',
        },
      ]
    },
        {
      sectionTitle: 'Kế toán',
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
      ],
      },
    {
      sectionTitle: 'Thiếp lập',
      items: [

        {
          name: 'Định mức',
          href: '/dinh-muc',
          icon: 'Oil',
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
          name: 'Người dùng',
          href: '/nhan-vien',
          icon: 'Users',
        },
      ]
    }
  ];
};
