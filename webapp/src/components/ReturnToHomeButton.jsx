import React from 'react';
import { Link } from 'react-router-dom';

const ReturnToHomeButton = () => {
  return (
    <div className="mt-8 text-center">
      <Link
        to="/"
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Quay lại Trang Chủ
      </Link>
    </div>
  );
};

export default ReturnToHomeButton;
