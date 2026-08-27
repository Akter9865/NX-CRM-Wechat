/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Search,
  Code2,
  Smartphone,
  Workflow,
  FileSpreadsheet,
  Mail,
  Calendar,
  CheckCheck,
  HelpCircle,
  ChevronDown,
  ChevronUp,
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

// ============================================================
// Node Type Definitions & Metadata
// ============================================================

export type FlowCategory = 'triggers' | 'actions' | 'logic' | 'ai' | 'crm';

export interface NodeTypeMeta {
  type: string;
  category: FlowCategory;
  title: string;
  badge: string;
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
    type: 'trigger_keyword',
    category: 'triggers',
    title: 'Keyword Match Trigger',
    badge: 'TRIGGER',
    description: 'Fires when customer sends specific words like "hi", "hello", "pricing"',
    icon: Zap,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: { keywords: ['hi', 'hello', 'hi bhaiya', 'start', 'pricing'], matchType: 'contains' },
  },
  {
    type: 'trigger_message',
    category: 'triggers',
    title: 'Any Inbound Message',
    badge: 'TRIGGER',
    description: 'Fires whenever a customer sends any message on WhatsApp',
    icon: MessageSquare,
    color: 'emerald',
    headerBg: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
    accentBorder: 'hover:border-emerald-500/50',
    defaultConfig: { triggerType: 'any_message' },
  },
  {
    type: 'trigger_tag',
    category: 'triggers',
    title: 'Tag Added Trigger',
    badge: 'TRIGGER',
    description: 'Fires when a CRM tag is applied to a contact',
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
    badge: 'TRIGGER',
    description: 'Fires when a customer taps an interactive button or list menu',
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
    badge: 'ACTION',
    description: 'Send an automated WhatsApp text message with contact variables',
    icon: Send,
    color: 'blue',
    headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
    accentBorder: 'hover:border-blue-500/50',
    defaultConfig: { message: 'Hello {{contact.name}}! 👋 Thank you for contacting us. How can we help you today?' },
  },
  {
    type: 'action_send_interactive',
    category: 'actions',
    title: 'Send Interactive Buttons',
    badge: 'ACTION',
    description: 'Send quick-reply buttons (up to 3) for customers to choose from',
    icon: Radio,
    color: 'blue',
    headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
    accentBorder: 'hover:border-blue-500/50',
    defaultConfig: {
      bodyText: 'Please select an option below:',
      buttons: [
        { id: 'opt_sales', title: '💼 Sales & Pricing' },
        { id: 'opt_support', title: '🛠 Support Helpdesk' },
        { id: 'opt_talk', title: '🗣 Talk to Human' },
      ],
    },
  },
  {
    type: 'action_send_template',
    category: 'actions',
    title: 'Send Meta Template',
    badge: 'ACTION',
    description: 'Send an approved Meta WhatsApp template message with variables',
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
    badge: 'AI BOT',
    description: 'Generate instant intelligent AI responses using CRM Knowledge Base',
    icon: Sparkles,
    color: 'purple',
    headerBg: 'from-purple-500/20 to-fuchsia-500/10 text-purple-400 border-purple-500/30',
    accentBorder: 'hover:border-purple-500/50',
    defaultConfig: {
      systemPrompt: 'You are our official WhatsApp assistant. Answer customer questions concisely and politely.',
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
    badge: 'LOGIC',
    description: 'Branch the flow based on customer words, tags, or message content',
    icon: Filter,
    color: 'amber',
    headerBg: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    accentBorder: 'hover:border-amber-500/50',
    defaultConfig: {
      field: 'message.text',
      operator: 'contains',
      value: 'pricing',
    },
  },
  {
    type: 'delay_wait',
    category: 'logic',
    title: 'Delay / Wait Timer',
    badge: 'DELAY',
    description: 'Wait for a specified duration before sending the next message',
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
    badge: 'CRM',
    description: 'Add a tag like "Interested Lead" or "VIP" to segment the contact',
    icon: Tag,
    color: 'teal',
    headerBg: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30',
    accentBorder: 'hover:border-teal-500/50',
    defaultConfig: { tag: 'Qualified Lead' },
  },
  {
    type: 'action_google_sheets',
    category: 'crm',
    title: 'Export to Google Sheets',
    badge: 'SHEETS',
    description: 'Append lead contact details to Google Sheets spreadsheet',
    icon: FileSpreadsheet,
    color: 'teal',
    headerBg: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/30',
    accentBorder: 'hover:border-teal-500/50',
    defaultConfig: {
      sheetTab: 'Leads',
      syncFields: 'name,phone,message,timestamp',
    },
  },
  {
    type: 'action_email_alert',
    category: 'crm',
    title: 'Send Email Notification',
    badge: 'EMAIL',
    description: 'Send instant email alert to team when a customer contacts you',
    icon: Mail,
    color: 'purple',
    headerBg: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30',
    accentBorder: 'hover:border-purple-500/50',
    defaultConfig: {
      recipient: 'sales@yourdomain.com',
      subject: '🚨 New WhatsApp Lead: {{contact.name}}',
      body: 'A new lead has contacted us: {{contact.name}} ({{contact.phone}}).',
    },
  },
  {
    type: 'action_book_calendar',
    category: 'crm',
    title: 'Send Calendly Booking Link',
    badge: 'CALENDAR',
    description: 'Send consultation meeting booking link',
    icon: Calendar,
    color: 'amber',
    headerBg: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
    accentBorder: 'hover:border-amber-500/50',
    defaultConfig: {
      calendarUrl: 'https://calendly.com/your-name/meeting',
      inviteText: 'Please select a convenient time for our meeting: {{calendarUrl}}',
    },
  },
];

