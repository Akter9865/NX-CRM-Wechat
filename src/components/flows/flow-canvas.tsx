'use client';

/**
 * Canvas / mind-map view of a flow with modern n8n & WhatChimp style
 * visual builder ergonomics:
 *
 * 1. Left Sidebar: Draggable & Searchable "Flow blocks" categorized into
 *    Messages, Interactive, Data Collection, and Flow Control.
 * 2. Drag & Drop: Drag any block from sidebar onto canvas to instantiate at
 *    cursor position.
 * 3. Quick-Connect Next Node Menu: Dragging a connection handle to empty
 *    canvas space opens a floating block picker that auto-creates and wires
 *    the next step on selection.
 * 4. Rich FlowNodeCard: WhatChimp-style node presentation with live delivery
 *    timing tags, image previews, and "Compose Next Message" handles.
 * 5. Side-panel Configuration Form: Deep editing for messages, buttons, media
 *    upload/URL, and smart delay options.
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Node as RfNode,
  type Edge as RfEdge,
  type NodeChange,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Clock,
  ChevronDown,
  ChevronRight,
  GripVertical,
  MoveRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  applyEdgeConnection,
  deriveCanvasEdges,
  outgoingSlots,
} from '@/lib/flows/edges';
import { autoLayout, shouldAutoLayout } from '@/lib/flows/layout';
import {
  FLOW_BLOCKS,
  FLOW_BLOCK_CATEGORIES,
  NodeIconChip,
  groupNodeTypesByCategory,
  nodeColors,
  summarizeNode,
  type BuilderNode,
  type FlowBlockItem,
  type NodeType,
} from './shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFlowEditor } from './flow-editor-state';
import { NodeConfigForm } from './forms/node-config-form';

// React-Flow node `data` payload — the bits our custom renderer needs.
interface NodeData extends Record<string, unknown> {
  node: BuilderNode;
  isEntry: boolean;
  /** Validator's "look here" pulse — flashes the card border for ~1.6s. */
  isFlashed: boolean;
}

const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

// ============================================================
// Custom node — styled with WhatChimp / n8n aesthetic
// ============================================================

function slotColor(nodeType: NodeType, slotId: string, fallback: string) {
  if (nodeType === 'condition' && slotId === 'true') {
    return nodeColors('start').solid;
  }
  if (nodeType === 'condition' && slotId === 'false') {
    return nodeColors('handoff').solid;
  }
  return fallback;
}

