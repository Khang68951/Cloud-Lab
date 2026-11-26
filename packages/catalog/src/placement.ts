import type { LocalizedText } from '@learninglab/shared';
import { tx, type ServiceConfig, type ServiceDef } from './types.ts';

/**
 * Where a node lives on the network. Shown on the Lab canvas so learners can see
 * at a glance what is inside the VPC (public vs private subnet) and what is an
 * AWS-managed service reached over the AWS network.
 */
export type Placement = 'internet' | 'edge' | 'public' | 'private' | 'managed';

/** Node config key that overrides the service's default placement. */
export const PLACEMENT_KEY = 'subnet';

/** Placements that sit inside a VPC. */
export const IN_VPC: ReadonlySet<Placement> = new Set(['public', 'private']);

export const PLACEMENT_LABEL: Record<Placement, LocalizedText> = {
  internet: tx('Internet', 'Internet'),
  edge: tx('AWS edge', 'Edge AWS'),
  public: tx('Public subnet', 'Public subnet'),
  private: tx('Private subnet', 'Private subnet'),
  managed: tx('AWS-managed (outside VPC)', 'AWS quản lý (ngoài VPC)'),
};

/** Internet-facing pieces that live in a public subnet. */
const PUBLIC = new Set(['alb', 'nlb', 'nat', 'igw', 'elastic-ip', 'network-firewall', 'gwlb', 'client-vpn', 'verified-access']);

/** Resources that run on ENIs inside your VPC, normally in private subnets. */
const PRIVATE = new Set([
  // compute
  'ec2', 'ecs-ec2', 'fargate', 'eks', 'batch', 'rosa', 'parallelcluster', 'beanstalk', 'outposts',
  // data
  'rds', 'aurora', 'aurora-serverless', 'documentdb', 'neptune', 'redshift', 'memorydb', 'opensearch',
  'elasticache', 'elasticache-serverless', 'dax', 'rds-proxy',
  // file storage
  'efs', 'fsx', 'fsx-windows', 'fsx-ontap', 'fsx-openzfs', 'ebs',
  // messaging / analytics clusters
  'msk', 'msk-serverless', 'mq', 'emr', 'mwaa',
  // private networking
  'vpce', 'privatelink', 'route53-resolver', 'cloud-map', 'directory-service', 'cloudhsm',
]);

/**
 * Services whose subnet a learner may pick in the Inspector. Choosing a wrong
 * one (a database in a public subnet, NAT in a private one) is the lesson.
 */
const CHOOSABLE: Record<string, Placement[]> = {
  lambda: ['managed', 'private', 'public'],
};
const IN_VPC_CHOICES: Placement[] = ['public', 'private'];

export function defaultPlacement(def: Pick<ServiceDef, 'id' | 'category' | 'behavior'>): Placement {
  if (def.behavior === 'client') return 'internet';
  if (PUBLIC.has(def.id)) return 'public';
  if (PRIVATE.has(def.id)) return 'private';
  if (def.category === 'edge' || def.behavior === 'cdn') return 'edge';
  return 'managed';
}

/** The placements a learner can choose for this service (empty = fixed). */
export function placementChoices(def: Pick<ServiceDef, 'id' | 'category' | 'behavior'>): Placement[] {
  const explicit = CHOOSABLE[def.id];
  if (explicit) return explicit;
  return IN_VPC.has(defaultPlacement(def)) ? IN_VPC_CHOICES : [];
}

/** Effective placement of a node: the config override when valid, else the default. */
export function placementOf(def: Pick<ServiceDef, 'id' | 'category' | 'behavior'>, cfg: ServiceConfig | undefined): Placement {
  const chosen = cfg?.[PLACEMENT_KEY];
  if (typeof chosen === 'string' && (placementChoices(def) as string[]).includes(chosen)) return chosen as Placement;
  return defaultPlacement(def);
}