export function getNodeMeta(type: string): NodeTypeMeta {
  return (
    NODE_LIBRARY.find((n) => n.type === type) || {
      type,
      category: 'actions',
      title: 'Workflow Step',
      badge: 'ACTION',
      description: 'Workflow step',
      icon: Layers,
      color: 'blue',
      headerBg: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
      accentBorder: 'hover:border-blue-500/50',
      defaultConfig: {},
    }
  );
}

// ============================================================
// Beginner-Friendly Custom Node Component
// ============================================================

function CustomWorkflowNode({ data, id, selected }: NodeProps) {
  const nodeType = (data.type || data.nodeType || 'action_send_message') as string;
  const meta = useMemo(() => getNodeMeta(nodeType), [nodeType]);
  const isTrigger = meta.category === 'triggers';
  const isCondition = nodeType === 'condition_match';
  const Icon = meta.icon;

  const nodeData = data as {
    label?: string;
    type: string;
    nodeType?: string;
    config: Record<string, any>;
    onConfigure?: (id: string) => void;
    onDelete?: (id: string) => void;
    onDuplicate?: (id: string) => void;
    onQuickAdd?: (id: string, handleId?: string) => void;
    isExecuting?: boolean;
    hasExecuted?: boolean;
  };

  const previewSnippet = useMemo(() => {
    const cfg = nodeData.config || {};
    if (nodeType === 'trigger_keyword') {
      const kw = Array.isArray(cfg.keywords) ? cfg.keywords.join(', ') : cfg.keywords || 'any';
      return `Keywords: "${kw}"`;
    }
    if (nodeType === 'trigger_message') {
      return 'Fires on any incoming customer message';
    }
    if (nodeType === 'action_send_message') {
      return cfg.message ? `"${cfg.message.slice(0, 50)}${cfg.message.length > 50 ? '...' : ''}"` : 'No text configured';
    }
    if (nodeType === 'action_send_interactive') {
      const count = cfg.buttons?.length || 0;
      return `${count} Button(s): ${cfg.buttons?.map((b: any) => b.title).join(' | ') || 'None'}`;
    }
    if (nodeType === 'action_gemini_ai') {
      return `Gemini AI Model: ${cfg.model || 'gemini-1.5-flash'}`;
    }
    if (nodeType === 'condition_match') {
      return `If ${cfg.field || 'message'} ${cfg.operator || 'contains'} "${cfg.value || ''}"`;
    }
    if (nodeType === 'delay_wait') {
      return `Wait for ${cfg.durationMinutes || 15} minute(s)`;
    }
    if (nodeType === 'action_add_tag') {
      return `Add Tag: +[${cfg.tag || 'New Lead'}]`;
    }
    return meta.description;
  }, [nodeType, nodeData.config, meta.description]);

  return (
    <div
      className={cn(
        'group relative min-w-[290px] max-w-[340px] rounded-2xl border bg-card/95 backdrop-blur-md transition-all duration-200 shadow-lg',
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
          className="!size-4 !bg-primary !border-2 !border-background hover:!scale-125 !transition-transform !shadow-md"
        />
      )}

      {/* Node Header with Category Badge */}
      <div
        className={cn(
          'flex items-center justify-between border-b px-3.5 py-2.5 rounded-t-2xl bg-gradient-to-r',
          meta.headerBg
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-lg bg-background/90 shadow-xs">
            <Icon className="size-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/80 text-foreground border border-border/50">
                {meta.badge}
              </span>
            </div>
            <span className="text-xs font-bold tracking-tight text-foreground block mt-0.5">
              {nodeData.label || meta.title}
            </span>
          </div>
        </div>

        {/* Action buttons on hover */}
        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onConfigure?.(id);
            }}
            title="Configure Step (Settings)"
            className="p-1 rounded-md bg-background/60 hover:bg-background text-foreground shadow-xs transition-colors"
          >
            <Sliders className="size-3.5 text-primary" />
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
            <Copy className="size-3.5" />
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
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div
        className="p-3.5 cursor-pointer hover:bg-muted/10 transition-colors"
        onClick={() => nodeData.onConfigure?.(id)}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-foreground font-medium line-clamp-2 leading-relaxed bg-muted/50 px-2.5 py-2 rounded-lg border border-border/50 w-full">
            {previewSnippet}
          </p>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="text-primary hover:underline font-semibold flex items-center gap-1">
            <Sliders className="size-3" /> Click to Edit Message
          </span>
          <span className="text-muted-foreground/80">Step {id.slice(-4)}</span>
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
              className="!size-4 !bg-emerald-500 !border-2 !border-background hover:!scale-125 !transition-transform !shadow-md"
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
              className="!size-4 !bg-rose-500 !border-2 !border-background hover:!scale-125 !transition-transform !shadow-md"
            />
          </div>
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-4 !bg-primary !border-2 !border-background hover:!scale-125 !transition-transform !shadow-md"
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

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  nodes: Node[];
  edges: Edge[];
}

export const PREBUILT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'keyword_greeting',
    name: '💬 Keyword Auto-Reply (Hi / Hello Greeting)',
    category: '⭐ Beginner Friendly',
    description: 'Instantly replies whenever a customer sends "hi", "hello", "hi bhaiya", or greetings.',
    icon: Zap,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          type: 'trigger_keyword',
          nodeType: 'trigger_keyword',
          label: 'Customer Sends "hi" or "hello"',
          config: { keywords: ['hi', 'hello', 'hi bhaiya', 'start', 'pricing', 'help'], matchType: 'contains' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 180 },
        data: {
          type: 'action_send_message',
          nodeType: 'action_send_message',
          label: 'Send Welcome Greeting',
          config: { message: 'Hello {{contact.name}}! 👋 Thank you for contacting us. How can our team help you today?' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'gemini_ai_assistant',
    name: '🤖 24/7 Gemini AI Knowledge Base Auto-Reply',
    category: '⭐ AI Automation',
    description: 'Uses Google Gemini AI to answer customer inquiries accurately using your CRM knowledge base.',
    icon: Sparkles,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          type: 'trigger_message',
          nodeType: 'trigger_message',
          label: 'Customer Asks Question',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 180 },
        data: {
          type: 'action_gemini_ai',
          nodeType: 'action_gemini_ai',
          label: 'Generate Smart AI Answer',
          config: {
            systemPrompt: 'You are our official WhatsApp assistant. Provide concise, friendly, and helpful answers.',
            model: 'gemini-1.5-flash',
            fallbackToAgent: true,
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'welcome_lead_capture',
    name: '🔘 Interactive 3-Button Welcome Menu',
    category: 'Sales & Growth',
    description: 'Greets new customers and gives 3 interactive buttons (Pricing, Support, Talk to Agent).',
    icon: Radio,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          type: 'trigger_message',
          nodeType: 'trigger_message',
          label: 'Customer Messages Inbound',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 180 },
        data: {
          type: 'action_send_interactive',
          nodeType: 'action_send_interactive',
          label: 'Send Welcome Menu Buttons',
          config: {
            bodyText: '👋 Welcome to NX CRM! How can we assist you today?',
            buttons: [
              { id: 'opt_pricing', title: '💼 View Pricing' },
              { id: 'opt_support', title: '🛠 Support Helpdesk' },
              { id: 'opt_agent', title: '🗣 Talk to Human' },
            ],
          },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
    ],
  },
  {
    id: 'after_hours_autoreply',
    name: '🌙 Out-of-Office & Night Auto-Responder',
    category: 'Support & Away',
    description: 'Replies automatically when messages arrive outside business hours and tags for morning follow-up.',
    icon: Clock,
    nodes: [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 180 },
        data: {
          type: 'trigger_message',
          nodeType: 'trigger_message',
          label: 'Message Received',
          config: { triggerType: 'any_message' },
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 480, y: 180 },
        data: {
          type: 'action_send_message',
          nodeType: 'action_send_message',
          label: 'Send Away Notice',
          config: { message: 'Thank you for messaging us! Our team is currently away. We will reply promptly at 9:00 AM.' },
        },
      },
      {
        id: 'node-3',
        type: 'customNode',
        position: { x: 860, y: 180 },
        data: {
          type: 'action_add_tag',
          nodeType: 'action_add_tag',
          label: 'Tag for Follow-up',
          config: { tag: 'Follow Up Needed' },
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true, type: 'smoothstep' },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true, type: 'smoothstep' },
    ],
  },
];