function FlowNodeCard({ data, selected }: NodeProps) {
  const t = useTranslations('Flows.builder');
  const { node, isEntry, isFlashed } = data as NodeData;
  const c = nodeColors(node.node_type);
  const tSummary = useTranslations('Flows.summary');
  const summary = summarizeNode(node, tSummary);
  const slots = outgoingSlots(node);
  const hasTarget = node.node_type !== 'start';
  const isMultiSlot = slots.length > 1;

  const cfg = node.config as Record<string, unknown>;
  const delaySec = typeof cfg.delay_seconds === 'number' ? cfg.delay_seconds : 0;
  const typingOn = Boolean(cfg.typing_on_display);
  const isMediaImage =
    node.node_type === 'send_media' &&
    cfg.media_type === 'image' &&
    typeof cfg.media_url === 'string' &&
    cfg.media_url.length > 0;

  return (
    <div
      style={
        {
          '--nc': c.solid,
          '--nc-soft': c.soft,
          '--nc-ring': c.ring,
          '--nc-text': c.text,
          borderColor: selected ? c.solid : undefined,
          boxShadow: selected
            ? `0 0 0 1.5px ${c.solid}, 0 16px 36px -12px ${c.ring}`
            : '0 4px 14px -4px rgba(0, 0, 0, 0.15)',
        } as React.CSSProperties
      }
      className={cn(
        'group bg-card relative max-w-[270px] min-w-[240px] rounded-xl border px-3.5 py-3 text-left transition-[box-shadow,border-color]',
        selected
          ? 'border-[var(--nc)] ring-1 ring-[var(--nc-ring)]'
          : 'border-border/80 hover:border-[var(--nc-ring)]',
        isFlashed && '!border-amber-400 ring-2 ring-amber-400/60'
      )}
    >
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-card !h-3 !w-3 !border-2 !border-[var(--nc-ring)] hover:!scale-125 transition-transform"
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <NodeIconChip
          type={node.node_type}
          size={26}
          iconSize={15}
          className="rounded-lg shadow-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="truncate text-[11px] font-bold tracking-wider uppercase"
              style={{ color: c.text }}
            >
              {t(`nodes.${node.node_type}.label`)}
            </span>
          </div>
          <div className="text-muted-foreground/80 truncate font-mono text-[10px]">
            {node.node_key}
          </div>
        </div>

        {isEntry && (
          <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-emerald-400 uppercase">
            {t('badgeEntry')}
          </span>
        )}
      </div>

      {/* Live Timing & Delivery Badges */}
      {(delaySec > 0 || typingOn) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
          {delaySec > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-mono text-primary font-medium">
              <Clock className="h-2.5 w-2.5" />
              {delaySec}s delay
            </span>
          )}
          {typingOn && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 text-sky-400 font-medium">
              💬 typing on
            </span>
          )}
        </div>
      )}

      {/* Image Thumbnail Preview */}
      {isMediaImage && (
        <div className="mt-2 overflow-hidden rounded-md border border-border/80 bg-black/20 max-h-24 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cfg.media_url as string}
            alt="Preview"
            className="max-h-24 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Summary preview */}
      {summary && (
        <div className="text-muted-foreground mt-2 line-clamp-2 text-xs leading-relaxed">
          {summary}
        </div>
      )}

      {/* Multi-slot handles (Buttons, List, Condition) */}
      {isMultiSlot && (
        <div className="border-border/70 mt-2.5 flex flex-col gap-1.5 border-t pt-2">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="text-foreground/90 bg-muted/40 hover:bg-muted/70 relative flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] font-medium transition-colors"
            >
              <span className="truncate" title={slot.label}>
                {slot.label}
              </span>
              <Handle
                type="source"
                id={slot.id}
                position={Position.Right}
                style={{
                  borderColor: slotColor(node.node_type, slot.id, c.solid),
                }}
                className="!bg-card !relative !top-auto !right-auto !h-2.5 !w-2.5 !translate-x-[12px] !transform-none !border-2 hover:!scale-125 transition-transform"
              />
            </div>
          ))}
        </div>
      )}

      {/* Single-slot handle with 'Compose Next Message' label */}
      {!isMultiSlot && slots.length === 1 && (
        <div className="mt-2.5 flex items-center justify-between border-t border-border/70 pt-2 text-[11px]">
          <span className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] font-medium group-hover:text-primary transition-colors">
            <MoveRight className="h-3 w-3 text-primary" />
            {node.node_type === 'start' ? 'First Action' : 'Compose Next Message'}
          </span>
          <Handle
            type="source"
            id={slots[0].id}
            position={Position.Right}
            style={{ borderColor: c.solid }}
            className="!bg-card !relative !top-auto !right-auto !h-3 !w-3 !translate-x-[14px] !transform-none !border-2 !border-primary hover:!scale-125 transition-transform cursor-crosshair"
          />
        </div>
      )}
    </div>
  );
}

const NODE_TYPES = { flow: FlowNodeCard };

// ============================================================
// Left Sidebar: Flow Blocks (Draggable & Searchable)
// ============================================================

