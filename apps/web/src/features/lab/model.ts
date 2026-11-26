import type { Design, NetworkConfig, Scenario, ServiceConfig } from '@learninglab/catalog';
import type { Edge, Node } from '@xyflow/react';

export interface ServiceNodeData extends Record<string, unknown> {
  service: string;
  label?: string;
  config: ServiceConfig;
}

export type LabNode = Node<ServiceNodeData, 'service'>;
export type LabEdge = Edge;

export function toFlow(design: Design): { nodes: LabNode[]; edges: LabEdge[] } {
  return {
    nodes: design.nodes.map((n) => ({
      id: n.id,
      type: 'service',
      position: { x: n.x, y: n.y },
      data: { service: n.service, config: { ...n.config }, ...(n.label ? { label: n.label } : {}) },
    })),
    edges: design.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? 'r',
      targetHandle: e.targetHandle ?? 'l',
      type: 'flow',
    })),
  };
}

export function toDesign(nodes: LabNode[], edges: LabEdge[], scenario: Scenario, network?: NetworkConfig): Design {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      service: n.data.service,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      config: n.data.config,
      ...(n.data.label ? { label: n.data.label } : {}),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
    })),
    scenario,
    ...(network ? { network } : {}),
  };
}

/** Same design ignoring node positions — used to avoid re-simulating while dragging. */
export function structuralKey(d: Design): string {
  return JSON.stringify([
    d.nodes.map((n) => [n.id, n.service, n.config]),
    d.edges.map((e) => [e.id, e.source, e.target]),
    d.scenario,
    d.network ?? null,
  ]);
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}