// ============================================================
// Visual Flow Builder Component
// ============================================================

export interface VisualFlowBuilderProps {
  automationId?: string;
  initialName?: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialStatus?: 'draft' | 'published' | 'paused';
  initialData?: any;
  initialTemplateSlug?: string;
}

export function VisualFlowBuilder({
  automationId,
  initialName = 'New Workflow Automation',
  initialNodes,
  initialEdges,
  initialStatus = 'draft',
  initialData,
  initialTemplateSlug,
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
  const [showBeginnerGuide, setShowBeginnerGuide] = useState(true);

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
  const [simInputMessage, setSimInputMessage] = useState('hi bhaiya');
  const [simChatMessages, setSimChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: 'WhatsApp Simulator ready. Send a test message below!', time: 'Just now' },
  ]);

  // Default Canvas Nodes if none provided
  const defaultInitialNodes: Node[] = useMemo(
    () => [
      {
        id: 'node-trigger-1',
        type: 'customNode',
        position: { x: 100, y: 200 },
        data: {
          type: 'trigger_keyword',
          nodeType: 'trigger_keyword',
          label: 'Customer Sends "hi" or "hello"',
          config: { keywords: ['hi', 'hello', 'hi bhaiya', 'start', 'pricing'], matchType: 'contains' },
        },
      },
      {
        id: 'node-action-1',
        type: 'customNode',
        position: { x: 480, y: 200 },
        data: {
          type: 'action_send_message',
          nodeType: 'action_send_message',
          label: 'Send Welcome Message',
          config: { message: 'Hello {{contact.name}}! 👋 Thank you for contacting us. How can we help you today?' },
        },
      },
    ],
    []
  );

  const defaultInitialEdges: Edge[] = useMemo(
    () => [
      {
        id: 'e-trigger-action',
        source: 'node-trigger-1',
        target: 'node-action-1',
        animated: true,
        type: 'smoothstep',
      },
    ],
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(rawNodes || defaultInitialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rawEdges || defaultInitialEdges);

  // Auto-apply template from URL if requested
  useEffect(() => {
    if (initialTemplateSlug && (!rawNodes || rawNodes.length === 0)) {
      const match =
        PREBUILT_TEMPLATES.find((t) => t.id === initialTemplateSlug) ||
        PREBUILT_TEMPLATES.find((t) => t.id.includes(initialTemplateSlug));
      if (match) {
        setNodes(match.nodes);
        setEdges(match.edges);
        setFlowName(match.name);
        toast.success(`Loaded "${match.name}" template! 🚀`);
      }
    }
  }, [initialTemplateSlug, rawNodes, setNodes, setEdges]);

  // Handlers for node manipulation
  const handleConfigureNode = useCallback((id: string) => {
    setActiveConfigNodeId(id);
  }, []);

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== id));
      setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
      if (activeConfigNodeId === id) setActiveConfigNodeId(null);
      toast.success('Step removed from canvas');
    },
    [activeConfigNodeId, setNodes, setEdges]
  );

  const handleDuplicateNode = useCallback(
    (id: string) => {
      const targetNode = nodes.find((n) => n.id === id);
      if (!targetNode) return;

      const newId = `node-${Date.now()}`;
      const newNode: Node = {
        ...targetNode,
        id: newId,
        position: {
          x: targetNode.position.x + 40,
          y: targetNode.position.y + 40,
        },
        data: {
          ...targetNode.data,
          label: `${targetNode.data.label || 'Step'} (Copy)`,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      toast.success('Step duplicated');
    },
    [nodes, setNodes]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            animated: true,
            type: 'smoothstep',
            style: { stroke: 'var(--primary)', strokeWidth: 2 },
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
      const xOffset = 250 + Math.random() * 80;
      const yOffset = 150 + Math.random() * 80;

      const newNode: Node = {
        id: newId,
        type: 'customNode',
        position: { x: xOffset, y: yOffset },
        data: {
          type: typeMeta.type,
          nodeType: typeMeta.type,
          label: typeMeta.title,
          config: { ...typeMeta.defaultConfig },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setQuickAddOpen(false);
      setActiveConfigNodeId(newId);
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
      toast.success(`Loaded "${tpl.name}" template! 🚀`);
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

      const triggerNode = nodes.find((n) => {
        const type = (n.data?.type || n.data?.nodeType || '') as string;
        return getNodeMeta(type).category === 'triggers' || type.startsWith('trigger_');
      });

      const rawTriggerType = ((triggerNode?.data?.type || triggerNode?.data?.nodeType) as string) || 'trigger_message';
      const triggerTypeMap: Record<string, string> = {
        trigger_message: 'new_message_received',
        trigger_keyword: 'keyword_match',
        trigger_tag: 'tag_added',
        trigger_interactive_reply: 'interactive_reply',
      };
      const standardTriggerType = triggerTypeMap[rawTriggerType] || rawTriggerType;

      const triggerConfig: Record<string, any> = { ...(triggerNode?.data?.config || {}) };
      if (standardTriggerType === 'keyword_match') {
        if (!triggerConfig.match_type) {
          triggerConfig.match_type = triggerConfig.matchType || 'contains';
        }
      }
      if (standardTriggerType === 'interactive_reply') {
        if (!triggerConfig.reply_ids && triggerConfig.buttonId) {
          triggerConfig.reply_ids = [triggerConfig.buttonId];
        }
      }

      const normalizedNodes = nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          type: n.data?.type || n.data?.nodeType,
          nodeType: n.data?.type || n.data?.nodeType,
        },
      }));

      const workflowPayload = {
        account_id: accountId,
        user_id: session.user.id,
        name: flowName.trim() || 'Untitled Automation Flow',
        status,
        is_active: status === 'published',
        trigger_type: standardTriggerType,
        trigger_config: triggerConfig,
        canvas_data: { nodes: normalizedNodes, edges },
        published_version: status === 'published' ? { nodes: normalizedNodes, edges } : undefined,
        updated_at: new Date().toISOString(),
      };

      const isExisting = Boolean(automationId && automationId !== 'new');

      if (isExisting && automationId) {
        const { error } = await supabase
          .from('automations')
          .update(workflowPayload)
          .eq('id', automationId);

        if (error) throw error;
        toast.success(status === 'published' ? 'Workflow Published & Active! 🚀' : 'Workflow saved successfully! 💾');
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

    setSimChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: simInputMessage, time: nowStr },
    ]);

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

      const nodeType = (currentNode.data?.type || currentNode.data?.nodeType) as string;

      if (nodeType === 'action_send_message') {
        const text =
          (currentNode.data.config as any)?.message?.replace('{{contact.name}}', simContactName) ||
          'Thank you for your message!';
        setSimChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      } else if (nodeType === 'action_send_interactive') {
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
      } else if (nodeType === 'action_gemini_ai') {
        setSimChatMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: `🤖 [Gemini AI Response]: Hello! How can I help you today? I'm connected to your CRM knowledge base.`,
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
    };
    setJsonExportText(JSON.stringify(payload, null, 2));
    setJsonModalOpen(true);
  }, [flowName, status, nodes, edges]);

  // Pass handlers into each node's data
  const augmentedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onConfigure: handleConfigureNode,
          onDelete: handleDeleteNode,
          onDuplicate: handleDuplicateNode,
        },
      })),
    [nodes, handleConfigureNode, handleDeleteNode, handleDuplicateNode]
  );

  const activeNode = useMemo(() => {
    if (!activeConfigNodeId) return null;
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
      <div className="flex h-14 items-center justify-between border-b bg-card/90 px-4 backdrop-blur-md z-10">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/automations')}
            className="size-8 rounded-lg hover:bg-muted"
            title="Back to Automations"
          >
            <ArrowLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Workflow className="size-4 text-primary" />
            <Input
              value={flowName}
              onChange={(e) => setFlowName(e.target.value)}
              className="h-8 w-64 border-transparent hover:border-border focus:border-primary font-semibold text-sm bg-transparent px-2"
              placeholder="Automation Flow Name..."
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
            {status === 'published' ? '🟢 Published (Live)' : status === 'paused' ? '⏸ Paused' : '📝 Draft'}
          </Badge>
        </div>

        {/* Right: Actions Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBeginnerGuide((prev) => !prev)}
            className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="size-3.5 text-primary" />
            <span>{showBeginnerGuide ? 'Hide Guide' : '💡 Beginner Guide'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplateGalleryOpen(true)}
            className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>Templates</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickAddOpen(true)}
            className="h-8 gap-1.5 rounded-lg border-border/80 text-xs font-medium"
          >
            <Plus className="size-3.5" />
            <span>Add Step</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimulatorOpen(true)}
            className="h-8 gap-1.5 rounded-lg border-emerald-500/30 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
          >
            <Smartphone className="size-3.5 text-emerald-400" />
            <span>Test Simulator</span>
          </Button>

          <Select
            value={status}
            onValueChange={(val: any) => {
              if (val === 'draft' || val === 'published' || val === 'paused') {
                setStatus(val);
              }
            }}
          >
            <SelectTrigger className="h-8 w-32 text-xs rounded-lg border-border font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published" className="text-xs font-semibold text-emerald-400">🟢 Published (Live)</SelectItem>
              <SelectItem value="draft" className="text-xs">📝 Draft</SelectItem>
              <SelectItem value="paused" className="text-xs text-amber-400">⏸ Paused</SelectItem>
            </SelectContent>
          </Select>

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

      {/* Beginner Step-by-Step Helper Guide Bar */}
      {showBeginnerGuide && (
        <div className="flex items-center justify-between bg-primary/10 border-b border-primary/20 px-4 py-2 text-xs text-foreground z-10 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-6 overflow-x-auto py-0.5">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">1</span>
              <span><strong>Trigger:</strong> When customer messages (e.g. &quot;hi&quot;)</span>
            </div>
            <span className="text-muted-foreground">➔</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="flex size-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">2</span>
              <span><strong>Action:</strong> Send automated WhatsApp reply</span>
            </div>
            <span className="text-muted-foreground">➔</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">3</span>
              <span><strong>Publish:</strong> Select &quot;Published&quot; &amp; Click Save</span>
            </div>
          </div>
          <button
            onClick={() => setShowBeginnerGuide(false)}
            className="text-muted-foreground hover:text-foreground p-1"
            title="Dismiss Guide"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

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
                <span>Add Step</span>
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTemplateGalleryOpen(true)}
                className="h-7 text-xs font-semibold gap-1.5 rounded-lg hover:bg-primary/15 hover:text-primary"
              >
                <Sparkles className="size-3.5 text-primary" />
                <span>Prebuilt Templates</span>
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
      {/* Node Config Drawer (Right Side) with Live WhatsApp Preview   */}
      {/* ============================================================ */}
      {activeNode && (
        <div className="fixed inset-y-0 right-0 w-[420px] border-l bg-card/98 p-5 shadow-2xl backdrop-blur-xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="size-6 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sliders className="size-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Configure Step</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                  {getNodeMeta(((activeNode.data.type || activeNode.data.nodeType || '') as string)).title}
                </span>
              </div>
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
              <Label className="text-xs font-medium text-muted-foreground">Step Label / Title</Label>
              <Input
                value={typeof activeNode.data.label === 'string' ? activeNode.data.label : ''}
                onChange={(e) => updateActiveNodeConfig({}, e.target.value)}
                className="mt-1 h-8 text-xs rounded-lg"
                placeholder="e.g. Send Greeting Message"
              />
            </div>

            {/* Keyword Trigger Config */}
            {(activeNode.data.type === 'trigger_keyword' || activeNode.data.nodeType === 'trigger_keyword') && (
              <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="size-3.5" /> Trigger Keywords (Comma Separated)
                  </Label>
                </div>
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
                  placeholder="hi, hello, hi bhaiya, pricing, start"
                  className="h-8 text-xs rounded-lg bg-background"
                />

                {/* Quick Keyword Add Chips */}
                <div>
                  <span className="text-[10px] text-muted-foreground block mb-1.5 font-medium">Quick add common keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['hi', 'hello', 'hi bhaiya', 'pricing', 'start', 'help', 'namaste'].map((kw) => (
                      <button
                        key={kw}
                        type="button"
                        onClick={() => {
                          const current = Array.isArray((activeNode.data.config as any)?.keywords)
                            ? (activeNode.data.config as any).keywords
                            : [];
                          if (!current.includes(kw)) {
                            updateActiveNodeConfig({ keywords: [...current, kw] });
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 font-medium"
                      >
                        + &quot;{kw}&quot;
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  💡 When any customer on WhatsApp sends a message containing these words, this automation will immediately start and execute!
                </p>
              </div>
            )}

            {/* Message Action Config with Live Preview */}
            {(activeNode.data.type === 'action_send_message' || activeNode.data.nodeType === 'action_send_message') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">WhatsApp Message Text</Label>
                  <span className="text-[10px] text-muted-foreground">Dynamic variables supported</span>
                </div>

                {/* Quick Variable Insertion Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const current = (activeNode.data.config as any)?.message || '';
                      updateActiveNodeConfig({ message: `${current} {{contact.name}}` });
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold border border-primary/20"
                  >
                    + Customer Name
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const current = (activeNode.data.config as any)?.message || '';
                      updateActiveNodeConfig({ message: `${current} {{contact.phone}}` });
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-semibold border border-primary/20"
                  >
                    + Customer Phone
                  </button>
                </div>

                <Textarea
                  rows={4}
                  value={(activeNode.data.config as any)?.message || ''}
                  onChange={(e) => updateActiveNodeConfig({ message: e.target.value })}
                  placeholder="Hello {{contact.name}}! Thank you for reaching out..."
                  className="text-xs rounded-lg resize-none leading-relaxed font-sans"
                />

                {/* WhatsApp Chat Preview Bubble */}
                <div className="mt-3 rounded-xl border border-border bg-[#0b141a] p-3.5 shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-2 tracking-wider">
                    📱 Live WhatsApp Preview
                  </span>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#005c4b] px-3.5 py-2 text-white shadow-md">
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {((activeNode.data.config as any)?.message || 'Hello! Thank you for contacting us.')
                          .replace(/\{\{contact\.name\}\}/g, 'Rahul')
                          .replace(/\{\{contact\.phone\}\}/g, '+91 98765 43210')}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-white/70">
                        <span>12:00 PM</span>
                        <CheckCheck className="size-3 text-[#53bdeb]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Button Action Config */}
            {(activeNode.data.type === 'action_send_interactive' || activeNode.data.nodeType === 'action_send_interactive') && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">Message Body Text</Label>
                <Textarea
                  rows={3}
                  value={(activeNode.data.config as any)?.bodyText || ''}
                  onChange={(e) => updateActiveNodeConfig({ bodyText: e.target.value })}
                  placeholder="Please choose an option below:"
                  className="text-xs rounded-lg resize-none"
                />

                <Label className="text-xs font-semibold text-foreground block pt-2">
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
            {(activeNode.data.type === 'action_gemini_ai' || activeNode.data.nodeType === 'action_gemini_ai') && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">AI System Instruction / Persona</Label>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {[
                    { label: 'Customer Support', prompt: 'You are our official customer support assistant. Answer politely and concisely.' },
                    { label: 'Sales Assistant', prompt: 'You are our sales advisor. Answer product pricing questions and encourage booking a demo.' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateActiveNodeConfig({ systemPrompt: preset.prompt })}
                      className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 font-medium"
                    >
                      Use: {preset.label}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={4}
                  value={(activeNode.data.config as any)?.systemPrompt || ''}
                  onChange={(e) => updateActiveNodeConfig({ systemPrompt: e.target.value })}
                  className="text-xs rounded-lg resize-none"
                />
              </div>
            )}

            {/* Tag Action Config */}
            {(activeNode.data.type === 'action_add_tag' || activeNode.data.nodeType === 'action_add_tag') && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-foreground">Tag Name</Label>
                <Input
                  value={(activeNode.data.config as any)?.tag || ''}
                  onChange={(e) => updateActiveNodeConfig({ tag: e.target.value })}
                  placeholder="e.g. VIP Customer, Hot Lead"
                  className="h-8 text-xs rounded-lg"
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
              className="text-xs h-8 rounded-lg px-4 bg-primary text-primary-foreground font-semibold"
            >
              Done (Apply)
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Quick Add Node Modal                                         */}
      {/* ============================================================ */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-2xl bg-card/98 backdrop-blur-xl border-border rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="size-4 text-primary" />
              <span>Add Workflow Node</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select a trigger, automated message, AI assistant, or logic block to add to your flow.
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-muted text-muted-foreground">
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors mt-0.5">
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
      {/* Prebuilt Starter Templates Modal                             */}
      {/* ============================================================ */}
      <Dialog open={templateGalleryOpen} onOpenChange={setTemplateGalleryOpen}>
        <DialogContent className="max-w-3xl bg-card/98 backdrop-blur-xl border-border rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-primary" />
              <span>Ready-To-Use Workflow Templates</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select any pre-configured template to load it onto your canvas in 1 click.
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
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 flex items-center font-bold">
                        <Icon className="size-3 mr-1" />
                        {tpl.category}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-semibold">{tpl.nodes.length} Steps</span>
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
                      Use Template 🚀
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Test Simulator Drawer (WhatsApp Phone Simulator)             */}
      {/* ============================================================ */}
      {simulatorOpen && (
        <div className="fixed inset-y-0 right-0 w-[400px] border-l bg-[#0b141a] p-5 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="size-6 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Smartphone className="size-3.5" />
                </div>
                <h3 className="text-sm font-bold text-white">WhatsApp Simulator</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSimulatorOpen(false)}
                className="size-7 rounded-lg text-white hover:bg-white/10"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Test Simulation Chat Window */}
            <div className="space-y-3 h-[420px] overflow-y-auto pr-1">
              {simChatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-md',
                    msg.sender === 'user'
                      ? 'ml-auto bg-[#005c4b] text-white rounded-tr-xs'
                      : 'mr-auto bg-[#202c33] text-white rounded-tl-xs'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <span className="text-[9px] text-white/60 self-end mt-1">{msg.time}</span>
                </div>
              ))}
              {executingTest && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold animate-pulse">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Bot is processing and replying...</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Input
                value={simInputMessage}
                onChange={(e) => setSimInputMessage(e.target.value)}
                placeholder="Type 'hi' or a test message..."
                className="h-9 text-xs bg-[#2a3942] border-none text-white rounded-xl placeholder:text-white/40"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !executingTest) handleRunSimulator();
                }}
              />
              <Button
                size="sm"
                onClick={handleRunSimulator}
                disabled={executingTest || !simInputMessage.trim()}
                className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-3 shrink-0 font-semibold"
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
