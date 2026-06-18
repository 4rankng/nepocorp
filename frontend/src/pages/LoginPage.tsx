import React, { useEffect, useRef, useState } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { animate, stagger, createScope, spring, utils } from 'animejs';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useAuth } from '../hooks/useAuth';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();
  const prefersReduced = usePrefersReducedMotion();
  const prefersReducedRef = useRef(prefersReduced);
  prefersReducedRef.current = prefersReduced;
  const rootRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ── Entrance animation ─────────────────────────────────────────────── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Skip animation setup entirely when reduced motion is preferred
    if (prefersReducedRef.current) {
      utils.set(root.querySelectorAll('.brand-logo, .login-brand h1, .login-brand p, .login-card, .login-divider, .login-form h2, .login-form .sub, .login-form .field, .login-submit, .login-footer'), { opacity: 1, translateY: 0, scale: 1, rotate: 0 });
      return;
    }

    const scope = createScope({ root }).add(() => {
      // All selectors target elements guaranteed present in the login page DOM.
      // Non-null assertions are safe here since this effect runs after mount.
      const logo = root.querySelector('.brand-logo')!;
      const brandTitle = root.querySelector('.login-brand h1')!;
      const brandSub = root.querySelector('.login-brand p')!;
      const card = root.querySelector('.login-card')!;
      const divider = root.querySelector('.login-divider')!;
      const heading = root.querySelector('.login-form h2')!;
      const subtext = root.querySelector('.login-form .sub')!;
      const fields = root.querySelectorAll('.login-form .field');
      const submitBtn = root.querySelector('.login-submit')!;
      const footer = root.querySelector('.login-footer')!;

      // Set initial hidden states
      utils.set(card, { opacity: 0, translateY: 40 });
      utils.set([logo, brandTitle, brandSub], { opacity: 0 });
      utils.set(divider, { opacity: 0, scaleX: 0 });
      utils.set([heading, subtext], { opacity: 0, translateY: 10 });
      utils.set(fields, { opacity: 0, translateY: 16 });
      utils.set(submitBtn, { opacity: 0, scale: 0.92 });
      utils.set(footer, { opacity: 0, translateY: 8 });

      /* Phase 1: Logo spring scale with slight rotate */
      animate(logo, {
        opacity: [0, 1],
        scale: [0.8, 1],
        rotate: [-8, 0],
        duration: 800,
        ease: spring({ stiffness: 200, damping: 15 }),
        delay: 100,
      });

      /* Phase 2: Brand text fades in */
      animate([brandTitle, brandSub], {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: stagger(80, { start: 300 }),
        duration: 500,
        ease: 'out(3)',
      });

      /* Phase 3: Card slide-up with spring */
      animate(card, {
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 900,
        ease: spring({ stiffness: 120, damping: 18 }),
        delay: 150,
      });

      /* Phase 4: Divider draws in */
      animate(divider, {
        opacity: [0, 1],
        scaleX: [0, 1],
        duration: 600,
        ease: 'out(3)',
        delay: 450,
      });

      /* Phase 5: Heading + subtext */
      animate([heading, subtext], {
        opacity: [0, 1],
        translateY: [10, 0],
        delay: stagger(60, { start: 550 }),
        duration: 450,
        ease: 'out(3)',
      });

      /* Phase 6: Form fields stagger */
      animate(fields, {
        opacity: [0, 1],
        translateY: [16, 0],
        delay: stagger(80, { start: 650 }),
        duration: 450,
        ease: 'out(3)',
      });

      /* Phase 7: Submit button springs in */
      animate(submitBtn, {
        opacity: [0, 1],
        scale: [0.92, 1],
        duration: 700,
        ease: spring({ stiffness: 180, damping: 14 }),
        delay: 850,
      });

      /* Phase 8: Footer fades up */
      animate(footer, {
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 400,
        ease: 'out(3)',
        delay: 950,
      });
    });

    return () => {
      scope.revert();
    };
  }, []);

  /* ── Submit button press feedback ────────────────────────────────────── */
  const handleSubmitPress = () => {
    if (submitting) return;
    const btn = rootRef.current?.querySelector('.login-submit');
    if (!btn) return;
    if (prefersReduced) return;
    animate(btn, {
      scale: [1, 0.97, 1],
      duration: 300,
      ease: spring({ stiffness: 300, damping: 15 }),
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    handleSubmitPress();
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
    <div className="login-page" ref={rootRef}>
      <div className="login-card">
        <form className="login-form" onSubmit={submit}>
          <div className="login-brand">
            <div className="brand-logo">
              <img src="/assets/logo.avif" alt="TingTing Logo" />
            </div>
            <h1>TingTing</h1>
            <p>Hệ thống Quản lý Vận tải</p>
            <img
              src="/assets/illustrations/empty-welcome.svg"
              alt=""
              aria-hidden="true"
              className="login-welcome-illustration"
            />
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
        &copy; {new Date().getFullYear()} TingTing &middot; Hải Phòng
      </p>
    </div>
  );
}
