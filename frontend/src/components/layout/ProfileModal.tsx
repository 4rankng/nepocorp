import React from 'react';
import { Modal, FormGroup } from '../UI';
import { User, Mail, Phone, UserCheck } from 'lucide-react';
import type { ProfileModalProps } from './types';

const errorBoxStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: '#FEF2F2',
  borderRadius: 8,
  color: 'var(--danger)',
  fontSize: 13,
  marginBottom: 16,
};

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
        <div style={errorBoxStyle}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormGroup label="Tên đăng nhập">
          <div className="input-icon">
            <User size={16} />
            <input
              className="input"
              value={form.username}
              onChange={e => onFormChange({ ...form, username: e.target.value })}
              placeholder="username"
            />
          </div>
        </FormGroup>
        <FormGroup label="Họ và tên">
          <div className="input-icon">
            <UserCheck size={16} />
            <input
              className="input"
              value={form.fullName}
              onChange={e => onFormChange({ ...form, fullName: e.target.value })}
              placeholder="Nguyễn Văn A"
            />
          </div>
        </FormGroup>
        <FormGroup label="Email">
          <div className="input-icon">
            <Mail size={16} />
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={e => onFormChange({ ...form, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
        </FormGroup>
        <FormGroup label="Số điện thoại">
          <div className="input-icon">
            <Phone size={16} />
            <input
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