function FlowBlocksSidebar({
  onAddBlock,
}: {
  onAddBlock: (block: FlowBlockItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    messages: true,
    interactive: true,
    data_collection: true,
    flow_control: true,
  });

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const filteredBlocks = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FLOW_BLOCKS;
    return FLOW_BLOCKS.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.blurb.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [search]);

  if (collapsed) {
    return (
      <div className="border-r border-border bg-card/90 flex flex-col items-center py-3 px-1.5 w-12 shrink-0 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Expand Flow Blocks Sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="border-r border-border bg-card/95 backdrop-blur flex flex-col w-64 shrink-0 h-full z-10 shadow-sm transition-all select-none">
      {/* Header */}
      <div className="border-b border-border/80 px-3.5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Flow blocks
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks..."
            className="h-8 pl-8 pr-7 text-xs bg-muted/60"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Blocks List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {search ? (
          // Flat list when searching
          <div className="space-y-1.5">
            {filteredBlocks.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">
                No blocks match &quot;{search}&quot;
              </p>
            ) : (
              filteredBlocks.map((block) => (
                <SidebarBlockCard
                  key={block.id}
                  block={block}
                  onAdd={() => onAddBlock(block)}
                />
              ))
            )}
          </div>
        ) : (
          // Categorized groups
          FLOW_BLOCK_CATEGORIES.map((cat) => {
            const catBlocks = FLOW_BLOCKS.filter((b) => b.category === cat.id);
            const isOpen = openCategories[cat.id] ?? true;

            return (
              <div key={cat.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className="flex w-full items-center justify-between px-2 py-1 text-[10.5px] font-bold tracking-wider text-muted-foreground hover:text-foreground uppercase transition-colors"
                >
                  <span>{cat.label}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-normal text-muted-foreground/70">
                      {catBlocks.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-1.5 pt-0.5">
                    {catBlocks.map((block) => (
                      <SidebarBlockCard
                        key={block.id}
                        block={block}
                        onAdd={() => onAddBlock(block)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function SidebarBlockCard({
  block,
  onAdd,
}: {
  block: FlowBlockItem;
  onAdd: () => void;
}) {
  const Icon = block.icon;
  const c = nodeColors(block.node_type);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      'application/reactflow-node',
      JSON.stringify({
        node_type: block.node_type,
        initialConfig: block.initialConfig,
        customKeyBase: block.customKeyBase,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onAdd}
      className="group relative flex items-center gap-2.5 rounded-lg border border-border/70 bg-card p-2 text-left shadow-xs transition-all hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm cursor-grab active:cursor-grabbing"
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-105"
        style={{ background: c.soft, color: c.solid }}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground truncate">
          {block.label}
        </div>
        <div className="text-[10px] text-muted-foreground truncate">
          {block.blurb}
        </div>
      </div>
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
    </div>
  );
}

// ============================================================
// Quick-Connect Next Node Menu (when wire released on canvas)
// ============================================================

interface QuickConnectState {
  fromNodeId: string;
  fromHandleId: string;
  screenPos: { x: number; y: number };
  flowPos: { x: number; y: number };
}

function QuickConnectMenu({
  state,
  onSelect,
  onClose,
}: {
  state: QuickConnectState;
  onSelect: (block: FlowBlockItem) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FLOW_BLOCKS;
    return FLOW_BLOCKS.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.blurb.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [search]);

  // Bound screen position within window
  const left = Math.min(state.screenPos.x + 10, window.innerWidth - 300);
  const top = Math.min(state.screenPos.y - 40, window.innerHeight - 400);

  return (
    <div
      ref={menuRef}
      style={{ left: `${left}px`, top: `${top}px` }}
      className="fixed z-50 w-72 rounded-xl border border-border bg-popover p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between pb-2 border-b border-border/70 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Choose next block
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
        <Input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter blocks..."
          className="h-7 pl-7 text-xs bg-muted/60"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.map((b) => {
          const Icon = b.icon;
          const c = nodeColors(b.node_type);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onSelect(b)}
              className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left text-xs hover:bg-muted transition-colors"
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ background: c.soft, color: c.solid }}
              >
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground truncate text-[11.5px]">
                  {b.label}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {b.blurb}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Root canvas
// ============================================================

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}

function FlowCanvasInner() {
  const t = useTranslations('Flows.builder');
  const {
    state,
    setState,
    addNode,
    updateNodeConfig,
    updateNodePosition,
    updateNodePositions,
    removeNode,
    flashKey,
  } = useFlowEditor();
  const reactFlow = useReactFlow();
  const builderNodes = state.nodes;
  const entryNodeId = state.entry_node_id;

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null);
  const [quickConnect, setQuickConnect] = useState<QuickConnectState | null>(null);
  const connectingHandleRef = useRef<{
    nodeId: string | null;
    handleId: string | null;
  }>({ nodeId: null, handleId: null });

  const selectedNode = useMemo(
    () =>
      selectedNodeKey
        ? (builderNodes.find((n) => n.node_key === selectedNodeKey) ?? null)
        : null,
    [selectedNodeKey, builderNodes]
  );

  const autoLayoutPositions = useMemo(() => {
    const canvasEdges = deriveCanvasEdges(builderNodes);

    return shouldAutoLayout(builderNodes)
      ? autoLayout(
          builderNodes.map((n) => ({
            id: n.node_key,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
          })),
          canvasEdges.map((e) => ({ source: e.source, target: e.target })),
          { direction: 'TB' }
        )
      : null;
  }, [builderNodes]);

  const persistedAutoLayoutRef = useRef(false);
  useEffect(() => {
    if (!autoLayoutPositions || persistedAutoLayoutRef.current) return;
    persistedAutoLayoutRef.current = true;
    updateNodePositions(
      Object.fromEntries(
        [...autoLayoutPositions].map(([key, pos]) => [key, pos])
      )
    );
  }, [autoLayoutPositions, updateNodePositions]);

  const derivedRfNodes = useMemo(() => {
    const nodes: RfNode<NodeData>[] = builderNodes.map((n) => {
      const fallback = autoLayoutPositions?.get(n.node_key);
      return {
        id: n.node_key,
        type: 'flow',
        position: {
          x: fallback?.x ?? n.position_x ?? 0,
          y: fallback?.y ?? n.position_y ?? 0,
        },
        data: {
          node: n,
          isEntry: n.node_key === entryNodeId,
          isFlashed: n.node_key === flashKey,
        },
      };
    });

    return nodes;
  }, [builderNodes, entryNodeId, flashKey, autoLayoutPositions]);

  const [rfNodes, setRfNodes] = useState<RfNode<NodeData>[]>(derivedRfNodes);

  useEffect(() => {
    setRfNodes(derivedRfNodes);
  }, [derivedRfNodes]);

  const rfEdges = useMemo(() => {
    const canvasEdges = deriveCanvasEdges(builderNodes);

    const rfEdges: RfEdge[] = canvasEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      label: e.label,
      labelStyle: { fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: 'var(--card)' },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
      style: { stroke: 'var(--border)', strokeWidth: 2 },
    }));

    return rfEdges;
  }, [builderNodes]);

  const handleNodesChange = useCallback(
    (changes: NodeChange<RfNode<NodeData>>[]) => {
      setRfNodes((nodes) => applyNodeChanges(changes, nodes));
    },
    []
  );

  const handleNodeDragStop = useCallback<OnNodeDrag<RfNode<NodeData>>>(
    (_event, node) => {
      updateNodePosition(node.id, node.position.x, node.position.y);
    },
    [updateNodePosition]
  );

  // Pan to the flashed node
  useEffect(() => {
    if (!flashKey) return;
    const node = builderNodes.find((n) => n.node_key === flashKey);
    if (!node) return;
    const x = (node.position_x ?? 0) + NODE_WIDTH / 2;
    const y = (node.position_y ?? 0) + NODE_HEIGHT / 2;
    reactFlow.setCenter(x, y, {
      zoom: reactFlow.getZoom(),
      duration: 400,
    });
  }, [flashKey, builderNodes, reactFlow]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: RfNode<NodeData>) => {
      setSelectedNodeKey(node.id);
    },
    []
  );

  // Drag-to-connect existing handles
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (
        !connection.source ||
        !connection.target ||
        !connection.sourceHandle
      ) {
        return;
      }
      const sourceNode = builderNodes.find(
        (n) => n.node_key === connection.source
      );
      if (!sourceNode) return;
      if (connection.source === connection.target) return;
      const patch = applyEdgeConnection(
        sourceNode,
        connection.sourceHandle,
        connection.target
      );
      if (patch) updateNodeConfig(connection.source, patch);
    },
    [builderNodes, updateNodeConfig]
  );

  // Quick-Connect Tracking
  const handleConnectStart = useCallback(
    (
      _event: MouseEvent | TouchEvent,
      params: { nodeId: string | null; handleId: string | null }
    ) => {
      connectingHandleRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
      };
    },
    []
  );

  const handleConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const targetIsPane = (event.target as HTMLElement)?.classList.contains(
        'react-flow__pane'
      );
      const { nodeId, handleId } = connectingHandleRef.current;

      if (targetIsPane && nodeId && handleId) {
        const clientX =
          'clientX' in event ? event.clientX : event.changedTouches?.[0]?.clientX ?? 0;
        const clientY =
          'clientY' in event ? event.clientY : event.changedTouches?.[0]?.clientY ?? 0;

        const flowPos = reactFlow.screenToFlowPosition({
          x: clientX,
          y: clientY,
        });

        setQuickConnect({
          fromNodeId: nodeId,
          fromHandleId: handleId,
          screenPos: { x: clientX, y: clientY },
          flowPos,
        });
      }

      connectingHandleRef.current = { nodeId: null, handleId: null };
    },
    [reactFlow]
  );

  const handleQuickConnectSelect = useCallback(
    (block: FlowBlockItem) => {
      if (!quickConnect) return;
      const { fromNodeId, fromHandleId, flowPos } = quickConnect;

      // 1. Create new node
      const newKey = addNode(block.node_type, block.initialConfig, block.customKeyBase);
      updateNodePosition(newKey, flowPos.x - NODE_WIDTH / 2, flowPos.y - NODE_HEIGHT / 2);

      // 2. Connect from source node to new node
      const sourceNode = builderNodes.find((n) => n.node_key === fromNodeId);
      if (sourceNode) {
        const patch = applyEdgeConnection(sourceNode, fromHandleId, newKey);
        if (patch) updateNodeConfig(fromNodeId, patch);
      }

      // 3. Open editing sheet for the new node
      setSelectedNodeKey(newKey);
      setQuickConnect(null);
    },
    [quickConnect, addNode, updateNodePosition, builderNodes, updateNodeConfig]
  );

  // Drag & drop from left sidebar onto canvas
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/reactflow-node');
      if (!raw) return;

      try {
        const { node_type, initialConfig, customKeyBase } = JSON.parse(raw);
        const pos = reactFlow.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newKey = addNode(node_type, initialConfig, customKeyBase);
        updateNodePosition(newKey, pos.x - NODE_WIDTH / 2, pos.y - NODE_HEIGHT / 2);
        setSelectedNodeKey(newKey);
      } catch {
        // Ignore invalid drop payload
      }
    },
    [addNode, updateNodePosition, reactFlow]
  );

  const handleAddFromSidebar = useCallback(
    (block: FlowBlockItem) => {
      const newKey = addNode(block.node_type, block.initialConfig, block.customKeyBase);
      const root = document.querySelector('.react-flow') as HTMLElement | null;
      if (root) {
        const rect = root.getBoundingClientRect();
        const center = reactFlow.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
        updateNodePosition(
          newKey,
          center.x - NODE_WIDTH / 2,
          center.y - NODE_HEIGHT / 2
        );
      }
      setSelectedNodeKey(newKey);
    },
    [addNode, updateNodePosition, reactFlow]
  );

  const handleNodesDelete = useCallback(
    (deleted: RfNode<NodeData>[]) => {
      for (const n of deleted) {
        removeNode(n.id);
        if (selectedNodeKey === n.id) setSelectedNodeKey(null);
      }
    },
    [removeNode, selectedNodeKey]
  );

  const handleEdgesDelete = useCallback(
    (deleted: RfEdge[]) => {
      for (const e of deleted) {
        if (!e.sourceHandle) continue;
        const sourceNode = builderNodes.find((n) => n.node_key === e.source);
        if (!sourceNode) continue;
        const patch = applyEdgeConnection(sourceNode, e.sourceHandle, '');
        if (patch) updateNodeConfig(e.source, patch);
      }
    },
    [builderNodes, updateNodeConfig]
  );

  const onSelectedUpdateConfig = useCallback(
    (patch: Record<string, unknown>) => {
      if (selectedNodeKey) updateNodeConfig(selectedNodeKey, patch);
    },
    [selectedNodeKey, updateNodeConfig]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedNodeKey) return;
    removeNode(selectedNodeKey);
    setSelectedNodeKey(null);
  }, [selectedNodeKey, removeNode]);

  const handleSetEntry = useCallback(() => {
    if (!selectedNodeKey) return;
    setState((s) => ({ ...s, entry_node_id: selectedNodeKey }));
  }, [selectedNodeKey, setState]);

  return (
    <>
      <div className="relative flex h-full w-full overflow-hidden">
        {/* Left Sidebar: Draggable & Searchable Flow Blocks */}
        <FlowBlocksSidebar onAddBlock={handleAddFromSidebar} />

        {/* Main Canvas */}
        <div
          className="relative flex-1 h-full w-full overflow-hidden"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
            onNodesChange={handleNodesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={handleNodeClick}
            onConnect={handleConnect}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
            onNodesDelete={handleNodesDelete}
            onEdgesDelete={handleEdgesDelete}
            deleteKeyCode={['Backspace', 'Delete']}
            nodesConnectable={true}
            edgesFocusable={true}
            elementsSelectable={true}
            minZoom={0.2}
            maxZoom={1.5}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1.4}
              color="var(--border)"
            />
            <Controls
              className="!border-border !bg-card [&_button]:!border-border [&_button]:!bg-card [&_button:hover]:!bg-muted [&_button_svg]:!fill-foreground !overflow-hidden !rounded-xl !border !shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]"
              showInteractive={false}
            />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) =>
                nodeColors((n.data as NodeData).node.node_type).solid
              }
              nodeStrokeWidth={0}
              nodeBorderRadius={4}
              maskColor="color-mix(in oklch, var(--background) 70%, transparent)"
              className="!border-border !bg-card !rounded-xl !border !shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)]"
            />
            <Panel position="top-left" className="!top-4 !left-4 flex items-center gap-2.5">
              <CanvasAddNodeButton t={t} />
              <CanvasTriggerBadge
                onSelectEntry={() => {
                  if (entryNodeId) setSelectedNodeKey(entryNodeId);
                  else if (builderNodes[0]) setSelectedNodeKey(builderNodes[0].node_key);
                }}
              />
            </Panel>
          </ReactFlow>

          {/* Floating Quick Connect Menu */}
          {quickConnect && (
            <QuickConnectMenu
              state={quickConnect}
              onSelect={handleQuickConnectSelect}
              onClose={() => setQuickConnect(null)}
            />
          )}
        </div>
      </div>

      {/* Node Configuration Side Sheet */}
      <NodeEditSheet
        node={selectedNode}
        isEntry={selectedNode?.node_key === entryNodeId}
        allNodes={builderNodes}
        onClose={() => setSelectedNodeKey(null)}
        onUpdateConfig={onSelectedUpdateConfig}
        onDelete={handleDeleteSelected}
        onSetEntry={handleSetEntry}
        t={t}
      />
    </>
  );
}

