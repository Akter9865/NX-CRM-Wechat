/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  BackgroundVariant,
  Panel,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  MessageSquare,
  Sparkles,
  Zap,
  Clock,
  Filter,
  Tag,
  Play,
  Send,
  FileText,
  UserCheck,
  Building,
  Plus,
  Trash2,
  Copy,
  Save,
  Loader2,
  Radio,
  Sliders,
  ArrowLeft,
  X,
  Layers,
  Upload,
  Search,
  Code2,
  Smartphone,
  Workflow,
  FileSpreadsheet,
  CreditCard,
  Mail,
  Calendar,
  Webhook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ============================================================
// Node Type Definitions & Metadata (n8n Style)
// ============================================================

export type FlowCategory = 'triggers' | 'actions' | 'logic' | 'ai' | 'crm';

export interface NodeTypeMeta {
  type: string;
  category: FlowCategory;
  title: string;
  description: string;
  icon: any;
  color: string;
  headerBg: string;
  accentBorder: string;
  defaultConfig: Record<string, any>;
}

export const NODE_LIBRARY: NodeTypeMeta[] = [
  // Triggers (Emerald Green)
  {
    type: 'trigger_message',
    category: 'triggers',
    title: 'Inbound WhatsApp Message',
    description: 'Fires when a customer sends any inbound message',
    icon: MessageSquare,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: { triggerType: 'any_message' },
  },
  {
    type: 'trigger_keyword',
    category: 'triggers',
    title: 'Keyword Match Trigger',
    description: 'Fires when customer message matches specific keywords',
    icon: Zap,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: { keywords: ['hi', 'hello', 'start', 'pricing'], matchType: 'contains' },
  },
  {
    type: 'trigger_tag',
    category: 'triggers',
    title: 'Tag Added Trigger',
    description: 'Fires when a tag is applied to a contact',
    icon: Tag,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: { tagName: 'VIP Lead' },
  },
  {
    type: 'trigger_interactive_reply',
    category: 'triggers',
    title: 'Button / List Click',
    description: 'Fires when a customer taps an interactive button or list item',
    icon: Radio,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: { buttonId: '' },
  },

  // Actions (Cobalt / Cyan Blue)
  {
    type: 'action_send_message',
    category: 'actions',
    title: 'Send WhatsApp Message',
    description: 'Send a formatted WhatsApp text with variable substitution',
    icon: Send,
    color: 'blue',
    headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
    accentBorder: 'hover:border-blue-500/50',
    defaultConfig: { message: 'Hello {{contact.name}}! Thank you for contacting us. How can we help you today?' },
  },
  {
    type: 'action_send_interactive',
    category: 'actions',
    title: 'Send Interactive Buttons',
    description: 'Send quick-reply buttons (up to 3) or list menus',
    icon: Radio,
    color: 'blue',
    headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
    accentBorder: 'hover:border-blue-500/50',
    defaultConfig: {
      bodyText: 'Please select an option below:',
      buttons: [
        { id: 'opt_sales', title: '💼 Sales & Pricing' },
        { id: 'opt_support', title: '🛠 Tech Support' },
        { id: 'opt_talk', title: '🗣 Talk to Human' },
      ],
    },
  },
  {
    type: 'action_send_template',
    category: 'actions',
    title: 'Send Meta Template',
    description: 'Send an approved Meta WhatsApp template with variables',
    icon: FileText,
    color: 'blue',
    headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
    accentBorder: 'hover:border-blue-500/50',
    defaultConfig: { templateName: 'welcome_greeting', language: 'en' },
  },

  // AI & Intelligence (Purple / Violet)
  {
    type: 'action_gemini_ai',
    category: 'ai',
    title: 'Gemini AI Smart Reply',
    description: 'Generate context-aware AI response from Knowledge Base',
    icon: Sparkles,
    color: 'purple',
    headerBg: 'from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30',
    accentBorder: 'hover:border-purple-500/50',
    defaultConfig: {
      systemPrompt: 'You are a friendly, helpful assistant for our CRM platform. Answer questions concisely and professionally.',
      model: 'gemini-1.5-flash',
      temperature: 0.7,
      fallbackToAgent: true,
    },
  },

  // Logic & Flow Control (Amber / Orange)
  {
    type: 'condition_match',
    category: 'logic',
    title: 'If / Else Condition',
    description: 'Branch the flow based on contact tags, text, or variables',
    icon: Filter,
    color: 'amber',
    headerBg: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    accentBorder: 'hover:border-amber-500/50',
    defaultConfig: {
      field: 'contact.tag',
      operator: 'contains',
      value: 'VIP',
    },
  },
  {
    type: 'delay_wait',
    category: 'logic',
    title: 'Delay / Wait Timer',
    description: 'Wait for a specified duration before continuing to next step',
    icon: Clock,
    color: 'amber',
    headerBg: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    accentBorder: 'hover:border-amber-500/50',
    defaultConfig: { durationMinutes: 15 },
  },

  // CRM Operations (Teal / Slate)
  {
    type: 'action_add_tag',
    category: 'crm',
    title: 'Assign Contact Tag',
    description: 'Add tags to classify and segment the contact in CRM',
    icon: Tag,
    color: 'teal',
    headerBg: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30',
    accentBorder: 'hover:border-teal-500/50',
    defaultConfig: { tag: 'Qualified Lead' },
  },
  {
    type: 'action_assign_agent',
    category: 'crm',
    title: 'Assign Team Member',
    description: 'Assign the conversation to a human agent or department',
    icon: UserCheck,
    color: 'teal',
    headerBg: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30',
    accentBorder: 'hover:border-teal-500/50',
    defaultConfig: { assignmentType: 'round_robin' },
  },
  {
    type: 'action_update_stage',
    category: 'crm',
    title: 'Update Pipeline Deal Stage',
    description: 'Move deal to a specific sales stage (e.g. Lead, In-Progress, Won)',
    icon: Building,
    color: 'teal',
    headerBg: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30',
    accentBorder: 'hover:border-teal-500/50',
    defaultConfig: { stageName: 'Discovery Call Scheduled' },
  },

  // Integrations & External Apps (Indigo / Emerald / Purple)
  {
    type: 'action_google_sheets',
    category: 'actions',
    title: 'Sync to Google Sheets',
    description: 'Auto-append customer name, phone, and qualified lead data to Google Sheet',
    icon: FileSpreadsheet,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: {
      sheetTab: 'WhatsApp Leads',
      syncFields: 'name,phone,email,notes,timestamp',
    },
  },
  {
    type: 'action_send_payment_link',
    category: 'actions',
    title: 'Send Razorpay/PhonePe Link',
    description: 'Generate and send instant UPI payment link inside WhatsApp chat',
    icon: CreditCard,
    color: 'blue',
    headerBg: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/30',
    accentBorder: 'hover:border-blue-500/50',
    defaultConfig: {
      gateway: 'razorpay',
      amount: 499,
      description: 'Pro Subscription Package',
    },
  },
  {
    type: 'action_email_alert',
    category: 'actions',
    title: 'Send Zoho/SMTP Email Alert',
    description: 'Dispatch an immediate email alert to sales reps or management',
    icon: Mail,
    color: 'purple',
    headerBg: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30',
    accentBorder: 'hover:border-purple-500/50',
    defaultConfig: {
      recipient: 'sales@yourdomain.com',
      subject: '🚨 Hot WhatsApp Lead: {{contact.name}}',
      body: 'A new high-priority lead has contacted us: {{contact.name}} ({{contact.phone}}).',
    },
  },
  {
    type: 'action_book_calendar',
    category: 'actions',
    title: 'Send Calendly Booking Link',
    description: 'Send direct consultation meeting scheduling link',
    icon: Calendar,
    color: 'amber',
    headerBg: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    accentBorder: 'hover:border-amber-500/50',
    defaultConfig: {
      calendarUrl: 'https://calendly.com/your-username/30min',
      inviteText: 'Please select a convenient time for our consultation: {{calendarUrl}}',
    },
  },
];

