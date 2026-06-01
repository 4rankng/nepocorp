import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    setError('');
    try {
      await login(username, password);
    } catch {
      setError('Sai thông tin đăng nhập. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-up">
        <form className="login-form" onSubmit={submit}>
          <div className="login-brand">
            <div className="brand-logo">
              <img src="/assets/logo.avif" alt="NEPOCORP Logo" />
            </div>
            <h1>NEPOCORP</h1>
            <p>Hệ thống Quản lý Vận tải</p>
          </div>

          <div className="login-divider" />

          <h2>Đăng nhập</h2>
          <p className="sub">Nhập thông tin tài khoản của bạn</p>

          <div className="field">
            <label htmlFor="username-input">Tên đăng nhập / Số điện thoại</label>
            <div className="input-icon">
              <User size={16} />
              <input
                id="username-input"
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc số điện thoại…"
                autoCapitalize="none"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password-input">Mật khẩu</label>
            <div className="input-icon" style={{ position: 'relative' }}>
              <Lock size={16} />
              <input
                id="password-input"
                className="input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu…"
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: 9, background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            className="btn btn--primary btn--lg login-submit"
            type="submit"
            disabled={!username || !password || submitting}
          >
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>


        </form>
      </div>

      <img src="/assets/illustrations/bg-transport-world.svg" alt="" className="login-bg-svg" />

      <p className="login-footer">
        &copy; {new Date().getFullYear()} NEPOCORP &middot; Hải Phòng
      </p>
    </div>
  );
}
