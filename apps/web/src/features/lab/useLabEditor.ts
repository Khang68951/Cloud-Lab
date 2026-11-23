import { defaultConfig, getService, type Design, type Scenario, type ServiceConfig } from '@cloudlab/catalog';
import { addEdge, useEdgesState, useNodesState, type Connection, type XYPosition } from '@xyflow/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { newId, toDesign, toFlow, type LabEdge, type LabNode } from './model';

const HISTORY_LIMIT = 100;

interface History {
  past: Design[];
  future: Design[];
}

/**
 * All editing state of the Lab canvas: nodes, edges, scenario and undo/redo.
 * Every mutation goes through a function here so history stays correct.
 */
export function useLabEditor(initial: Design) {
  const init = useMemo(() => toFlow(initial), [initial]);
  const [nodes, setNodes, onNodesChange] = useNodesState<LabNode>(init.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<LabEdge>(init.edges);
  const [scenario, setScenarioState] = useState<Scenario>(initial.scenario);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  /** Merges rapid edits of the same field (typing) into one undo step. Only read in callbacks. */
  const coalesce = useRef<{ key: string; at: number } | null>(null);

  const snapshot = useCallback(() => toDesign(nodes, edges, scenario), [nodes, edges, scenario]);

  const checkpoint = useCallback(
    (coalesceKey?: string) => {
      const now = Date.now();
      const last = coalesce.current;
      if (coalesceKey && last?.key === coalesceKey && now - last.at < 1000) {
        last.at = now;
        return;
      }
      coalesce.current = coalesceKey ? { key: coalesceKey, at: now } : null;
      const snap = snapshot();
      setHistory((h) => ({ past: [...h.past.slice(-HISTORY_LIMIT + 1), snap], future: [] }));
    },
    [snapshot],
  );

  const load = useCallback(
    (d: Design) => {
      const f = toFlow(d);
      setNodes(f.nodes);
      setEdges(f.edges);
      setScenarioState(d.scenario);
    },
    [setNodes, setEdges],
  );

  const replace = useCallback(
    (d: Design) => {
      checkpoint();
      load(d);
    },
    [checkpoint, load],
  );

  const undo = useCallback(() => {
    const prev = history.past.at(-1);
    if (!prev) return;
    const current = snapshot();
    coalesce.current = null;
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [...h.future, current] }));
    load(prev);
  }, [history.past, load, snapshot]);

  const redo = useCallback(() => {
    const next = history.future.at(-1);
    if (!next) return;
    const current = snapshot();
    coalesce.current = null;
    setHistory((h) => ({ past: [...h.past, current], future: h.future.slice(0, -1) }));
    load(next);
  }, [history.future, load, snapshot]);

  const addService = useCallback(
    (serviceId: string, position: XYPosition) => {
      const def = getService(serviceId);
      if (!def) return null;
      checkpoint();
      const id = newId(serviceId);
      const node: LabNode = { id, type: 'service', position, data: { service: serviceId, config: defaultConfig(def) }, selected: true };
      setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), node]);
      return id;
    },
    [checkpoint, setNodes],
  );

  const connect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      if (edges.some((e) => e.source === c.source && e.target === c.target)) return;
      checkpoint();
      setEdges((es) => addEdge({ ...c, id: newId('e'), type: 'flow' }, es));
    },
    [checkpoint, edges, setEdges],
  );

  const updateConfig = useCallback(
    (nodeId: string, key: string, value: ServiceConfig[string]) => {
      checkpoint(`cfg:${nodeId}:${key}`);
      setNodes((ns) =>
        ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n)),
      );
    },
    [checkpoint, setNodes],
  );

  const renameNode = useCallback(
    (nodeId: string, label: string) => {
      checkpoint(`label:${nodeId}`);
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== nodeId) return n;
          const data = { ...n.data };
          if (label.trim()) data.label = label.slice(0, 60);
          else delete data.label;
          return { ...n, data };
        }),
      );
    },
    [checkpoint, setNodes],
  );

  const removeNodes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      checkpoint();
      const set = new Set(ids);
      setNodes((ns) => ns.filter((n) => !set.has(n.id)));
      setEdges((es) => es.filter((e) => !set.has(e.source) && !set.has(e.target)));
    },
    [checkpoint, setNodes, setEdges],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const src = nodes.find((n) => n.id === nodeId);
      if (!src) return;
      checkpoint();
      const id = newId(src.data.service);
      setNodes((ns) => [
        ...ns.map((n) => ({ ...n, selected: false })),
        {
          ...src,
          id,
          selected: true,
          position: { x: src.position.x + 40, y: src.position.y + 40 },
          data: { ...src.data, config: { ...src.data.config } },
        },
      ]);
    },
    [checkpoint, nodes, setNodes],
  );

  const setScenario = useCallback(
    (patch: Partial<Scenario>) => {
      checkpoint(`scenario:${Object.keys(patch).join(',')}`);
      setScenarioState((s) => ({ ...s, ...patch }));
    },
    [checkpoint],
  );

  const selectOnly = useCallback(
    (ids: string[]) => {
      const set = new Set(ids);
      setNodes((ns) => ns.map((n) => ({ ...n, selected: set.has(n.id) })));
      setEdges((es) => es.map((e) => ({ ...e, selected: false })));
    },
    [setNodes, setEdges],
  );

  return {
    nodes,
    edges,
    scenario,
    onNodesChange,
    onEdgesChange,
    checkpoint,
    replace,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    addService,
    connect,
    updateConfig,
    renameNode,
    removeNodes,
    duplicateNode,
    setScenario,
    selectOnly,
  };
}

export type LabEditor = ReturnType<typeof useLabEditor>;
