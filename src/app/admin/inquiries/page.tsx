'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Trash2,
  ExternalLink,
  MessageSquare,
  Loader2,
  Tag,
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface ContactInquiryItem {
  id: string;
  name: string;
  email: string;
  company: string | null;
  category: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'responded' | 'closed';
  admin_notes: string | null;
  responded_at: string | null;
  responded_by: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<ContactInquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected for Detail / Notes Modal
  const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiryItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<'new' | 'in_progress' | 'responded' | 'closed'>('new');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchInquiries = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/inquiries?${params.toString()}`);
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      if (data.success) {
        setInquiries(data.inquiries || []);
      }
    } catch (err) {
      console.error('[Fetch Inquiries Error]:', err);
      toast.error('Failed to load contact leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInquiries();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchInquiries]);

  const handleOpenDetail = (inq: ContactInquiryItem) => {
    setSelectedInquiry(inq);
    setAdminNotes(inq.admin_notes || '');
    setInquiryStatus(inq.status);
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedInquiry.id,
          status: inquiryStatus,
          adminNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update inquiry');

      toast.success('Inquiry record updated');
      setSelectedInquiry(null);
      fetchInquiries(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating inquiry';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (inq: ContactInquiryItem) => {
    if (!confirm(`Delete inquiry from "${inq.name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/inquiries?id=${inq.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      toast.success('Inquiry deleted');
      fetchInquiries(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
            Contact Leads & Public Inquiries
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time inbox for website sales inquiries, demo requests, technical support, and billing questions submitted via /contact.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={refreshing}
          onClick={() => fetchInquiries()}
          className="h-9 rounded-xl border-border text-xs flex items-center gap-1.5 bg-card"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-card/60 p-4 rounded-2xl border border-border/80">
        <div className="relative flex-1 w-full">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by prospect name, email, company, subject, or message content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl border-border bg-card text-xs focus-visible:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="sales">Sales & Demo</SelectItem>
              <SelectItem value="support">Tech Support</SelectItem>
              <SelectItem value="billing">Billing / Plans</SelectItem>
              <SelectItem value="technical">API & Dev</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'all')}>
            <SelectTrigger className="h-10 w-full sm:w-36 rounded-xl border-border bg-card text-xs">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New (Unread)</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="responded">Responded</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="rounded-2xl border border-border bg-card/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="text-xs font-bold text-foreground">Lead / Prospect</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Category</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Subject & Message Preview</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Status</TableHead>
                <TableHead className="text-xs font-bold text-foreground">Received Date</TableHead>
                <TableHead className="text-xs font-bold text-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 text-xs">
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-emerald-400 mb-2" />
                    <span>Loading contact inquiries...</span>
                  </TableCell>
                </TableRow>
              ) : inquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No contact inquiries found.
                  </TableCell>
                </TableRow>
              ) : (
                inquiries.map((inq) => (
                  <TableRow key={inq.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3">
                      <div>
                        <div className="font-bold text-foreground">{inq.name}</div>
                        <div className="text-[11px] text-muted-foreground">{inq.email}</div>
                        {inq.company && (
                          <div className="text-[10px] text-blue-400 font-medium">{inq.company}</div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold bg-muted/60">
                        {inq.category}
                      </Badge>
                    </TableCell>

                    <TableCell className="max-w-md">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground truncate">{inq.subject}</div>
                        <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {inq.message}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                          inq.status === 'new'
                            ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 animate-pulse'
                            : inq.status === 'responded'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : inq.status === 'in_progress'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                        }`}
                      >
                        {inq.status}
                      </span>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap">
                      {new Date(inq.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetail(inq)}
                          className="h-8 px-2.5 rounded-xl border-border bg-card text-xs font-semibold"
                        >
                          View & Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(inq)}
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

      {/* Inquiry Detail & Reply Modal */}
      <Dialog open={Boolean(selectedInquiry)} onOpenChange={(open) => !open && setSelectedInquiry(null)}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              Inquiry Details: {selectedInquiry?.subject}
            </DialogTitle>
          </DialogHeader>

          {selectedInquiry && (
            <form onSubmit={handleSaveNotes} className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">From</span>
                  <strong className="text-foreground text-xs">{selectedInquiry.name}</strong>
                  <div className="text-blue-400">{selectedInquiry.email}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Company / Dept</span>
                  <strong className="text-foreground text-xs">{selectedInquiry.company || 'Not Specified'}</strong>
                  <div className="text-muted-foreground uppercase text-[10px]">{selectedInquiry.category}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Full Message</Label>
                <div className="p-3 rounded-2xl bg-muted/20 border border-border/80 text-foreground leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedInquiry.message}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Inquiry Status</Label>
                  <Select
                    value={inquiryStatus}
                    onValueChange={(val) => setInquiryStatus(val as 'new' | 'in_progress' | 'responded' | 'closed')}
                  >
                    <SelectTrigger className="h-10 rounded-xl border-border bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New (Unread)</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <a
                    href={`mailto:${selectedInquiry.email}?subject=Re: ${encodeURIComponent(selectedInquiry.subject)}`}
                    className="inline-flex items-center justify-center gap-1.5 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20"
                  >
                    <Mail className="size-3.5" />
                    <span>Send Email to Prospect</span>
                  </a>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Internal Admin Notes</Label>
                <Textarea
                  rows={3}
                  placeholder="Add internal notes about this lead, deal size, or team follow-up..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="rounded-xl border-border bg-card text-xs text-foreground"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedInquiry(null)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {actionLoading ? 'Saving...' : 'Save Notes & Status'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
