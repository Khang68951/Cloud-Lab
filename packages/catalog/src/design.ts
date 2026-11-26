import { z } from 'zod';
import type { Scenario } from './types.ts';

/**
 * A saved architecture diagram. Plain JSON — stored in the DB, exported to
 * files, used by templates and challenges.
 */
export const scenarioSchema = z.object({
  rps: z.number().min(0).max(10_000_000),
  peakMultiplier: z.number().min(1).max(100),
  readRatio: z.number().min(0).max(1),
  payloadKB: z.number().min(0.1).max(100_000),
  region: z.enum(['us-east-1', 'ap-southeast-1']),
});

export const designNodeSchema = z.object({
  id: z.string().min(1),
  service: z.string().min(1),
  x: z.number(),
  y: z.number(),
  /** Optional display name, e.g. "Orders API". */
  label: z.string().max(60).optional(),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export const designEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
});

/** VPC layout (CIDR blocks). Optional: designs without it use DEFAULT_NETWORK. */
export const networkSchema = z.object({
  vpcCidr: z.string().max(20),
  publicCidr: z.string().max(20),
  privateCidr: z.string().max(20),
  manualSg: z.boolean().optional(),
});

export const designSchema = z.object({
  nodes: z.array(designNodeSchema),
  edges: z.array(designEdgeSchema),
  scenario: scenarioSchema,
  network: networkSchema.optional(),
});

export type DesignNode = z.infer<typeof designNodeSchema>;
export type DesignEdge = z.infer<typeof designEdgeSchema>;
export type Design = z.infer<typeof designSchema>;

export const DEFAULT_SCENARIO: Scenario = {
  rps: 200,
  peakMultiplier: 3,
  readRatio: 0.8,
  payloadKB: 5,
  region: 'us-east-1',
};
