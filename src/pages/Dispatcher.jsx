import React from 'react';

export default function Dispatcher() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="bg-white p-8 rounded shadow w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4">Giao nhận - Lịch vận chuyển</h2>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Lịch vận chuyển theo ngày</h3>
          <table className="w-full border mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th>Ngày</th>
                <th>Chuyến</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2025-05-21</td>
                <td>001</td>
                <td>Đã nhận hàng</td>
              </tr>
              <tr>
                <td>2025-05-22</td>
                <td>002</td>
                <td>Đang vận chuyển</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Nhập dữ liệu khi nhận hàng</h3>
          <form className="space-y-2">
            <div className="flex gap-4">
              <div className="flex-1">
                <label>Số cont</label>
                <input className="border rounded w-full p-2" type="text" />
              </div>
              <div className="flex-1">
                <label>Số seal</label>
                <input className="border rounded w-full p-2" type="text" />
              </div>
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" type="submit">Lưu</button>
          </form>
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Yêu cầu tạm ứng & hoàn ứng</h3>
          <form className="space-y-2">
            <div>
              <label>Các loại chi phí</label>
              <input className="border rounded w-full p-2" type="text" placeholder="nâng hạ, khai báo, kiểm hóa, cơ sở hạ tầng, chi hộ" />
            </div>
            <div>
              <label>Chứng từ (giả lập)</label>
              <input className="border rounded w-full p-2" type="file" />
            </div>
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" type="submit">Lưu</button>
          </form>
        </div>
      </div>
    </div>
  );
}
