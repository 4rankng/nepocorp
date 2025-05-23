import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Kept for future use, though not used in this version

const DangNhap = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // const navigate = useNavigate(); // Kept for future use

  const canLogin = username.trim() !== '' && password.trim() !== '';

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent form submission
    setError('');

    if (canLogin) {
      console.log('Login attempt with:', { username, password });
      // TODO: Implement actual authentication
      // For now, simulating a successful login attempt message
      // navigate('/quan-ly'); // Example navigation, commented out for now
    } else {
      // This case should ideally not be reached if button is properly disabled
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
    }
  };

  return (
    <>
      <h2 className="text-center text-3xl font-extrabold text-gray-900 mb-6">
        Đăng nhập
      </h2>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Tên đăng nhập
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nhập tên đăng nhập"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Mật khẩu
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Nhập mật khẩu"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        <div className="flex items-center justify-end"> {/* Changed to justify-end for only forgot password link */}
          <div className="text-sm">
            <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500" onClick={(e) => { e.preventDefault(); console.log('Forgot password clicked'); }}>
              Quên mật khẩu?
            </a>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={!canLogin}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              canLogin
                ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                : 'bg-indigo-300 cursor-not-allowed'
            } focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            Đăng nhập
          </button>
        </div>
      </form>
    </>
  );
};

export default DangNhap;
