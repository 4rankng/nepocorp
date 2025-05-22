// contexts/roleContext.js
// Context lưu trữ vai trò người dùng
import { createContext, useContext, useState } from 'react';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [role, setRole] = useState('');
  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return useContext(RoleContext);
}
