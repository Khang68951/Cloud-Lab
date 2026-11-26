import '@xyflow/react/dist/style.css';
import { DEFAULT_NETWORK, designSchema, getService, TEMPLATES, type Design } from '@cloudlab/catalog';
import { challengeDesign, gradeCanvas, type CanvasChallenge, type GradeResult } from '@cloudlab/exercise-kit';
import { localize } from '@cloudlab/shared';
import { simulate, type Finding } from '@cloudlab/sim-engine';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react';
import { toPng } from 'html-to-image';
import { Tabs } from 'radix-ui';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { writeDraft } from './draft';
import { useToast } from '@/components/ui/toast-context';
import { useRecordAttempt } from '@/features/progress/api';
import { currentLocale } from '@/i18n';
import { useTheme } from '@/theme/context';
import { LabContext } from './context';
import { EdgeMarkers, FlowEdge } from './FlowEdge';
import { structuralKey, toDesign, type LabNode } from './model';
import { DND_TYPE, Palette } from './Palette';
import { ChallengePanel } from './panels/ChallengePanel';
import { CostPanel } from './panels/CostPanel';
import { NodeInspector, ScenarioEditor } from './panels/Inspector';
import { VpcEditor } from './panels/NetworkPanel';
import { ReviewPanel } from './panels/ReviewPanel';
import { SummaryCard } from './panels/SummaryCard';
import { ServiceNode } from './ServiceNode';
import { LabToolbar } from './Toolbar';
import { NetworkFrames } from './NetworkFrames';
import { useLabEditor } from './useLabEditor';

const nodeTypes: NodeTypes = { service: ServiceNode };
const edgeTypes: EdgeTypes = { flow: FlowEdge };

/** Where the "back to lesson" buttons lead (set when the Lab was opened from a lesson). */
export interface BackTo {
  to: string;
  /** Lesson title, when the target is a lesson page. */
  label: string | null;
}

interface Props {
  initial: Design;
  backTo?: BackTo;
  initialTitle?: string;
  initialDesignId?: number | null;
  challenge?: CanvasChallenge;
}

export function LabWorkspace(props: Props) {
  return (
    <ReactFlowProvider>
      <Workspace {...props} />
    </ReactFlowProvider>
  );
}

type Tab = 'brief' | 'cost' | 'inspect' | 'review';

