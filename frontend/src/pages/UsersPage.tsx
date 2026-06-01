import { useState, useMemo } from 'react';
import { Role } from '@nepocorp/shared';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useCatalogQueries';
import { useUserMutations } from '../features/users/hooks/useUserMutations';
import { UserTable } from '../features/users/components/UserTable';
import { AddPanel, EditPanel } from '../features/users/components/UserForm';
import type { UserRow, FilterKey } from '../features/users/utils';

export default function UsersPage() {
  const { user: me } = useAuth();
  const canManage = me?.capabilities
    ? me.capabilities.includes('manage_users')
    : me?.role === Role.ADMIN || me?.role === Role.MANAGER;

  const { data: usersData, isLoading: loading, refetch: refetchUsers } = useUsers();
  const users = (usersData?.items ?? []) as UserRow[];

  const {
    saving, panelError, deleting, confirmDialog,
    doCreate, doUpdate, doDelete, clearPanelError,
  } = useUserMutations(refetchUsers);

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  const { total, staffCount, driverCount, inactiveCount, filtered } = useMemo(() => {
    const total        = users.length;
    const staffCount   = users.filter(u => u.role !== Role.DRIVER).length;
    const driverCount  = users.filter(u => u.role === Role.DRIVER).length;
    const inactiveCount = users.filter(u => u.status !== 'ACTIVE').length;
    const filtered = users
      .filter(u => filter === 'all' || u.role === filter)
      .filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (u.username || '').toLowerCase().includes(q)
          || (u.fullName || '').toLowerCase().includes(q)
          || (u.email || '').toLowerCase().includes(q)
          || (u.phone || '').includes(q);
      });
    return { total, staffCount, driverCount, inactiveCount, filtered };
  }, [users, filter, search]);

  const openEdit = (u: UserRow) => { clearPanelError(); setEditingUser(u); setShowAdd(false); };
  const openAdd  = () => { clearPanelError(); setShowAdd(true); setEditingUser(null); };
  const closeAdd  = () => { setShowAdd(false); clearPanelError(); };
  const closeEdit = () => { setEditingUser(null); clearPanelError(); };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spin" style={{ width: 28, height: 28, border: '3px solid var(--line-2)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ paddingBottom: 40 }}>
      <UserTable
        users={users}
        filtered={filtered}
        total={total}
        staffCount={staffCount}
        driverCount={driverCount}
        inactiveCount={inactiveCount}
        filter={filter}
        search={search}
        canManage={canManage}
        deleting={deleting}
        currentUserId={me?.userId}
        onFilterChange={setFilter}
        onSearchChange={setSearch}
        onEdit={openEdit}
        onDelete={doDelete}
        onAdd={openAdd}
      />

      {showAdd && (
        <AddPanel
          saving={saving}
          error={panelError}
          onClose={closeAdd}
          onSave={doCreate}
        />
      )}
      {editingUser && (
        <EditPanel
          user={editingUser}
          isMe={editingUser.id === me?.userId}
          saving={saving}
          error={panelError}
          onClose={closeEdit}
          onSave={doUpdate}
        />
      )}

      {confirmDialog}
    </div>
  );
}