// Helper to look up metadata by type
export function getNodeMeta(type: string): NodeTypeMeta {
  return (
    NODE_LIBRARY.find((n) => n.type === type) || {
      type,
      category: 'actions',
      title: 'Workflow Step',
      description: 'Custom workflow action',
      icon: Layers,
      color: 'blue',
      headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
      accentBorder: 'hover:border-blue-500/50',
      defaultConfig: {},
    }
  );
}

// ============================================================
// n8n-Style Custom Node Component
// ============================================================

function CustomWorkflowNode({ data, id, selected }: NodeProps) {
  const meta = useMemo(() => getNodeMeta(data.type as string), [data.type]);
  const isTrigger = meta.category === 'triggers';
  const isCondition = data.type === 'condition_match';
  const Icon = meta.icon;

  const nodeData = data as {
    label?: string;
    type: string;
    config: Record<string, any>;
    onConfigure?: (id: string) => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onQuickAdd?: (id: string, handleId?: string) => void;
    isExecuting?: boolean;
    hasExecuted?: boolean;
  };

  // Preview snippet of the config
  const previewSnippet = useMemo(() => {
    const cfg = nodeData.config || {};
    if (data.type === 'trigger_keyword') {
      const kw = Array.isArray(cfg.keywords) ? cfg.keywords.join(', ') : cfg.keywords || 'any';
      return `Keywords: "${kw}"`;
    }
    if (data.type === 'action_send_message') {
      return cfg.message ? `"${cfg.message.slice(0, 45)}..."` : 'No text configured';
    }
    if (data.type === 'action_send_interactive') {
      const count = cfg.buttons?.length || 0;
      return `${count} Button(s) configured`;
    }
    if (data.type === 'action_gemini_ai') {
      return `AI Model: ${cfg.model || 'gemini-1.5-flash'}`;
    }
    if (data.type === 'condition_match') {
      return `If ${cfg.field || 'field'} ${cfg.operator || '='} "${cfg.value || ''}"`;
    }
    if (data.type === 'delay_wait') {
      return `Wait for ${cfg.durationMinutes || 15} minute(s)`;
    }
    if (data.type === 'action_add_tag') {
      return `Tag: +[${cfg.tag || 'New Tag'}]`;
    }
    if (data.type === 'action_update_stage') {
      return `Stage: -> ${cfg.stageName || 'Next Stage'}`;
    }
    return meta.description;
  }, [data.type, nodeData.config, meta.description]);

  return (
    <div
      className={cn(
        'group relative min-w-[280px] max-w-[320px] rounded-2xl border bg-card/95 backdrop-blur-md transition-all duration-200 shadow-lg',
        selected
          ? 'ring-2 ring-primary border-primary shadow-primary/20 shadow-xl'
          : 'border-border/80 hover:border-border hover:shadow-xl',
        nodeData.isExecuting && 'ring-2 ring-amber-400 border-amber-400 shadow-amber-400/30 animate-pulse',
        nodeData.hasExecuted && 'ring-1 ring-emerald-500/60 border-emerald-500/60'
      )}
    >
      {/* Target Handle (Left) - Non-triggers only */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-3.5 !bg-primary/80 !border-2 !border-background hover:!scale-125 !transition-transform !shadow-sm"
        />
      )}

      {/* Node Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b px-3.5 py-2.5 rounded-t-2xl bg-gradient-to-r',
          meta.headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-background/80 shadow-xs">
            <Icon className="size-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-tight text-foreground block">
              {nodeData.label || meta.title}
            </span>
          </div>
        </div>

        {/* Action buttons on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onConfigure?.(id);
            }}
            title="Configure Node"
            className="p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sliders className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDuplicate?.(id);
            }}
            title="Duplicate"
            className="p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Copy className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onDelete?.(id);
            }}
            title="Delete"
            className="p-1 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div
        className="p-3.5 cursor-pointer"
        onClick={() => nodeData.onConfigure?.(id)}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed font-mono bg-muted/40 px-2 py-1.5 rounded-lg border border-border/40 w-full">
            {previewSnippet}
          </p>
        </div>
      </div>

      {/* Source Handles (Right) */}
      {isCondition ? (
        <>
          {/* True Branch (Top Right) */}
          <div className="absolute right-0 top-1/3 translate-x-1/2 flex items-center gap-1">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20 -translate-x-4 pointer-events-none">
              True
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              style={{ top: '33%' }}
              className="!size-3.5 !bg-emerald-500 !border-2 !border-background hover:!scale-125 !transition-transform !shadow-sm"
            />
          </div>

          {/* False Branch (Bottom Right) */}
          <div className="absolute right-0 top-2/3 translate-x-1/2 flex items-center gap-1">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/20 -translate-x-4 pointer-events-none">
              False
            </span>
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              style={{ top: '67%' }}
              className="!size-3.5 !bg-rose-500 !border-2 !border-background hover:!scale-125 !transition-transform !shadow-sm"
            />
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-3.5 !bg-primary/80 !border-2 !border-background hover:!scale-125 !transition-transform !shadow-sm"
        />
      )}
    </div>
  );
}

