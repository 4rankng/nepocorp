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
            <label>Tên đăng nhập / Số điện thoại</label>
            <div className="input-icon">
              <User size={16} />
              <input
                className="input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập hoặc số điện thoại..."
                autoCapitalize="none"
              />
            </div>
          </div>

          <div className="field">
            <label>Mật khẩu</label>
            <div className="input-icon" style={{ position: 'relative' }}>
              <Lock size={16} />
              <input
                className="input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <div className="login-hints">
            <p className="login-hints__title">Tài khoản demo:</p>
            <div className="login-hints__accounts">
              <button type="button" className="login-hints__chip" onClick={() => { setUsername('giamdoc'); setPassword('admin123'); }}>
                giamdoc <span>Giám đốc</span>
              </button>
              <button type="button" className="login-hints__chip" onClick={() => { setUsername('ketoan'); setPassword('admin123'); }}>
                ketoan <span>Kế toán</span>
              </button>
              <button type="button" className="login-hints__chip" onClick={() => { setUsername('laixe'); setPassword('admin123'); }}>
                laixe <span>Lái xe</span>
              </button>
            </div>
            <p className="login-hints__pw">Mật khẩu: <code>admin123</code></p>
          </div>
        </form>
      </div>

      <img src="/assets/illustrations/bg-transport-world.svg" alt="" className="login-bg-svg" />

      <p className="login-footer">
        &copy; {new Date().getFullYear()} NEPOCORP &middot; Hải Phòng
      </p>
    </div>
  );
}
