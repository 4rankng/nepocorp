import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Role } from '@nepocorp/shared';

export type ApprovalItemType =
  | 'ancillaryFees'
  | 'debtOffsets'
  | 'advances'
  | 'advanceSettlementsCheck'
  | 'advanceSettlementsApprove';

export interface ApprovalQueueItem {
  id: string;
  type: ApprovalItemType;
  title: string;
  subtitle: string;
  amount: number;
  requestedAt: string;
  href: string;
  severity: 'normal' | 'urgent';
}

export interface ApprovalQueueResponse {
  total: number;
  byType: Record<ApprovalItemType, number>;
  items: ApprovalQueueItem[];
}

const EMPTY: ApprovalQueueResponse = {
  total: 0,
  byType: {
    ancillaryFees: 0,
    debtOffsets: 0,
    advances: 0,
    advanceSettlementsCheck: 0,
    advanceSettlementsApprove: 0,
  },
  items: [],
};

const APPROVER_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT];

export function canSeeApprovalQueue(role: Role | undefined): boolean {
  return !!role && APPROVER_ROLES.includes(role);
}

export function useApprovalQueue(role: Role | undefined, userId?: number) {
  const enabled = canSeeApprovalQueue(role);
  return useQuery<ApprovalQueueResponse>({
    queryKey: ['approval-queue', role, userId],
    queryFn: () => api.get<ApprovalQueueResponse>('/dashboard/approval-queue'),
    enabled,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: EMPTY,
  });
}
