import React from 'react';
import { Modal, FormGroup } from '../UI';
import type { PasswordModalProps } from './types';

const errorBoxStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: '#FEF2F2',
  borderRadius: 8,
  color: 'var(--danger)',
  fontSize: 13,
  marginBottom: 16,
};

function PasswordModal({
  isOpen,
  onClose,
  saving,
  error,
  form,
  onFormChange,
  onSave,
}: PasswordModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title="Đổi mật khẩu"
      onClose={onClose}
      onConfirm={onSave}
      footer={
        <>
          <button className="btn btn--secondary btn--sm" onClick={onClose}>Hủy</button>
          <button className="btn btn--primary btn--sm" onClick={onSave} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Đổi mật khẩu'}
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
        <FormGroup label="Mật khẩu hiện tại">
          <input
            className="input"
            type="password"
            value={form.currentPassword}
            onChange={e => onFormChange({ ...form, currentPassword: e.target.value })}
            placeholder="Nhập mật khẩu hiện tại"
          />
        </FormGroup>
        <FormGroup label="Mật khẩu mới">
          <input
            className="input"
            type="password"
            value={form.newPassword}
            onChange={e => onFormChange({ ...form, newPassword: e.target.value })}
            placeholder="Ít nhất 6 ký tự"
          />
        </FormGroup>
        <FormGroup label="Xác nhận mật khẩu mới">
          <input
            className="input"
            type="password"
            value={form.confirmPassword}
            onChange={e => onFormChange({ ...form, confirmPassword: e.target.value })}
            placeholder="Nhập lại mật khẩu mới"
          />
        </FormGroup>
      </div>
    </Modal>
  );
}

export { PasswordModal };
