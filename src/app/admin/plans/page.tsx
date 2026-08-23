'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Plus,
  RefreshCw,
  Edit2,
  Check,
  X,
  Users,
  MessageSquare,
  Radio,
  Sparkles,
  Zap,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface PlanFeatureRow {
  id?: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  limit_value?: number | null;
}

interface PlanItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  contact_limit: number | null;
  monthly_message_limit: number | null;
  whatsapp_connection_limit: number | null;
  is_active: boolean;
  features?: PlanFeatureRow[];
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPrice, setEditPrice] = useState('0');
  const [editName, setEditName] = useState('');
  const [editContactLimit, setEditContactLimit] = useState('');
  const [editMessageLimit, setEditMessageLimit] = useState('');
  const [editWaLimit, setEditWaLimit] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState('');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState('999');
  const [newContactLimit, setNewContactLimit] = useState('2000');
  const [newWaLimit, setNewWaLimit] = useState('2');

  const fetchPlans = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const res = await fetch('/api/admin/plans');
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('[Fetch Plans Error]:', err);
      toast.error('Failed to load database plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditPrice(String(plan.price));
    setEditContactLimit(plan.contact_limit ? String(plan.contact_limit) : '');
    setEditMessageLimit(plan.monthly_message_limit ? String(plan.monthly_message_limit) : '');
    setEditWaLimit(plan.whatsapp_connection_limit ? String(plan.whatsapp_connection_limit) : '');
    setEditIsActive(plan.is_active);
    setEditModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPlan.id,
          name: editName,
          price: Number(editPrice),
          contactLimit: editContactLimit ? Number(editContactLimit) : null,
          monthlyMessageLimit: editMessageLimit ? Number(editMessageLimit) : null,
          whatsappConnectionLimit: editWaLimit ? Number(editWaLimit) : null,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');

      toast.success(`Plan "${editName}" updated successfully in database`);
      setEditModalOpen(false);
      fetchPlans(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating plan';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newPlanId.toLowerCase().trim(),
          name: newPlanName,
          price: Number(newPlanPrice),
          contactLimit: newContactLimit ? Number(newContactLimit) : null,
          whatsappConnectionLimit: newWaLimit ? Number(newWaLimit) : 1,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create plan');

      toast.success(`Plan "${newPlanName}" created successfully`);
      setCreateModalOpen(false);
      setNewPlanId('');
      setNewPlanName('');
      fetchPlans(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating plan';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Database Subscription Plans
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure live plan pricing in INR, contact capacity, message quotas, WhatsApp numbers, and features dynamically.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={() => fetchPlans()}
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
            <span>Create Custom Plan</span>
          </Button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {loading ? (
          <div className="col-span-full py-16 text-center text-muted-foreground text-xs">
            <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
            <span>Loading database plans...</span>
          </div>
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col justify-between rounded-3xl border bg-card/70 p-6 shadow-md transition-all duration-200 hover:-translate-y-1 ${
                plan.id === 'pro'
                  ? 'border-blue-500/40 bg-gradient-to-b from-card via-card to-blue-950/20 shadow-blue-500/5'
                  : plan.id === 'business'
                  ? 'border-emerald-500/40 bg-gradient-to-b from-card via-card to-emerald-950/20 shadow-emerald-500/5'
                  : plan.id === 'enterprise'
                  ? 'border-purple-500/40 bg-gradient-to-b from-card via-card to-purple-950/20 shadow-purple-500/5'
                  : 'border-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    variant="outline"
                    className="font-bold text-[10px] uppercase tracking-wider border-border bg-muted/40"
                  >
                    {plan.id}
                  </Badge>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      plan.is_active
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Disabled'}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>

                <div className="my-4 pb-4 border-b border-border">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground">
                      ₹{plan.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>
                </div>

                {/* Limits */}
                <div className="space-y-2 text-xs mb-6">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5 text-blue-400" />
                      <span>Contact Limit:</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {plan.contact_limit ? plan.contact_limit.toLocaleString() : 'Unlimited'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MessageSquare className="size-3.5 text-emerald-400" />
                      <span>Monthly Messages:</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {plan.monthly_message_limit ? plan.monthly_message_limit.toLocaleString() : 'Unlimited*'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Radio className="size-3.5 text-purple-400" />
                      <span>WhatsApp Numbers:</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {plan.whatsapp_connection_limit ?? 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Plan Button */}
              <div className="pt-2">
                <Button
                  onClick={() => handleOpenEdit(plan)}
                  variant="outline"
                  className="w-full h-10 rounded-xl border-border text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Edit2 className="size-3.5 text-emerald-400" />
                  <span>Configure Limits & Price</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Plan Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Configure Plan: {editingPlan?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePlan} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Display Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Price in INR (₹)</Label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  required
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">WA Connection Limit</Label>
                <Input
                  type="number"
                  placeholder="Blank = Unlimited"
                  value={editWaLimit}
                  onChange={(e) => setEditWaLimit(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Contact Limit</Label>
                <Input
                  type="number"
                  placeholder="Blank = Unlimited"
                  value={editContactLimit}
                  onChange={(e) => setEditContactLimit(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Monthly Message Limit</Label>
                <Input
                  type="number"
                  placeholder="Blank = Unlimited"
                  value={editMessageLimit}
                  onChange={(e) => setEditMessageLimit(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
              <Label className="text-xs font-semibold text-foreground cursor-pointer">
                Plan Active for Customer Selection
              </Label>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
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
                {actionLoading ? 'Saving...' : 'Save Plan Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Plan Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Create New Custom Plan
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Plan ID / Slug (Unique) *</Label>
              <Input
                placeholder="e.g. startup_special"
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Plan Display Name *</Label>
              <Input
                placeholder="e.g. Startup Growth Tier"
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                required
                className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Price in INR (₹) *</Label>
                <Input
                  type="number"
                  value={newPlanPrice}
                  onChange={(e) => setNewPlanPrice(e.target.value)}
                  required
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Contact Limit</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2500"
                  value={newContactLimit}
                  onChange={(e) => setNewContactLimit(e.target.value)}
                  className="h-10 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
                />
              </div>
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
                {actionLoading ? 'Creating...' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
