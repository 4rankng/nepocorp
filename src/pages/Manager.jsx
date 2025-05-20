import React, { useState } from 'react';

export default function Manager() {
  const [form, setForm] = useState({
    date: '',
    description: '',
    customer: '',
    quantity: '',
    containerType: '',
    from: '',
    to: '',
    sellPrice: '',
    partnerPrice: '',
    contNumber: '',
    sealNumber: '',
    unloadDate: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.date) errs.date = 'Chọn ngày vận chuyển';
    if (!form.customer) errs.customer = 'Chọn khách hàng';
    if (!form.quantity) errs.quantity = 'Nhập số lượng';
    if (!form.containerType) errs.containerType = 'Chọn loại container';
    if (!form.from) errs.from = 'Nhập điểm đi';
    if (!form.to) errs.to = 'Nhập điểm đến';
    if (!form.sellPrice) errs.sellPrice = 'Nhập cước bán khách';
    if (!form.partnerPrice) errs.partnerPrice = 'Nhập cước thuê đối tác';
    if (!form.contNumber) errs.contNumber = 'Nhập số cont';
    if (!form.sealNumber) errs.sealNumber = 'Nhập số seal';
    if (!form.unloadDate) errs.unloadDate = 'Chọn ngày hạ hàng';
    return errs;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4">
      <div className="bg-white p-4 sm:p-8 rounded shadow w-full max-w-full md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Lập kế hoạch vận chuyển</h2>
        {submitted && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded text-center">Tạo kế hoạch thành công</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block">Ngày vận chuyển</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} className="border rounded w-full p-2" />
            {errors.date && <span className="text-red-600 text-sm">{errors.date}</span>}
          </div>
          <div>
            <label className="block">Diễn giải</label>
            <input type="text" name="description" value={form.description} onChange={handleChange} className="border rounded w-full p-2" />
          </div>
          <div>
            <label className="block">Khách hàng</label>
            <select name="customer" value={form.customer} onChange={handleChange} className="border rounded w-full p-2">
              <option value="">-- Chọn --</option>
              <option value="A">A</option>
              <option value="B">B</option>
            </select>
            {errors.customer && <span className="text-red-600 text-sm">{errors.customer}</span>}
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block">Số lượng</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.quantity && <span className="text-red-600 text-sm">{errors.quantity}</span>}
            </div>
            <div className="flex-1">
              <label className="block">Loại container</label>
              <select name="containerType" value={form.containerType} onChange={handleChange} className="border rounded w-full p-2">
                <option value="">-- Chọn --</option>
                <option value="20ft">20ft</option>
                <option value="40ft">40ft</option>
              </select>
              {errors.containerType && <span className="text-red-600 text-sm">{errors.containerType}</span>}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block">Điểm đi</label>
              <input type="text" name="from" value={form.from} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.from && <span className="text-red-600 text-sm">{errors.from}</span>}
            </div>
            <div className="flex-1">
              <label className="block">Điểm đến</label>
              <input type="text" name="to" value={form.to} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.to && <span className="text-red-600 text-sm">{errors.to}</span>}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block">Cước bán khách</label>
              <input type="number" name="sellPrice" value={form.sellPrice} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.sellPrice && <span className="text-red-600 text-sm">{errors.sellPrice}</span>}
            </div>
            <div className="flex-1">
              <label className="block">Cước thuê đối tác</label>
              <input type="number" name="partnerPrice" value={form.partnerPrice} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.partnerPrice && <span className="text-red-600 text-sm">{errors.partnerPrice}</span>}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block">Số cont</label>
              <input type="text" name="contNumber" value={form.contNumber} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.contNumber && <span className="text-red-600 text-sm">{errors.contNumber}</span>}
            </div>
            <div className="flex-1">
              <label className="block">Số seal</label>
              <input type="text" name="sealNumber" value={form.sealNumber} onChange={handleChange} className="border rounded w-full p-2" />
              {errors.sealNumber && <span className="text-red-600 text-sm">{errors.sealNumber}</span>}
            </div>
          </div>
          <div>
            <label className="block">Ngày hạ hàng</label>
            <input type="date" name="unloadDate" value={form.unloadDate} onChange={handleChange} className="border rounded w-full p-2" />
            {errors.unloadDate && <span className="text-red-600 text-sm">{errors.unloadDate}</span>}
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold">Tạo kế hoạch</button>
        </form>
      </div>
    </div>
  );
}
