import React from 'react';

export default function Driver() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8">
      <div className="bg-white p-8 rounded shadow w-full max-w-xl">
        <h2 className="text-xl font-bold mb-4">Lái xe - Thông tin chuyến đi</h2>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Danh sách chuyến đã giao</h3>
          <table className="w-full border mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th>Ngày</th>
                <th>Cước đường</th>
                <th>Số lít dầu</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2025-05-21</td>
                <td>2.000.000</td>
                <td>50</td>
              </tr>
              <tr>
                <td>2025-05-22</td>
                <td>1.800.000</td>
                <td>45</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Thu nhập hàng tháng</h3>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th>Số ngày công</th>
                <th>Tổng lương</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>22</td>
                <td>15.000.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
