import React from 'react';

export default function Accountant() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="bg-white p-8 rounded shadow w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">Kế toán - Lịch trình & Chi phí</h2>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Bảng Lịch trình vận chuyển</h3>
          <table className="w-full border mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th>ID chuyến</th>
                <th>Ngày</th>
                <th>Khách hàng</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>001</td>
                <td>2025-05-21</td>
                <td>A</td>
                <td>Lên lịch</td>
                <td><button className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Đổi trạng thái</button></td>
              </tr>
              <tr>
                <td>002</td>
                <td>2025-05-22</td>
                <td>B</td>
                <td>Đang chạy</td>
                <td><button className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Đổi trạng thái</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Nhập chi phí theo chuyến</h3>
          <form className="space-y-2">
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Số km hàng</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
              <div className="flex-1">
                <label>Số km chạy rỗng</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Số lít dầu</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
              <div className="flex-1">
                <label>Tổng chi phí dầu</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
            </div>
            <div>
              <label>Chi phí đường, phí cầu đường, nâng hạ, chi hộ</label>
              <input className="border rounded w-full p-2" type="text" />
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" type="submit">Lưu</button>
          </form>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Nhập chi phí phát sinh theo xe (hàng tháng)</h3>
          <form className="space-y-2">
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Phí gửi xe</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
              <div className="flex-1">
                <label>Epass</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Bảo hiểm</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
              <div className="flex-1">
                <label>Sửa chữa</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Lương lái xe</label>
                <input className="border rounded w-full p-2" type="number" />
              </div>
              <div className="flex-1">
                <label>Khác</label>
                <input className="border rounded w-full p-2" type="text" />
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" type="submit">Lưu</button>
          </form>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Công nợ phải thu / phải trả</h3>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th>Tên đơn vị</th>
                <th>Phải thu</th>
                <th>Phải trả</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Công ty A</td>
                <td>10.000.000</td>
                <td>5.000.000</td>
                <td>Chưa thanh toán</td>
              </tr>
              <tr>
                <td>Công ty B</td>
                <td>7.000.000</td>
                <td>2.000.000</td>
                <td>Đã thanh toán</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