function Workspace({ initial, initialTitle = '', initialDesignId = null, challenge, backTo }: Props) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const toast = useToast();
  const { resolved: theme } = useTheme();
  const flow = useReactFlow();
  const editor = useLabEditor(initial);
  const wrapper = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(initialTitle);
  const [designId, setDesignId] = useState<number | null>(initialDesignId);
  const [tab, setTab] = useState<Tab>(challenge ? 'brief' : 'cost');
  const [azDown, setAzDown] = useState(false);
  const [spike, setSpike] = useState(false);
  const [killed, setKilled] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [hintsShown, setHintsShown] = useState(0);
  const [submission, setSubmission] = useState<GradeResult | null>(null);
  const recordAttempt = useRecordAttempt();

  // --- Simulation (re-run only when structure/config/scenario changes, not on drag).
  /** Exact current diagram, including node positions (for saving/exporting). */
  const liveDesign = useMemo(() => {
    const d = toDesign(editor.nodes, editor.edges, editor.scenario, editor.network);
    return challenge ? challengeDesign(challenge, d) : d;
  }, [editor.nodes, editor.edges, editor.scenario, editor.network, challenge]);
  const key = structuralKey(liveDesign);
  /** Changes only when structure/config/scenario change — not while dragging. */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the structural key on purpose
  const design = useMemo(() => liveDesign, [key]);
  const chaos = useMemo(
    () => ({ azDown, killed: [...killed], trafficMultiplier: spike ? 10 : 1 }),
    [azDown, killed, spike],
  );
  const chaosActive = azDown || spike || killed.size > 0;
  const result = useMemo(() => simulate(design, chaos), [design, chaos]);

  const selected = editor.nodes.filter((n) => n.selected);
  const selectedNode = selected.length === 1 ? selected[0] : undefined;


  // --- Draft autosave (free mode only).
  useEffect(() => {
    if (challenge) return;
    const handle = window.setTimeout(() => {
      writeDraft({ title, designId, design: liveDesign });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [liveDesign, title, designId, challenge]);

  // --- Keyboard shortcuts: undo / redo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editor]);

  // --- Adding services: drag & drop, or click in the palette.
  const addAt = useCallback(
    (serviceId: string, clientX?: number, clientY?: number) => {
      const rect = wrapper.current?.getBoundingClientRect();
      const x = clientX ?? (rect ? rect.left + rect.width / 2 : 400);
      const y = clientY ?? (rect ? rect.top + rect.height / 2 : 300);
      const pos = flow.screenToFlowPosition({ x, y });
      // Centre the node on the cursor (node is ~176×86).
      let target = { x: Math.round(pos.x - 88), y: Math.round(pos.y - 43) };
      if (clientX === undefined) {
        // Clicked in the palette: find the nearest free slot so nodes never stack.
        const taken = (p: { x: number; y: number }) =>
          editor.nodes.some((n) => Math.abs(n.position.x - p.x) < 200 && Math.abs(n.position.y - p.y) < 110);
        for (let i = 0; i < 40 && taken(target); i++) {
          target = { x: target.x + 230, y: i % 4 === 3 ? target.y + 150 : target.y };
          if (i % 4 === 3) target.x -= 230 * 4;
        }
      }
      editor.addService(serviceId, target);
      setTab('inspect');
    },
    [editor, flow],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData(DND_TYPE);
      if (id && getService(id)) addAt(id, e.clientX, e.clientY);
    },
    [addAt],
  );

  const focusFinding = useCallback(
    (f: Finding) => {
      if (!f.nodeIds.length) return;
      setHighlighted(new Set(f.nodeIds));
      editor.selectOnly([f.nodeIds[0]!]);
      void flow.fitView({ nodes: f.nodeIds.map((id) => ({ id })), duration: 400, maxZoom: 1.2, padding: 0.6 });
      window.setTimeout(() => setHighlighted(new Set()), 2000);
    },
    [editor, flow],
  );

  const focusNode = useCallback(
    (id: string) => {
      editor.selectOnly([id]);
      void flow.fitView({ nodes: [{ id }], duration: 300, maxZoom: 1.2, padding: 1 });
    },
    [editor, flow],
  );

  const toggleKill = useCallback((id: string) => {
    setKilled((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const loadDesign = useCallback(
    (d: Design, opts: { title?: string; id?: number | null } = {}) => {
      editor.replace(d);
      if (opts.title !== undefined) setTitle(opts.title);
      if (opts.id !== undefined) setDesignId(opts.id);
      setKilled(new Set());
      window.setTimeout(() => void flow.fitView({ duration: 300, padding: 0.15, maxZoom: 1, minZoom: 0.5 }), 50);
    },
    [editor, flow],
  );

  const exportPng = useCallback(async () => {
    const viewport = wrapper.current?.querySelector<HTMLElement>('.react-flow__viewport');
    if (!viewport || editor.nodes.length === 0) return;
    const bounds = getNodesBounds(editor.nodes);
    const w = Math.min(4000, bounds.width + 160);
    const h = Math.min(4000, bounds.height + 160);
    const vp = getViewportForBounds(bounds, w, h, 0.2, 2, 0.1);
    const bg = getComputedStyle(document.body).backgroundColor;
    const url = await toPng(viewport, {
      backgroundColor: bg,
      width: w,
      height: h,
      style: { width: `${w}px`, height: `${h}px`, transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` },
    });
    download(url, `${slugify(title || 'cloudlab-design')}.png`);
  }, [editor.nodes, title]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(liveDesign, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    download(url, `${slugify(title || 'cloudlab-design')}.json`);
    URL.revokeObjectURL(url);
  }, [liveDesign, title]);

  const importJson = useCallback(
    async (file: File) => {
      try {
        const parsed = designSchema.safeParse(JSON.parse(await file.text()));
        if (!parsed.success) throw new Error('invalid');
        loadDesign(parsed.data, { title: file.name.replace(/\.json$/i, ''), id: null });
        toast(t('toast.imported'), 'success');
      } catch {
        toast(t('toast.importFailed'), 'error');
      }
    },
    [loadDesign, toast, t],
  );

  const submit = useCallback(() => {
    if (!challenge) return;
    const graded = gradeCanvas(challenge, liveDesign);
    const { sim: _sim, ...res } = graded;
    setSubmission(res);
    recordAttempt.mutate({
      exerciseId: challenge.id,
      kind: challenge.kind,
      passed: res.passed,
      score: res.score,
      hintsUsed: hintsShown,
      answer: liveDesign,
    });
    toast(res.passed ? t('challenge.passed') : t('challenge.failed', { score: res.score }), res.passed ? 'success' : 'error');
  }, [challenge, liveDesign, hintsShown, recordAttempt, toast, t]);

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    ...(challenge ? [{ id: 'brief' as const, label: t('tabs.brief') }] : []),
    { id: 'cost', label: t('tabs.cost') },
    { id: 'inspect', label: selectedNode ? t('tabs.inspect') : t('tabs.scenario') },
    { id: 'review', label: t('tabs.review'), badge: result.findings.filter((f) => f.severity !== 'info').length },
  ];

  return (
    <LabContext.Provider value={{ result, highlighted, killed }}>
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col">
        <LabToolbar
          mode={challenge ? 'challenge' : 'free'}
          backTo={backTo}
          title={challenge ? localize(challenge.title, locale) : title}
          onTitle={setTitle}
          designId={designId}
          onSaved={(id) => setDesignId(id)}
          getDesign={() => liveDesign}
          monthlyUsd={result.totals.monthlyUsd}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          onTemplate={(id) => {
            const tpl = TEMPLATES.find((x) => x.id === id);
            if (tpl) loadDesign(tpl.design, { title: localize(tpl.name, locale), id: null });
          }}
          onOpen={(d, meta) => loadDesign(d, meta)}
          onResetChallenge={() => challenge && loadDesign(challenge.starter)}
          chaos={{ azDown, spike, killedCount: killed.size }}
          onChaos={{
            azDown: () => setAzDown((v) => !v),
            spike: () => setSpike((v) => !v),
            reset: () => {
              setAzDown(false);
              setSpike(false);
              setKilled(new Set());
            },
          }}
          onExportPng={exportPng}
          onExportJson={exportJson}
          onImportJson={importJson}
        />

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block" aria-label={t('palette.title')}>
            <Palette onAdd={(id) => addAt(id)} />
          </aside>

          <div
            ref={wrapper}
            className="relative min-w-0 flex-1"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={onDrop}
            data-testid="lab-canvas"
          >
            <EdgeMarkers />
            <ReactFlow<LabNode>
              nodes={editor.nodes}
              edges={editor.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={editor.onNodesChange}
              onEdgesChange={editor.onEdgesChange}
              onConnect={editor.connect}
              onNodeClick={() => setTab('inspect')}
              onNodeDragStart={() => editor.checkpoint()}
              onBeforeDelete={async ({ nodes, edges }) => {
                if (nodes.length || edges.length) editor.checkpoint();
                return true;
              }}
              connectionMode={ConnectionMode.Loose}
              defaultEdgeOptions={{ type: 'flow' }}
              colorMode={theme}
              fitView
              fitViewOptions={{ padding: 0.15, maxZoom: 1, minZoom: 0.5 }}
              minZoom={0.2}
              maxZoom={2}
              snapToGrid
              snapGrid={[10, 10]}
              deleteKeyCode={['Delete', 'Backspace']}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} />
              <NetworkFrames network={design.network ?? DEFAULT_NETWORK} />
              <Controls showInteractive={false} position="bottom-left" />
              <MiniMap pannable zoomable position="bottom-right" className="hidden! xl:block!" style={{ width: 160, height: 100 }} />
            </ReactFlow>
            {editor.nodes.length <= 1 && (
              <div className="pointer-events-none absolute inset-x-0 top-6 mx-auto w-fit max-w-[90%] rounded-lg border bg-card/95 px-4 py-2.5 text-center text-sm shadow-sm">
                {t('emptyHint')}
              </div>
            )}
          </div>

          <aside className="flex w-85 shrink-0 flex-col border-l bg-card max-md:hidden" aria-label={t('panel.title')}>
            <SummaryCard result={result} chaosActive={chaosActive} />
            <Tabs.Root value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 flex-1 flex-col">
              <Tabs.List className="flex shrink-0 gap-1 border-b px-2" aria-label={t('panel.title')}>
                {tabs.map((x) => (
                  <Tabs.Trigger
                    key={x.id}
                    value={x.id}
                    className="relative -mb-px flex items-center gap-1.5 border-b-2 border-transparent px-2 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
                  >
                    {x.label}
                    {!!x.badge && (
                      <span className="rounded-full bg-warning-soft px-1.5 text-[10px] font-semibold text-warning tabular-nums">{x.badge}</span>
                    )}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {challenge && (
                  <Tabs.Content value="brief">
                    <ChallengePanel
                      challenge={challenge}
                      design={design}
                      result={result}
                      hintsShown={hintsShown}
                      onHint={() => setHintsShown((n) => n + 1)}
                      onSubmit={submit}
                      submitting={recordAttempt.isPending}
                      submission={submission}
                      onShowReference={() => loadDesign(challenge.reference)}
                      backTo={backTo}
                    />
                  </Tabs.Content>
                )}
                <Tabs.Content value="cost">
                  <CostPanel result={result} nodes={editor.nodes} region={design.scenario.region} onSelect={focusNode} />
                </Tabs.Content>
                <Tabs.Content value="inspect">
                  {selectedNode ? (
                    <NodeInspector
                      key={selectedNode.id}
                      node={selectedNode}
                      result={result.nodes[selectedNode.id]}
                      killed={killed.has(selectedNode.id)}
                      onConfig={(k, v) => editor.updateConfig(selectedNode.id, k, v)}
                      onClearConfig={(k) => editor.clearConfig(selectedNode.id, k)}
                      nodes={editor.nodes}
                      edges={editor.edges}
                      sim={result}
                      network={design.network ?? DEFAULT_NETWORK}
                      onRename={(l) => editor.renameNode(selectedNode.id, l)}
                      onDelete={() => editor.removeNodes([selectedNode.id])}
                      onDuplicate={() => editor.duplicateNode(selectedNode.id)}
                      onToggleKill={() => toggleKill(selectedNode.id)}
                    />
                  ) : (
                    <>
                      <ScenarioEditor scenario={design.scenario} locked={Boolean(challenge)} onChange={editor.setScenario} />
                      <VpcEditor network={design.network ?? DEFAULT_NETWORK} sim={result} nodes={editor.nodes} onChange={editor.setNetwork} />
                    </>
                  )}
                </Tabs.Content>
                <Tabs.Content value="review">
                  <ReviewPanel result={result} onFocus={focusFinding} />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </aside>
        </div>
        <div className="flex items-center justify-between gap-3 border-t bg-card px-4 py-2 text-sm md:hidden">
          <span className="text-muted-foreground">{t('mobileHint')}</span>
        </div>
      </div>
    </LabContext.Provider>
  );
}

function download(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

function slugify(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'design'
  );
}
