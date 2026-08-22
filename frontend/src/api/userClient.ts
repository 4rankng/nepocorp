import { api } from '../lib/api';
import { toQuery } from '../lib/http/query';
import { AUTH } from '@tingting/shared';
import type { UserRow } from '../features/users/utils';

/** Paginated /users envelope — KPI counts aggregate over the unfiltered visibility set. */
export interface UsersPage {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  counts: { total: number; staff: number; driver: number; inactive: number };
}

export interface UsersPageParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Role tab: a Role value or 'all'. */
  filter?: string;
  sortBy?: 'name' | 'role' | 'status' | 'date';
  sortOrder?: 'asc' | 'desc';
}

export const userClient = {
  getUsers: async (params?: UsersPageParams) => {
    return api.get<UsersPage>(`${AUTH.USERS}${toQuery({
      page: params?.page,
      limit: params?.limit,
      search: params?.search,
      filter: params?.filter,
      sortBy: params?.sortBy,
      sortOrder: params?.sortOrder,
    })}`);
  },

  getUser: async (id: number) => {
    return api.get<UserRow>(AUTH.USER(id));
  },

  createUser: async (data: unknown) => {
    return api.post<UserRow>(AUTH.USERS, data);
  },

  updateUser: async (id: number, data: unknown) => {
    return api.patch<UserRow>(AUTH.USER(id), data);
  },

  deleteUser: async (id: number) => {
    return api.delete<UserRow>(AUTH.USER(id));
  },
};