// ============================================================
// Side panel for Node Configuration
// ============================================================

function NodeEditSheet({
  node,
  isEntry,
  allNodes,
  onClose,
  onUpdateConfig,
  onDelete,
  onSetEntry,
  t,
}: {
  node: BuilderNode | null;
  isEntry: boolean;
  allNodes: BuilderNode[];
  onClose: () => void;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onSetEntry: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const open = node !== null;
  if (!node) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md" />
      </Sheet>
    );
  }
  const c = nodeColors(node.node_type);
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="border-border bg-popover flex w-full flex-col gap-0 border-l p-0 sm:max-w-md"
      >
        <SheetHeader className="border-border flex-row items-center gap-3 space-y-0 border-b px-5 py-4">
          <NodeIconChip type={node.node_type} size={36} iconSize={18} />
          <div className="min-w-0 flex-1">
            <SheetTitle className="flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
              <span style={{ color: c.text }}>{t(`nodes.${node.node_type}.label`)}</span>
              {isEntry && (
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-emerald-300 uppercase">
                  {t('badgeEntry')}
                </span>
              )}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
              {t(`nodes.${node.node_type}.blurb`)}
            </SheetDescription>
          </div>
          <code className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px]">
            {node.node_key}
          </code>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          <NodeConfigForm
            node={node}
            allNodes={allNodes}
            showAdvanced={false}
            onUpdateConfig={onUpdateConfig}
          />
        </div>

        <SheetFooter className="border-border border-t px-5 py-3 sm:flex-row sm:justify-between">
          {!isEntry ? (
            <Button variant="ghost" size="sm" onClick={onSetEntry}>
              {t('setAsEntry')}
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('deleteNode')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================
// Add Node Button & Trigger Badge
// ============================================================

const ADD_NODE_TYPES: NodeType[] = [
  'start',
  'send_buttons',
  'send_list',
  'send_message',
  'send_media',
  'collect_input',
  'condition',
  'set_tag',
  'handoff',
  'end',
];

function CanvasAddNodeButton({ t }: { t: ReturnType<typeof useTranslations> }) {
  const reactFlow = useReactFlow();
  const { addNode, updateNodePosition } = useFlowEditor();

  const handleAdd = (type: NodeType) => {
    const key = addNode(type);
    const root = document.querySelector('.react-flow') as HTMLElement | null;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const center = reactFlow.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    updateNodePosition(
      key,
      center.x - NODE_WIDTH / 2,
      center.y - NODE_HEIGHT / 2
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="bg-primary text-primary-foreground hover:bg-primary-hover inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-medium shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)] transition-colors"
        aria-label={t('addNode')}
      >
        <Plus className="h-4 w-4" />
        {t('addNode')}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="border-border bg-popover w-[268px] p-1.5"
      >
        {groupNodeTypesByCategory(ADD_NODE_TYPES).map((group, i) => (
          <Fragment key={group.id}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase">
                {t(`categories.${group.id}`)}
              </DropdownMenuLabel>
              {group.types.map((t_type) => {
                return (
                  <DropdownMenuItem
                    key={t_type}
                    onClick={() => handleAdd(t_type)}
                    className="gap-3 py-2"
                  >
                    <NodeIconChip
                      type={t_type}
                      size={28}
                      iconSize={16}
                      className="rounded-md"
                    />
                    <span className="flex flex-col">
                      <span className="text-popover-foreground text-[13px] font-semibold">
                        {t(`nodes.${t_type}.label`)}
                      </span>
                      <span className="text-muted-foreground text-[11.5px]">
                        {t(`nodes.${t_type}.blurb`)}
                      </span>
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CanvasTriggerBadge({ onSelectEntry }: { onSelectEntry: () => void }) {
  const { state } = useFlowEditor();

  const isKeyword = state.trigger_type === 'keyword';
  const rawKeywords = state.trigger_config?.keywords;
  const keywords = Array.isArray(rawKeywords)
    ? (rawKeywords as string[])
    : typeof rawKeywords === 'string'
      ? rawKeywords.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

  const label = isKeyword
    ? keywords.length > 0
      ? `Trigger: "${keywords.slice(0, 3).join('", "')}"${keywords.length > 3 ? ` +${keywords.length - 3}` : ''}`
      : 'Trigger: No keywords (Click to set)'
    : state.trigger_type === 'first_inbound_message'
      ? 'Trigger: First inbound message'
      : 'Trigger: Manual start';

  const hasKeywords = !isKeyword || keywords.length > 0;

  return (
    <button
      type="button"
      onClick={onSelectEntry}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)] transition-colors border',
        hasKeywords
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 animate-pulse'
      )}
      title="Click to view and edit Flow Trigger in Start Node"
    >
      <Zap className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  );
}
