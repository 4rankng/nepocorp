import React from 'react';
import { Modal, FormGroup } from '../UI';
import { Alert } from '../shared/Alert';
import { User, Mail, Phone, UserCheck, AlertCircle } from 'lucide-react';
import type { ProfileModalProps } from './types';

function ProfileModal({
  isOpen,
  onClose,
  saving,
  error,
  form,
  onFormChange,
  onSave,
}: ProfileModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Thông tin cá nhân"
      onClose={onClose}
      onConfirm={onSave}
      footer={
        <>
          <button className="btn btn--secondary btn--sm" onClick={onClose}>Hủy</button>
          <button className="btn btn--primary btn--sm" onClick={onSave} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </>
      }
    >
      {error && (
        <Alert
          variant="error"
          style="soft"
          icon={<AlertCircle size={16} />}
          className="mb-4"
        >
          {error}
        </Alert>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGroup label="Tên đăng nhập" htmlFor="profile-username">
          <div className="input-icon">
            <User size={16} />
            <input
              id="profile-username"
              autoComplete="username"
              spellCheck={false}
              className="input"
              value={form.username}
              onChange={e => onFormChange({ ...form, username: e.target.value })}
              placeholder="username"
            />
          </div>
        </FormGroup>
        <FormGroup label="Họ và tên" htmlFor="profile-full-name">
          <div className="input-icon">
            <UserCheck size={16} />
            <input
              id="profile-full-name"
              autoComplete="name"
              className="input"
              value={form.fullName}
              onChange={e => onFormChange({ ...form, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </div>
        </FormGroup>
        <FormGroup label="Email" htmlFor="profile-email">
          <div className="input-icon">
            <Mail size={16} />
            <input
              id="profile-email"
              autoComplete="email"
              spellCheck={false}
              className="input"
              type="email"
              value={form.email}
              onChange={e => onFormChange({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
        </FormGroup>
        <FormGroup label="Số điện thoại" htmlFor="profile-phone">
          <div className="input-icon">
            <Phone size={16} />
            <input
              id="profile-phone"
              type="tel"
              autoComplete="tel"
              className="input"
              value={form.phone}
              onChange={e => onFormChange({ ...form, phone: e.target.value })}
              placeholder="0912345678"
            />
          </div>
        </FormGroup>
      </div>
    </Modal>
  );
}

export { ProfileModal };