const nodeTypes = {
  customNode: CustomWorkflowNode,
};

// ============================================================
// Prebuilt Starter Workflow Templates
// ============================================================

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  nodes: Node[];
  edges: Edge[];
}

const PREBUILT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'welcome_lead_capture',
    name: '🚀 WhatsApp Instant Welcome & Lead Capture',
    category: 'Sales & Growth',
    description: 'Greets new customers, offers interactive menu options, tags qualified leads, and routes to sales.',
    icon: Zap,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          type: 'trigger_message',
          label: 'Customer Sends Inbound Message',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 180 },
        data: {
          type: 'action_send_interactive',
          label: 'Send Welcome Options',
          config: {
            bodyText: '👋 Welcome to NX CRM! How can our team help you today?',
            buttons: [
              { id: 'opt_pricing', title: '💼 View Pricing & Plans' },
              { id: 'opt_support', title: '🛠 Support Helpdesk' },
              { id: 'opt_agent', title: '🗣 Speak to Advisor' },
            ],
          },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 180 },
        data: {
          type: 'condition_match',
          label: 'Check Selected Option',
          config: { field: 'button.id', operator: 'equals', value: 'opt_pricing' },
        },
      },
      {
        id: 'node-4',
        type: 'customNode',
        position: { x: 1240, y: 80 },
        data: {
          type: 'action_send_message',
          label: 'Send Pricing Link',
          config: { message: 'Here is our pricing: Free (₹0), Pro (₹499), Business (₹3,000). Check it live on your dashboard!' },
        },
      },
      {
        id: 'node-5',
        type: 'customNode',
        position: { x: 1240, y: 280 },
        data: {
          type: 'action_add_tag',
          label: 'Tag as Active Lead',
          config: { tag: 'WhatsApp Inbound Lead' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
      { id: 'e3-4', source: 'node-3', sourceHandle: 'true', target: 'node-4', animated: true, type: 'smoothstep' },
      { id: 'e3-5', source: 'node-3', sourceHandle: 'false', target: 'node-5', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'gemini_ai_assistant',
    name: '🤖 24/7 Gemini AI Knowledge Base Auto-Reply',
    category: 'AI Automation',
    description: 'Uses Google Gemini AI to answer customer inquiries using your CRM knowledge base instantly.',
    icon: Sparkles,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          type: 'trigger_message',
          label: 'Customer Asks Question',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          type: 'action_gemini_ai',
          label: 'Generate Smart AI Answer',
          config: {
            systemPrompt: 'You are our official WhatsApp AI assistant. Provide concise, helpful answers.',
            model: 'gemini-1.5-flash',
            fallbackToAgent: true,
          },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 150 },
        data: {
          type: 'action_send_message',
          label: 'Dispatch AI Response',
          config: { message: '{{ai.response}}' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'after_hours_autoreply',
    name: '🌙 After-Hours & Weekend Auto-Responder',
    category: 'Support',
    description: 'Detects messages received outside working hours and sends instant expectations + follow-up tag.',
    icon: Clock,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          type: 'trigger_message',
          label: 'Inbound Message Received',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          type: 'action_send_message',
          label: 'Send Out-of-Office Notice',
          config: { message: 'Thank you for reaching out! Our team is currently offline. We will reply promptly at 9:00 AM.' },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 150 },
        data: {
          type: 'action_add_tag',
          label: 'Tag for Morning Follow-up',
          config: { tag: 'Follow Up: Morning Queue' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'google_sheets_lead_capture',
    name: '📊 Google Sheets Auto-Sync & Instant Lead Capture',
    category: 'Integrations & Leads',
    description: 'Captures new WhatsApp customer details, tags them as qualified, and appends a new row to Google Sheets in real-time.',
    icon: FileSpreadsheet,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          type: 'trigger_message',
          label: 'Customer Sends Inbound Message',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          type: 'action_add_tag',
          label: 'Tag as Qualified Lead',
          config: { tag: 'Google Sheets Synced' },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 150 },
        data: {
          type: 'action_google_sheets',
          label: 'Export Row to Google Sheets',
          config: {
            sheetTab: 'WhatsApp Leads',
            syncFields: 'name,phone,message,timestamp',
          },
        },
      },
      {
        id: 'node-4',
        type: 'customNode',
        position: { x: 1240, y: 150 },
        data: {
          type: 'action_send_message',
          label: 'Send Confirmation to Customer',
          config: { message: 'Hello {{contact.name}}! Thank you, our sales team has received your inquiry and will connect shortly.' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
      { id: 'e3-4', source: 'node-3', target: 'node-4', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'whatsapp_payment_collection',
    name: '💳 Instant WhatsApp Payment Collection (Razorpay / PhonePe)',
    category: 'Payments & Sales',
    description: 'Automatically generates a dynamic Razorpay/PhonePe payment link and sends it to the customer on WhatsApp.',
    icon: CreditCard,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          type: 'trigger_keyword',
          label: 'Customer Types "pay" or "buy"',
          config: { keywords: ['pay', 'buy', 'checkout', 'order', 'payment'], matchType: 'contains' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          type: 'action_send_payment_link',
          label: 'Generate UPI Payment Link',
          config: {
            gateway: 'razorpay',
            amount: 499,
            description: 'Order Payment',
          },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 150 },
        data: {
          type: 'action_send_message',
          label: 'Send Payment Instructions',
          config: { message: 'Please complete your secure payment here: {{payment.link}}\n\nOnce paid, your order will be activated immediately! 🚀' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'hot_lead_email_alert',
    name: '🚨 Hot Lead Instant Zoho / SMTP Email Notification',
    category: 'Integrations & Leads',
    description: 'Detects high-intent keywords and triggers an immediate Zoho/SMTP email alert to the sales manager.',
    icon: Mail,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          type: 'trigger_keyword',
          label: 'High-Intent Keywords ("urgent", "demo", "pricing")',
          config: { keywords: ['urgent', 'demo', 'pricing', 'enterprise', 'quote'], matchType: 'contains' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          type: 'action_email_alert',
          label: 'Send Zoho/SMTP Email Alert',
          config: {
            recipient: 'sales@yourdomain.com',
            subject: '🚨 URGENT WhatsApp Lead: {{contact.name}} ({{contact.phone}})',
            body: 'Customer {{contact.name}} is asking for urgent pricing/demo on WhatsApp.',
          },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 150 },
        data: {
          type: 'action_add_tag',
          label: 'Tag as Hot Priority',
          config: { tag: 'Hot Lead (Alert Sent)' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'calendly_appointment_scheduler',
    name: '📅 Automated Calendly & Google Calendar Meeting Scheduler',
    category: 'Booking & Meetings',
    description: 'Shares an appointment scheduling link for consultations when customers ask for a call.',
    icon: Calendar,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          type: 'trigger_keyword',
          label: 'Customer Asks for "call", "meet", "appointment"',
          config: { keywords: ['call', 'meet', 'appointment', 'consultation', 'schedule'], matchType: 'contains' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          type: 'action_book_calendar',
          label: 'Dispatch Calendar Booking Link',
          config: {
            calendarUrl: 'https://calendly.com/your-team/30min',
            inviteText: 'Hello {{contact.name}}! Please pick a convenient 30-minute slot on our calendar: {{calendarUrl}}',
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
    ],
  },
];

// ============================================================
// Main VisualFlowBuilder Component
// ============================================================

interface VisualFlowBuilderProps {
  automationId?: string;
  initialName?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialStatus?: 'draft' | 'published' | 'paused';
  initialData?: any;
}

export function VisualFlowBuilder({
  automationId,
  initialName = 'New Workflow Automation',
  initialNodes,
  initialEdges,
  initialStatus = 'draft',
  initialData,
}: VisualFlowBuilderProps) {
  const router = useRouter();
  const supabase = createClient();

  const effectiveName = initialData?.name || initialName;
  const effectiveStatus = (initialData?.status as 'draft' | 'published' | 'paused') || initialStatus;
  const rawNodes = initialData?.published_version?.nodes || initialData?.canvas_data?.nodes || initialNodes;
  const rawEdges = initialData?.published_version?.edges || initialData?.canvas_data?.edges || initialEdges;

  const [flowName, setFlowName] = useState(effectiveName);
  const [status, setStatus] = useState<'draft' | 'published' | 'paused'>(effectiveStatus);
  const [saving, setSaving] = useState(false);
  const [executingTest, setExecutingTest] = useState(false);

  // Modals & Panels State
  const [activeConfigNodeId, setActiveConfigNodeId] = useState<string | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonExportText, setJsonExportText] = useState('');
  const [searchLibraryQuery, setSearchLibraryQuery] = useState('');

  // Test Simulator Chat State
  const [simContactName, setSimContactName] = useState('Rahul Sharma');
  const [simContactPhone, setSimContactPhone] = useState('+91 98765 43210');
  const [simInputMessage, setSimInputMessage] = useState('Hi, I want to know your pricing');
  const [simChatMessages, setSimChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: 'Workflow test simulator ready. Send a message to test execution.', time: 'Just now' },
  ]);

  // Default Canvas Nodes if none provided
  const defaultInitialNodes: Node[] = useMemo(
    () => [
      {
        id: 'node-trigger-1',
        type: 'customNode',
        position: { x: 100, y: 200 },
        data: {
          type: 'trigger_message',
          label: 'Inbound WhatsApp Message',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-action-1',
        type: 'customNode',
        position: { x: 480, y: 200 },
        data: {
          type: 'action_send_message',
          label: 'Welcome Greeting',
          config: { message: 'Hello {{contact.name}}! Welcome to our WhatsApp channel. How can we help you today?' },
        },
      },
    ],
    []
  );

  const defaultInitialEdges: Edge[] = useMemo(
    () => [
      {
        id: 'e-trigger-action-1',
        source: 'node-trigger-1',
        target: 'node-action-1',
        animated: true,
        type: 'smoothstep',
        style: { stroke: 'var(--primary)', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary)' },
      },
    ],
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(rawNodes && rawNodes.length > 0 ? rawNodes : defaultInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges && rawEdges.length > 0 ? rawEdges : defaultInitialEdges);

  // Node action callbacks
  const handleConfigureNode = useCallback((id: string) => {
    setActiveConfigNodeId(id);
  }, []);

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
      if (activeConfigNodeId === id) setActiveConfigNodeId(null);
      toast.success('Step removed from workflow');
    },
    [setNodes, setEdges, activeConfigNodeId]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      setNodes((nds) => {
        const target = nds.find((n) => n.id === id);
        if (!target) return nds;
        const newId = `node-${Date.now()}`;
        const copy: Node = {
          ...target,
          id: newId,
          position: { x: target.position.x + 40, y: target.position.y + 60 },
          data: {
            ...target.data,
            label: `${target.data.label || 'Step'} (Copy)`,
          },
        };
        return [...nds, copy];
      });
      toast.success('Step duplicated');
    },
    [setNodes]
  );

  // Bind callback methods into node data
  const augmentedNodes = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onConfigure: handleConfigureNode,
        onDelete: handleDeleteNode,
        onDuplicate: handleDuplicateNode,
      },
    }));
  }, [nodes, handleConfigureNode, handleDeleteNode, handleDuplicateNode]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            type: 'smoothstep',
            style: { stroke: 'var(--primary)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--primary)' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Add node from library
  const handleAddNodeToCanvas = useCallback(
    (typeMeta: NodeTypeMeta) => {
      const newId = `node-${Date.now()}`;
      // Calculate sensible center position
      const xOffset = 250 + Math.random() * 80;
      const yOffset = 150 + Math.random() * 80;

      const newNode: Node = {
        id: newId,
        type: 'customNode',
        position: { x: xOffset, y: yOffset },
        data: {
          type: typeMeta.type,
          label: typeMeta.title,
          config: { ...typeMeta.defaultConfig },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setQuickAddOpen(false);
      toast.success(`Added ${typeMeta.title} to workflow canvas`);
    },
    [setNodes]
  );

  // Apply prebuilt template
  const handleApplyTemplate = useCallback(
    (tpl: WorkflowTemplate) => {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setFlowName(tpl.name);
      setTemplateGalleryOpen(false);
      toast.success(`Loaded "${tpl.name}" template!`);
    },
    [setNodes, setEdges]
  );

  // Save workflow to backend
  const handleSaveWorkflow = useCallback(async () => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        toast.error('Please log in to save workflows');
        return;
      }

      // Check account context
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();

      const accountId = profile?.account_id;
      if (!accountId) {
        toast.error('No active workspace account found');
        return;
      }

      const triggerNode = nodes.find(
        (n) => getNodeMeta(n.data.type as string).category === 'triggers'
      );
      const rawTriggerType = (triggerNode?.data?.type as string) || 'trigger_message';
      const triggerTypeMap: Record<string, string> = {
        trigger_message: 'new_message_received',
        trigger_keyword: 'keyword_match',
        trigger_tag: 'tag_added',
        trigger_interactive_reply: 'interactive_reply',
      };
      const standardTriggerType = triggerTypeMap[rawTriggerType] || rawTriggerType;

      const workflowPayload = {
        account_id: accountId,
        user_id: session.user.id,
        name: flowName.trim() || 'Untitled Automation Flow',
        status,
        is_active: status === 'published',
        trigger_type: standardTriggerType,
        trigger_config: triggerNode?.data?.config || {},
        canvas_data: { nodes, edges },
        published_version: status === 'published' ? { nodes, edges } : undefined,
        updated_at: new Date().toISOString(),
      };

      const isExisting = Boolean(automationId && automationId !== 'new');

      if (isExisting && automationId) {
        const { error } = await supabase
          .from('automations')
          .update(workflowPayload)
          .eq('id', automationId);

        if (error) throw error;
        toast.success('Workflow updated successfully! 🚀');
      } else {
        const { data: created, error } = await supabase
          .from('automations')
          .insert(workflowPayload)
          .select('id')
          .single();

        if (error) throw error;
        toast.success('Workflow created successfully! 🎉');
        if (created?.id) {
          router.push(`/automations/${created.id}/edit`);
        }
      }
    } catch (err: any) {
      console.error('[SaveWorkflow] Error:', err);
      toast.error(err.message || 'Failed to save workflow automation');
    } finally {
      setSaving(false);
    }
  }, [automationId, flowName, status, nodes, edges, supabase, router]);

  // Run Test Simulation
  const handleRunSimulator = useCallback(async () => {
    setExecutingTest(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message
    setSimChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: simInputMessage, time: nowStr },
    ]);

    // 2. Pulse nodes step by step to simulate execution
    for (let i = 0; i < nodes.length; i++) {
      const currentNode = nodes[i];
      setNodes((nds) =>
        nds.map((n) => (n.id === currentNode.id ? { ...n, data: { ...n.data, isExecuting: true } } : n))
      );
      await new Promise((r) => setTimeout(r, 600));

      setNodes((nds) =>
        nds.map((n) =>
          n.id === currentNode.id ? { ...n, data: { ...n.data, isExecuting: false, hasExecuted: true } } : n
        )
      );

      // If node is a message action, add simulated response
      if (currentNode.data.type === 'action_send_message') {
        const text =
          (currentNode.data.config as any)?.message?.replace('{{contact.name}}', simContactName) ||
          'Thank you for your message!';
        setSimChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      } else if (currentNode.data.type === 'action_send_interactive') {
        const cfg = currentNode.data.config as any;
        const buttons = cfg.buttons?.map((b: any) => `[${b.title}]`).join('  ') || '';
        setSimChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `${cfg.bodyText || 'Please choose an option:'}\n\n${buttons}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else if (currentNode.data.type === 'action_gemini_ai') {
        setSimChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🤖 [Gemini AI Response]: We offer 4 flexible plans (Free, Pro ₹499/mo, Business ₹3,000/mo, Enterprise ₹8,999/mo). You can upgrade anytime!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    }

    setExecutingTest(false);
    toast.success('Simulation run completed successfully!');
  }, [simInputMessage, simContactName, nodes, setNodes]);

  // Export JSON
  const handleOpenJsonExport = useCallback(() => {
    const payload = {
      name: flowName,
      status,
      nodes,
      edges,
      exportedAt: new Date().toISOString(),
      generator: 'NX-CRM-Visual-Engine-v2',
    };
    setJsonExportText(JSON.stringify(payload, null, 2));
    setJsonModalOpen(true);
  }, [flowName, status, nodes, edges]);

  // Active Node for Config Drawer
  const activeNode = useMemo(() => {
    return nodes.find((n) => n.id === activeConfigNodeId) || null;
  }, [nodes, activeConfigNodeId]);

  const updateActiveNodeConfig = useCallback(
    (newConfig: Record<string, any>, newLabel?: string) => {
      if (!activeConfigNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === activeConfigNodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                label: newLabel !== undefined ? newLabel : n.data.label,
                config: { ...(n.data.config || {}), ...newConfig },
              },
            };
          }
          return n;
        })
      );
    },
    [activeConfigNodeId, setNodes]
  );

  // Filtered nodes library
  const filteredLibrary = useMemo(() => {
    if (!searchLibraryQuery.trim()) return NODE_LIBRARY;
    const q = searchLibraryQuery.toLowerCase();
    return NODE_LIBRARY.filter(
      (n) => n.title.toLowerCase().includes(q) || n.description.toLowerCase().includes(q) || n.category.includes(q)
    );
  }, [searchLibraryQuery]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden bg-background">
      {/* Top Header Bar */}
      <div className="flex h-14 items-center justify-between border-b bg-card/80 px-4 backdrop-blur-md z-10">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/automations')}
            className="size-8 rounded-lg hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-primary" />
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="h-8 w-64 border-transparent hover:border-border focus:border-primary font-semibold text-sm bg-transparent px-2"
              placeholder="Workflow Automation Name..."
            />
          </div>

          <Badge
            variant="outline"
            className={cn(
              'text-[10px] font-semibold tracking-wide uppercase',
              status === 'published'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : status === 'paused'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {status}
          </Badge>
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex items-center gap-2">
          {/* Templates Gallery Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateGalleryOpen(true)}
            className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Templates</span>
          </Button>

          {/* Quick Node Add */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickAddOpen(true)}
            className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium"
          >
            <Plus className="size-3.5" />
            <span>Add Step</span>
          </Button>

          {/* Test Simulator Drawer Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulatorOpen(true)}
            className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium hover:border-primary/50"
          >
            <Smartphone className="size-3.5 text-emerald-400" />
            <span>Test Simulator</span>
          </Button>

          {/* JSON Export/Import */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenJsonExport}
            title="JSON Export / Import"
            className="size-8 rounded-lg"
          >
            <Code2 className="size-4 text-muted-foreground" />
          </Button>

          {/* Status Selector */}
          <Select
            value={status}
            onValueChange={(val: any) => {
              if (val === 'draft' || val === 'published' || val === 'paused') {
                setStatus(val);
              }
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs rounded-lg border-border font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="published" className="text-xs">Published</SelectItem>
              <SelectItem value="paused" className="text-xs">Paused</SelectItem>
            </SelectContent>
          </Select>

          {/* Save Action */}
          <Button
            size="sm"
            onClick={handleSaveWorkflow}
            disabled={saving}
            className="h-8 gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 shadow-sm"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            <span>Save Workflow</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-full bg-[#0d1117]">
        <ReactFlow
          nodes={augmentedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            animated: true,
            type: 'smoothstep',
            style: { stroke: 'var(--primary)', strokeWidth: 2 },
          }}
          className="bg-dot-grid"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="oklch(0.3 0.02 240 / 0.4)"
          />
          <Controls className="!bg-card/90 !border-border !rounded-xl !shadow-lg !backdrop-blur-md" />
          <MiniMap
            nodeStrokeColor="var(--primary)"
            nodeColor="oklch(0.2 0.02 240)"
            className="!bg-card/80 !border-border !rounded-xl !shadow-lg !overflow-hidden"
          />

          {/* Floating Canvas Quick Inserter Banner */}
          <Panel position="bottom-center" className="mb-4">
            <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card/95 px-3.5 py-2 shadow-2xl backdrop-blur-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuickAddOpen(true)}
                className="h-7 text-xs font-semibold gap-1.5 rounded-lg hover:bg-primary/15 hover:text-primary"
              >
                <Plus className="size-3.5" />
                <span>Add Node</span>
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTemplateGalleryOpen(true)}
                className="h-7 text-xs font-semibold gap-1.5 rounded-lg hover:bg-primary/15 hover:text-primary"
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Prebuilt Library</span>
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSimulatorOpen(true)}
                className="h-7 text-xs font-semibold gap-1.5 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
              >
                <Play className="size-3.5" />
                <span>Simulate Run</span>
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* ============================================================ */}
      {/* Node Config Drawer (Right Side)                             */}
      {/* ============================================================ */}
      {activeNode && (
        <div className="fixed inset-y-0 right-0 w-96 border-l bg-card/98 p-5 shadow-2xl backdrop-blur-xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="size-6 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sliders className="size-3.5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Configure Step</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveConfigNodeId(null)}
              className="size-7 rounded-lg"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Step Label */}
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Step Label</Label>
              <Input
                value={typeof activeNode.data.label === 'string' ? activeNode.data.label : ''}
                onChange={(e) => updateActiveNodeConfig({}, e.target.value)}
                className="mt-1 h-8 text-xs rounded-lg"
                placeholder="e.g. Send Welcome Message"
              />
            </div>

            {/* Keyword Trigger Config */}
            {activeNode.data.type === 'trigger_keyword' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Keywords (comma separated)</Label>
                <Input
                  value={
                    Array.isArray((activeNode.data.config as any)?.keywords)
                      ? (activeNode.data.config as any).keywords.join(', ')
                      : (activeNode.data.config as any)?.keywords || ''
                  }
                  onChange={(e) =>
                    updateActiveNodeConfig({
                      keywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="hi, hello, start, pricing"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}

            {/* Message Action Config */}
            {activeNode.data.type === 'action_send_message' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">WhatsApp Text</Label>
                  <span className="text-[10px] text-muted-foreground">Supports {'{{contact.name}}'}</span>
                </div>
                <Textarea
                  rows={5}
                  value={(activeNode.data.config as any)?.message || ''}
                  onChange={(e) => updateActiveNodeConfig({ message: e.target.value })}
                  placeholder="Hello {{contact.name}}, thank you for reaching out..."
                  className="text-xs rounded-lg resize-none leading-relaxed font-sans"
                />
              </div>
            )}

            {/* Interactive Button Action Config */}
            {activeNode.data.type === 'action_send_interactive' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Message Body Text</Label>
                <Textarea
                  rows={3}
                  value={(activeNode.data.config as any)?.bodyText || ''}
                  onChange={(e) => updateActiveNodeConfig({ bodyText: e.target.value })}
                  placeholder="Please choose an option below:"
                  className="text-xs rounded-lg resize-none"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-2">
                  Action Buttons (Up to 3)
                </Label>
                {((activeNode.data.config as any)?.buttons || []).map((btn: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={typeof btn.title === 'string' ? btn.title : ''}
                      onChange={(e) => {
                        const newBtns = [...((activeNode.data.config as any).buttons || [])];
                        newBtns[idx] = { ...btn, title: e.target.value };
                        updateActiveNodeConfig({ buttons: newBtns });
                      }}
                      className="h-8 text-xs rounded-lg flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newBtns = (activeNode.data.config as any).buttons.filter((_: any, i: number) => i !== idx);
                        updateActiveNodeConfig({ buttons: newBtns });
                      }}
                      className="size-8 text-muted-foreground hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {((activeNode.data.config as any)?.buttons?.length || 0) < 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = (activeNode.data.config as any)?.buttons || [];
                      updateActiveNodeConfig({
                        buttons: [...current, { id: `opt_${Date.now()}`, title: 'New Option' }],
                      });
                    }}
                    className="w-full text-xs h-8 rounded-lg border-dashed"
                  >
                    <Plus className="size-3.5 mr-1" /> Add Button
                  </Button>
                )}
              </div>
            )}

            {/* Gemini AI Config */}
            {activeNode.data.type === 'action_gemini_ai' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">AI System Instruction / Persona</Label>
                <Textarea
                  rows={4}
                  value={(activeNode.data.config as any)?.systemPrompt || ''}
                  onChange={(e) => updateActiveNodeConfig({ systemPrompt: e.target.value })}
                  className="text-xs rounded-lg resize-none"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-2">AI Model</Label>
                <Select
                  value={(activeNode.data.config as any)?.model || 'gemini-1.5-flash'}
                  onValueChange={(val) => updateActiveNodeConfig({ model: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-1.5-flash" className="text-xs">Gemini 1.5 Flash (Ultra Fast)</SelectItem>
                    <SelectItem value="gemini-1.5-pro" className="text-xs">Gemini 1.5 Pro (Deep Reasoning)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* If / Else Condition Config */}
            {activeNode.data.type === 'condition_match' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Match Variable</Label>
                <Input
                  value={(activeNode.data.config as any)?.field || ''}
                  onChange={(e) => updateActiveNodeConfig({ field: e.target.value })}
                  placeholder="contact.tag or message.body"
                  className="h-8 text-xs rounded-lg"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Condition Operator</Label>
                <Select
                  value={(activeNode.data.config as any)?.operator || 'contains'}
                  onValueChange={(val) => updateActiveNodeConfig({ operator: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains" className="text-xs">Contains</SelectItem>
                    <SelectItem value="equals" className="text-xs">Exactly Equals</SelectItem>
                    <SelectItem value="starts_with" className="text-xs">Starts With</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Expected Target Value</Label>
                <Input
                  value={(activeNode.data.config as any)?.value || ''}
                  onChange={(e) => updateActiveNodeConfig({ value: e.target.value })}
                  placeholder="e.g. VIP or Pricing"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}

            {/* Delay Config */}
            {activeNode.data.type === 'delay_wait' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Wait Duration (Minutes)</Label>
                <Input
                  type="number"
                  min={1}
                  value={(activeNode.data.config as any)?.durationMinutes || 15}
                  onChange={(e) => updateActiveNodeConfig({ durationMinutes: parseInt(e.target.value, 10) || 1 })}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}

            {/* Tag Config */}
            {activeNode.data.type === 'action_add_tag' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Tag Name</Label>
                <Input
                  value={(activeNode.data.config as any)?.tag || ''}
                  onChange={(e) => updateActiveNodeConfig({ tag: e.target.value })}
                  placeholder="e.g. High-Intent Lead"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}

            {/* Google Sheets Action Config */}
            {activeNode.data.type === 'action_google_sheets' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Sheet Tab Name</Label>
                <Input
                  value={(activeNode.data.config as any)?.sheetTab || ''}
                  onChange={(e) => updateActiveNodeConfig({ sheetTab: e.target.value })}
                  placeholder="e.g. WhatsApp Leads"
                  className="h-8 text-xs rounded-lg"
                />
                <Label className="text-xs font-medium text-muted-foreground block pt-1">
                  Columns / Fields to Sync
                </Label>
                <Input
                  value={(activeNode.data.config as any)?.syncFields || ''}
                  onChange={(e) => updateActiveNodeConfig({ syncFields: e.target.value })}
                  placeholder="name, phone, message, timestamp"
                  className="h-8 text-xs rounded-lg"
                />
                <p className="text-[10px] text-muted-foreground">
                  Data will be pushed to the Google Sheets webhook configured in Settings &gt; Integrations.
                </p>
              </div>
            )}

            {/* Payment Link Action Config */}
            {activeNode.data.type === 'action_send_payment_link' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Payment Gateway</Label>
                <Select
                  value={(activeNode.data.config as any)?.gateway || 'razorpay'}
                  onValueChange={(val) => updateActiveNodeConfig({ gateway: val })}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay" className="text-xs">Razorpay (UPI & Cards)</SelectItem>
                    <SelectItem value="phonepe" className="text-xs">PhonePe PG</SelectItem>
                    <SelectItem value="paytm" className="text-xs">Paytm Gateway</SelectItem>
                    <SelectItem value="stripe" className="text-xs">Stripe Checkout</SelectItem>
                  </SelectContent>
                </Select>

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Amount</Label>
                <Input
                  type="number"
                  value={(activeNode.data.config as any)?.amount || 499}
                  onChange={(e) => updateActiveNodeConfig({ amount: parseFloat(e.target.value) || 0 })}
                  placeholder="499"
                  className="h-8 text-xs rounded-lg"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Payment Description</Label>
                <Input
                  value={(activeNode.data.config as any)?.description || ''}
                  onChange={(e) => updateActiveNodeConfig({ description: e.target.value })}
                  placeholder="Order Activation Fee"
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            )}

            {/* Email Alert Action Config */}
            {activeNode.data.type === 'action_email_alert' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Recipient Email Address</Label>
                <Input
                  value={(activeNode.data.config as any)?.recipient || ''}
                  onChange={(e) => updateActiveNodeConfig({ recipient: e.target.value })}
                  placeholder="sales@yourcompany.com"
                  className="h-8 text-xs rounded-lg"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Email Subject</Label>
                <Input
                  value={(activeNode.data.config as any)?.subject || ''}
                  onChange={(e) => updateActiveNodeConfig({ subject: e.target.value })}
                  placeholder="🚨 New Hot Lead: {{contact.name}}"
                  className="h-8 text-xs rounded-lg"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Email Body Content</Label>
                <Textarea
                  rows={3}
                  value={(activeNode.data.config as any)?.body || ''}
                  onChange={(e) => updateActiveNodeConfig({ body: e.target.value })}
                  placeholder="Lead details: {{contact.name}}, {{contact.phone}}"
                  className="text-xs rounded-lg resize-none"
                />
              </div>
            )}

            {/* Calendar Booking Action Config */}
            {activeNode.data.type === 'action_book_calendar' && (
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">Calendly / Calendar URL</Label>
                <Input
                  value={(activeNode.data.config as any)?.calendarUrl || ''}
                  onChange={(e) => updateActiveNodeConfig({ calendarUrl: e.target.value })}
                  placeholder="https://calendly.com/your-username/30min"
                  className="h-8 text-xs rounded-lg"
                />

                <Label className="text-xs font-medium text-muted-foreground block pt-1">Invitation Message</Label>
                <Textarea
                  rows={3}
                  value={(activeNode.data.config as any)?.inviteText || ''}
                  onChange={(e) => updateActiveNodeConfig({ inviteText: e.target.value })}
                  placeholder="Please select a convenient time for our consultation: {{calendarUrl}}"
                  className="text-xs rounded-lg resize-none"
                />
              </div>
            )}
          </div>

          <div className="mt-6 border-t pt-4 flex items-center justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (activeConfigNodeId) handleDeleteNode(activeConfigNodeId);
              }}
              className="text-xs h-8 rounded-lg"
            >
              <Trash2 className="size-3.5 mr-1" /> Delete Step
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveConfigNodeId(null)}
              className="text-xs h-8 rounded-lg px-4"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Quick Add Node Modal (n8n Inserter)                          */}
      {/* ============================================================ */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-2xl bg-card/98 backdrop-blur-xl border-border rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="size-4 text-primary" />
              <span>Add Workflow Node</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a trigger, messaging action, AI step, or logic block to add to your canvas.
            </DialogDescription>
          </DialogHeader>

          <div className="relative my-2">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={searchLibraryQuery}
              onChange={(e) => setSearchLibraryQuery(e.target.value)}
              placeholder="Search triggers, WhatsApp actions, Gemini AI, delays..."
              className="pl-9 h-9 text-xs rounded-xl bg-muted/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {filteredLibrary.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.type}
                  onClick={() => handleAddNodeToCanvas(item)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-all duration-150 group"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Prebuilt Templates Gallery Modal                             */}
      {/* ============================================================ */}
      <Dialog open={templateGalleryOpen} onOpenChange={setTemplateGalleryOpen}>
        <DialogContent className="max-w-3xl bg-card/98 backdrop-blur-xl border-border rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-primary" />
              <span>Production Workflow Templates</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose from battle-tested WhatsApp CRM automations with complete triggers, branch conditions, and actions preconfigured.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2 max-h-[420px] overflow-y-auto pr-1">
            {PREBUILT_TEMPLATES.map((tpl) => {
              const Icon = tpl.icon;
              return (
                <div
                  key={tpl.id}
                  className="flex flex-col justify-between p-4 rounded-xl border border-border/80 bg-muted/20 hover:border-primary/60 hover:bg-muted/40 transition-all duration-150"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 flex items-center">
                        <Icon className="size-3 mr-1" />
                        {tpl.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{tpl.nodes.length} Steps</span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground mb-1">{tpl.name}</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tpl.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-4"
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Live Interactive Workflow Simulator Drawer                   */}
      {/* ============================================================ */}
      {simulatorOpen && (
        <div className="fixed inset-y-0 right-0 w-[420px] border-l bg-card/98 shadow-2xl backdrop-blur-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <div className="size-7 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <Smartphone className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">WhatsApp Live Simulator</h3>
                <p className="text-[11px] text-muted-foreground">Test workflow execution path live</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSimulatorOpen(false)}
              className="size-7 rounded-lg"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Test Customer Context */}
          <div className="p-4 border-b bg-muted/20 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Customer Name</Label>
                <Input
                  value={simContactName}
                  onChange={(e) => setSimContactName(e.target.value)}
                  className="h-7 text-xs rounded-lg mt-0.5"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground font-semibold uppercase">Phone Number</Label>
                <Input
                  value={simContactPhone}
                  onChange={(e) => setSimContactPhone(e.target.value)}
                  className="h-7 text-xs rounded-lg mt-0.5"
                />
              </div>
            </div>
          </div>

          {/* Simulated WhatsApp Chat Screen */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b141a]/60">
            {simChatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex flex-col max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-sm',
                  msg.sender === 'user'
                    ? 'ml-auto bg-[#005c4b] text-white rounded-br-none'
                    : 'mr-auto bg-[#202c33] text-zinc-100 rounded-bl-none'
                )}
              >
                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                <span className="text-[9px] opacity-70 text-right mt-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Chat Simulator Input */}
          <div className="p-3 border-t bg-card space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={simInputMessage}
                onChange={(e) => setSimInputMessage(e.target.value)}
                placeholder="Type customer message to test..."
                className="h-9 text-xs rounded-xl flex-1 bg-muted/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !executingTest) {
                    handleRunSimulator();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleRunSimulator}
                disabled={executingTest || !simInputMessage.trim()}
                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                {executingTest ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* JSON Export / Import Modal                                   */}
      {/* ============================================================ */}
      <Dialog open={jsonModalOpen} onOpenChange={setJsonModalOpen}>
        <DialogContent className="max-w-xl bg-card border-border rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Code2 className="size-4 text-primary" />
              <span>Workflow JSON Schema</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Copy the JSON definition or paste an existing workflow schema to import.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            rows={10}
            value={jsonExportText}
            onChange={(e) => setJsonExportText(e.target.value)}
            className="font-mono text-[11px] rounded-xl resize-none bg-muted/40 p-3 leading-relaxed"
          />

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(jsonExportText);
                toast.success('Workflow JSON copied to clipboard!');
              }}
              className="text-xs rounded-lg"
            >
              <Copy className="size-3.5 mr-1" /> Copy JSON
            </Button>
            <Button
              size="sm"
              onClick={() => {
                try {
                  const parsed = JSON.parse(jsonExportText);
                  if (parsed.nodes && parsed.edges) {
                    setNodes(parsed.nodes);
                    setEdges(parsed.edges);
                    if (parsed.name) setFlowName(parsed.name);
                    setJsonModalOpen(false);
                    toast.success('Workflow imported successfully!');
                  } else {
                    toast.error('Invalid workflow schema: missing nodes or edges');
                  }
                } catch {
                  toast.error('Invalid JSON format');
                }
              }}
              className="text-xs rounded-lg"
            >
              <Upload className="size-3.5 mr-1" /> Import Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
