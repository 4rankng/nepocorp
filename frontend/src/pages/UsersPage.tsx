import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Role } from '@tingting/shared';
import type { Truck } from '@tingting/shared';
import { useAuth } from '../hooks/useAuth';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import { useUsers } from '../hooks/useCatalogQueries';
import { configClient } from '../api/configClient';
import { useUserMutations } from '../features/users/hooks/useUserMutations';
import { UserTable } from '../features/users/components/UserTable';
import { AddPanel, EditPanel } from '../features/users/components/UserForm';
import type { UserRow, FilterKey } from '../features/users/utils';
import { usePageAnimations } from '../hooks/animations';
import '../features/users/users.css';

export default function UsersPage() {
  const { user: me } = useAuth();
  const canManage = me?.capabilities
    ? me.capabilities.includes('manage_users')
    : me?.role === Role.ADMIN || me?.role === Role.MANAGER;
  const canDelete = me?.role === Role.ADMIN;
  // Accountants get scoped /users access: read-only except DRIVER rows (salary/truck/contact).
  const canEditDriversOnly = !canManage && me?.role === Role.ACCOUNTANT;

  // ── List state: tabs, search, sort, pagination — all resolved server-side ──
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Sorting and pagination state
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'status' | 'date' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Debounce search so each keystroke doesn't fire a server round-trip.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Any tab/sort/search change returns to page 1 of the new result set.
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filter, sortBy, sortOrder]);

  const { data: usersData, isLoading: loading, refetch: refetchUsers } = useUsers({
    page: currentPage,
    limit: pageSize,
    search: debouncedSearch,
    filter,
    sortBy: sortBy ?? undefined,
    sortOrder,
  });
  const { rootRef } = usePageAnimations({ ready: !loading });
  const users = useMemo(() => (usersData?.items ?? []) as UserRow[], [usersData]);
  // KPI counts come from the server (unfiltered visibility set).
  const counts = usersData?.counts ?? { total: 0, staff: 0, driver: 0, inactive: 0 };
  const filteredTotal = usersData?.total ?? 0;

  // Load trucks once for the driver "Xe phân công" field + the table "Xe" plate column.
  // Shares cache with useTrucksAndDrivers by using a common query key prefix.
  const { data: truckList = [] } = useQuery<Truck[]>({
    // eslint-disable-next-line @tingting/no-bare-query-key -- standalone trucks list; no matching qk domain key exists
    queryKey: ['trucks'],
    queryFn: () => configClient.getTrucks(),
    staleTime: 5 * 60 * 1000,
  });
  const truckMap = useMemo(() => {
    const m = new Map<number, string>();
    truckList.forEach(t => m.set(t.id, t.licensePlate));
    return m;
  }, [truckList]);

  const {
    saving, panelError, deleting, confirmDialog,
    doCreate, doUpdate, doDelete, clearPanelError,
  } = useUserMutations(refetchUsers);

  const handleFilterChange = (f: FilterKey) => {
    setFilter(f);
    setCurrentPage(1);
  };

  const handleSearchChange = (s: string) => {
    setSearch(s);
    setCurrentPage(1);
  };

  const handleSort = (field: 'name' | 'role' | 'status' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

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
    <div className="users-admin-page" style={{ paddingBottom: 40 }} ref={rootRef}>
      <Breadcrumbs
        className="users-admin-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Người dùng' },
        ]}
      />
      <UserTable
        paginated={users}
        filteredTotal={filteredTotal}
        total={counts.total}
        staffCount={counts.staff}
        driverCount={counts.driver}
        inactiveCount={counts.inactive}
        filter={filter}
        search={search}
        canManage={canManage}
        canDelete={canDelete}
        canEditDriversOnly={canEditDriversOnly}
        truckMap={truckMap}
        deleting={deleting}
        currentUserId={me?.userId}
        onFilterChange={handleFilterChange}
        onSearchChange={handleSearchChange}
        onEdit={openEdit}
        onDelete={doDelete}
        onAdd={openAdd}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        currentPage={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />

      <AddPanel
        isOpen={showAdd}
        saving={saving}
        error={panelError}
        truckList={truckList}
        onClose={closeAdd}
        onSave={doCreate}
      />
      {editingUser && (
        <EditPanel
          isOpen={!!editingUser}
          user={editingUser}
          isMe={editingUser.id === me?.userId}
          saving={saving}
          error={panelError}
          truckList={truckList}
          canEditDriversOnly={canEditDriversOnly}
          onClose={closeEdit}
          onSave={doUpdate}
        />
      )}

      {confirmDialog}
    </div>
  );
}
