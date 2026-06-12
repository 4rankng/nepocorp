import { api } from '../lib/api';
import { AUTH } from '@tingting/shared';
import type { UserRow } from '../features/users/utils';

export const userClient = {
  getUsers: async () => {
    return api.get<{ items: UserRow[] }>(AUTH.USERS);
  },

  getUser: async (id: number) => {
    return api.get<any>(AUTH.USER(id));
  },

  createUser: async (data: unknown) => {
    return api.post<any>(AUTH.USERS, data);
  },

  updateUser: async (id: number, data: unknown) => {
    return api.patch<any>(AUTH.USER(id), data);
  },

  deleteUser: async (id: number) => {
    return api.delete<any>(AUTH.USER(id));
  },
};
