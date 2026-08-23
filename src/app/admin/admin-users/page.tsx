'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  Shield,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AdminRole, AdminUser } from '@/lib/admin/types';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('admin');

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('admin');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editPassword, setEditPassword] = useState('');

  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdminUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/admin-users');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAdminUsers(data.adminUsers || []);
      }
    } catch (err) {
      console.error('[Fetch Admin Users Error]:', err);
      toast.error('Failed to load admin personnel');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminUsers();
  }, [fetchAdminUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');

      toast.success(`Admin user "${newFullName}" created`);
      setCreateModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      fetchAdminUsers(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating admin';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditRole(user.role);
    setEditStatus(user.status);
    setEditPassword('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/admin-users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          fullName: editFullName,
          role: editRole,
          status: editStatus,
          password: editPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update admin');

      toast.success(`Admin "${editFullName}" updated`);
      setEditModalOpen(false);
      fetchAdminUsers(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating admin';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`Are you sure you want to remove admin account "${user.fullName}"?`)) return;

    try {
      const res = await fetch(`/api/admin/admin-users?id=${user.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      toast.success('Admin user removed');
      fetchAdminUsers(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete admin';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Admin Personnel & Granular RBAC
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Manage administrative staff with granular role permissions: Super Admin, Admin, Support Manager, Support Agent, Billing Manager, and Tech Manager.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => fetchAdminUsers()}
            className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            <span>Add Admin Staff</span>
          </Button>
        </div>
      </div>

      {/* Admin Users Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Admin Name & Email</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Role</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Last Login</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Created Date</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading administrative roster...</span>
                  </TableCell>
                </TableRow>
              ) : adminUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No custom admin users in database yet (environment superadmin active).
                  </TableCell>
                </TableRow>
              ) : (
                adminUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3">
                      <div>
                        <div className="font-bold text-foreground">{user.fullName}</div>
                        <div className="text-[11px] text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'super_admin'
                            ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                            : user.role === 'admin'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          user.status === 'active'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-[11px]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(user)}
                          className="h-8 px-2 rounded-xl border-border bg-card text-muted-foreground hover:text-foreground text-xs"
                        >
                          <Edit2 className="size-3.5 text-emerald-400" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user)}
                          className="h-8 px-2 rounded-xl border-border bg-card text-muted-foreground hover:text-rose-500 text-xs"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Add Admin Staff Member
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Full Name *</Label>
              <Input
                placeholder="e.g. Sarah Jenkins"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Admin Email *</Label>
              <Input
                type="email"
                placeholder="sarah@support.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Master Password *</Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Role & Access Level</Label>
              <Select value={newRole} onValueChange={(val) => setNewRole(val as AdminRole)}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin (Full Access)</SelectItem>
                  <SelectItem value="admin">Admin (Client, Plans & AI)</SelectItem>
                  <SelectItem value="support_manager">Support Manager (Inbox & Client View)</SelectItem>
                  <SelectItem value="support_agent">Support Agent (Inbox Read-only)</SelectItem>
                  <SelectItem value="billing_manager">Billing Manager (Payments & Plans)</SelectItem>
                  <SelectItem value="tech_manager">Technical Manager (Health & Logs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {actionLoading ? 'Creating...' : 'Create Admin Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Edit Admin: {editingUser?.fullName}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Full Name</Label>
              <Input
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Role</Label>
              <Select value={editRole} onValueChange={(val) => setEditRole(val as AdminRole)}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="support_manager">Support Manager</SelectItem>
                  <SelectItem value="support_agent">Support Agent</SelectItem>
                  <SelectItem value="billing_manager">Billing Manager</SelectItem>
                  <SelectItem value="tech_manager">Technical Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Status</Label>
              <Select value={editStatus} onValueChange={(val) => setEditStatus(val as 'active' | 'suspended')}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Change Password (Leave blank to keep current)</Label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {actionLoading ? 'Saving...' : 'Save Admin Details'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
