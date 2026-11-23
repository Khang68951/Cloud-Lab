import { tx, type RegionId, type RegionInfo } from './types.ts';

/**
 * Reference prices (USD, on-demand, Linux) for us-east-1, compiled from the
 * public AWS pricing pages. They are for learning and comparison only:
 * no taxes, no free tier, no negotiated discounts. Other regions apply
 * `priceFactor`. Always check https://calculator.aws for real decisions.
 */
export const PRICING_AS_OF = '2026-11';

export const HOURS_PER_MONTH = 730;
export const SECONDS_PER_MONTH = HOURS_PER_MONTH * 3600;

export const REGIONS: Record<RegionId, RegionInfo> = {
  'us-east-1': {
    id: 'us-east-1',
    name: tx('US East (N. Virginia)', 'US East (N. Virginia)'),
    priceFactor: 1,
    egressPerGB: 0.09,
    crossAzPerGB: 0.01,
  },
  'ap-southeast-1': {
    id: 'ap-southeast-1',
    name: tx('Asia Pacific (Singapore)', 'Châu Á – Thái Bình Dương (Singapore)'),
    priceFactor: 1.2,
    egressPerGB: 0.12,
    crossAzPerGB: 0.01,
  },
};

export const PRICES = {
  ec2: {
    /** $/hour */
    hourly: {
      't3.micro': 0.0104,
      't3.small': 0.0208,
      't3.medium': 0.0416,
      'm6i.large': 0.096,
      'c6i.xlarge': 0.17,
      'm6i.2xlarge': 0.384,
    } as Record<string, number>,
    /** Rough app requests/second one instance can serve for a typical web API. */
    rpsPerInstance: {
      't3.micro': 80,
      't3.small': 150,
      't3.medium': 300,
      'm6i.large': 600,
      'c6i.xlarge': 1500,
      'm6i.2xlarge': 2400,
    } as Record<string, number>,
    purchase: { 'on-demand': 1, 'savings-plan-1y': 0.72, spot: 0.35 } as Record<string, number>,
    ebsPerGBMonth: 0.08,
  },
  fargate: { vcpuHour: 0.04048, gbHour: 0.004445 },
  lambda: { perMillionRequests: 0.2, perGBSecond: 0.0000166667 },
  eks: { clusterHour: 0.1 },
  alb: { hourly: 0.0225, lcuHour: 0.008 },
  nlb: { hourly: 0.0225, nlcuHour: 0.006 },
  apigw: { httpPerMillion: 1.0, restPerMillion: 3.5 },
  cloudfront: { perGB: 0.085, perMillionHttps: 1.0 },
  route53: { zoneMonth: 0.5, perMillionQueries: 0.4 },
  waf: { aclMonth: 5, ruleMonth: 1, perMillionRequests: 0.6 },
  nat: { hourly: 0.045, perGB: 0.045 },
  vpceInterface: { hourlyPerAz: 0.01, perGB: 0.01 },
  rds: {
    hourly: {
      'db.t3.micro': 0.017,
      'db.t3.medium': 0.068,
      'db.r6g.large': 0.225,
      'db.r6g.xlarge': 0.45,
      'db.r6g.2xlarge': 0.9,
    } as Record<string, number>,
    rpsPerInstance: {
      'db.t3.micro': 200,
      'db.t3.medium': 800,
      'db.r6g.large': 3000,
      'db.r6g.xlarge': 6000,
      'db.r6g.2xlarge': 12000,
    } as Record<string, number>,
    storagePerGBMonth: 0.115,
  },
  aurora: {
    hourly: { 'db.r6g.large': 0.26, 'db.r6g.xlarge': 0.52, 'db.r6g.2xlarge': 1.04 } as Record<string, number>,
    rpsPerInstance: { 'db.r6g.large': 4000, 'db.r6g.xlarge': 8000, 'db.r6g.2xlarge': 16000 } as Record<string, number>,
    storagePerGBMonth: 0.1,
    perMillionIO: 0.2,
  },
  dynamodb: {
    onDemandPerMillionWrites: 0.625,
    onDemandPerMillionReads: 0.125,
    wcuHour: 0.00065,
    rcuHour: 0.00013,
    storagePerGBMonth: 0.25,
  },
  elasticache: {
    hourly: { 'cache.t3.micro': 0.017, 'cache.t3.medium': 0.068, 'cache.r6g.large': 0.206 } as Record<string, number>,
    rpsPerNode: { 'cache.t3.micro': 20000, 'cache.t3.medium': 50000, 'cache.r6g.large': 120000 } as Record<string, number>,
  },
  s3: {
    storagePerGBMonth: { standard: 0.023, 'intelligent-tiering': 0.023, 'standard-ia': 0.0125, 'glacier-ir': 0.004 } as Record<
      string,
      number
    >,
    perThousandPut: 0.005,
    perThousandGet: 0.0004,
    /** Retrieval fee for infrequent-access classes, $/GB read. */
    retrievalPerGB: { standard: 0, 'intelligent-tiering': 0, 'standard-ia': 0.01, 'glacier-ir': 0.03 } as Record<string, number>,
  },
  sqs: { perMillionRequests: 0.4 },
  sns: { perMillionPublishes: 0.5 },
  eventbridge: { perMillionEvents: 1.0 },
  kinesis: { shardHour: 0.015, perMillionPutUnits: 0.014 },
} as const;
