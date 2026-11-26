import {
  ANYWHERE,
  formatSg,
  getService,
  parseCidr,
  PLACEMENT_KEY,
  placementChoices,
  PORT_NAMES,
  portLabel,
  SG_KEY,
  usableIps,
  validateNetwork,
  type NetworkConfig,
  type Placement,
  type ServiceConfig,
  type SgRule,
} from '@learninglab/catalog';
import { localize } from '@learninglab/shared';
import type { SimResult } from '@learninglab/sim-engine';
import { Ban, Check, Plus, RotateCcw, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import type { LabEdge, LabNode } from '../model';
import { ZoneChip } from '../ZoneChip';

const inputCls = 'h-7 w-full min-w-0 rounded-md border border-input bg-background px-1.5 text-xs disabled:opacity-60';

/** "sg-web-api" style name for a node's security group. */
function sgName(n: LabNode): string {
  const def = getService(n.data.service);
  const base = (n.data.label || def?.short || n.id).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `sg-${base || n.id}`;
}

const COMMON_PORTS = [22, 80, 443, 3306, 5432, 6379, 2049, 27017];

/**
 * Network section of the Inspector: subnet, private IP, the port the resource
 * listens on, its security group's inbound rules, and whether each incoming
 * connection on the canvas gets through.
 */
export function NodeNetwork({
  node,
  nodes,
  edges,
  sim,
  network,
  onConfig,
  onClearConfig,
}: {
  node: LabNode;
  nodes: LabNode[];
  edges: LabEdge[];
  sim: SimResult;
  network: NetworkConfig;
  onConfig: (key: string, value: ServiceConfig[string]) => void;
  onClearConfig: (key: string) => void;
}) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const subnetId = useId();
  const def = getService(node.data.service);
  const net = sim.nodes[node.id]?.net;
  if (!def || !net) return null;
  const choices = placementChoices(def);
  const inVpc = net.placement === 'public' || net.placement === 'private';
  const hasSg = inVpc && net.port !== null;

  const setRules = (rules: SgRule[]) => onConfig(SG_KEY, formatSg(rules));
  const sources: { value: string; label: string }[] = [
    { value: ANYWHERE, label: t('net.anywhere') },
    { value: network.vpcCidr, label: `${t('zone.vpc')} ${network.vpcCidr}` },
    { value: network.publicCidr, label: `${t('zone.public')} ${network.publicCidr}` },
    { value: network.privateCidr, label: `${t('zone.private')} ${network.privateCidr}` },
    ...nodes
      .filter((n) => n.id !== node.id && sim.nodes[n.id]?.net.port !== null && ['public', 'private'].includes(sim.nodes[n.id]?.net.placement ?? ''))
      .map((n) => ({ value: `sg:${n.id}`, label: sgName(n) })),
  ];
  const sourceLabel = (v: string) => sources.find((s) => s.value === v)?.label ?? (v.startsWith('sg:') ? t('net.deletedSg') : v);
  const incoming = edges.filter((e) => e.target === node.id);

  return (
    <section className="flex flex-col gap-2.5 rounded-lg border p-2.5" aria-label={t('net.title')}>
      <h4 className="text-xs font-semibold">{t('net.title')}</h4>

      {choices.length > 0 ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={subnetId} className="text-xs font-medium">
            {t('subnet.label')}
          </label>
          <select
            id={subnetId}
            className={cn(inputCls, 'h-8 text-sm')}
            value={net.placement}
            onChange={(e) => onConfig(PLACEMENT_KEY, e.target.value)}
            data-testid="subnet-select"
          >
            {choices.map((z) => (
              <option key={z} value={z}>
                {t(`zone.${z}`)}
                {z === 'public' ? ` (${network.publicCidr})` : z === 'private' ? ` (${network.privateCidr})` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <ZoneChip zone={net.placement} full className="w-fit rounded-md py-1" />
      )}
      <p className="text-[11px] leading-snug text-muted-foreground">{t(`zone.help.${net.placement}`)}</p>

      {inVpc && (
        <dl className="grid grid-cols-2 gap-2 rounded-md bg-muted/60 p-2 text-[11px]">
          <div>
            <dt className="text-muted-foreground">{t('net.privateIp')}</dt>
            <dd className="font-mono" data-testid="node-ip">
              {net.ip ?? t('net.noIp')}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('net.publicIp')}</dt>
            <dd>{net.placement === 'public' && def.id !== 'lambda' ? t('net.publicIpYes') : t('net.publicIpNo')}</dd>
          </div>
          {hasSg && (
            <div className="col-span-2">
              <dt className="text-muted-foreground">{t('net.listens')}</dt>
              <dd className="font-mono">{portLabel(net.port!)}</dd>
            </div>
          )}
        </dl>
      )}

      {hasSg && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">
              {t('net.sgTitle')} <span className="font-mono text-muted-foreground">{sgName(node)}</span>
            </span>
            {typeof node.data.config[SG_KEY] === 'string' && (
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => onClearConfig(SG_KEY)}
                title={t('net.resetRulesHelp')}
              >
                <RotateCcw className="size-3" aria-hidden />
                {t('net.resetRules')}
              </button>
            )}
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">{t('net.sgHelp')}</p>
          {net.sg.length === 0 && <p className="rounded-md bg-warning-soft px-2 py-1 text-[11px] text-warning">{t('net.noRules')}</p>}
          <ul className="flex flex-col gap-1" data-testid="sg-rules">
            {net.sg.map((rule, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,5fr)_auto_minmax(0,7fr)_auto] items-center gap-1">
                <select
                  className={cn(inputCls, 'font-mono')}
                  aria-label={t('net.port')}
                  value={rule.port}
                  onChange={(e) => setRules(net.sg.map((r, j) => (j === i ? { ...r, port: Number(e.target.value) } : r)))}
                >
                  {[...new Set([net.port!, rule.port, ...COMMON_PORTS])].map((p) => (
                    <option key={p} value={p}>
                      {PORT_NAMES[p] ? `${PORT_NAMES[p]} ${p}` : `TCP ${p}`}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground" aria-hidden>
                  ←
                </span>
                <select
                  className={cn(inputCls, 'font-mono')}
                  aria-label={t('net.source')}
                  value={rule.source}
                  onChange={(e) => setRules(net.sg.map((r, j) => (j === i ? { ...r, source: e.target.value } : r)))}
                  data-testid="sg-source"
                >
                  {!sources.some((s) => s.value === rule.source) && <option value={rule.source}>{sourceLabel(rule.source)}</option>}
                  {sources.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-danger"
                  aria-label={t('net.removeRule')}
                  onClick={() => setRules(net.sg.filter((_, j) => j !== i))}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-muted"
            onClick={() => setRules([...net.sg, { port: net.port!, source: network.vpcCidr }])}
          >
            <Plus className="size-3" aria-hidden />
            {t('net.addRule')}
          </button>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium">{t('net.incoming')}</span>
          <ul className="flex flex-col gap-1 text-[11px]" data-testid="incoming">
            {incoming.map((e) => {
              const src = nodes.find((n) => n.id === e.source);
              const r = sim.edges[e.id];
              const blocked = r?.blocked;
              const srcNet = sim.nodes[e.source]?.net;
              const name = src ? src.data.label || getService(src.data.service)?.short || src.id : e.source;
              return (
                <li key={e.id} className={cn('flex items-start gap-1.5 rounded-md px-1.5 py-1', blocked ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success')}>
                  {blocked ? <Ban className="mt-px size-3 shrink-0" aria-hidden /> : <Check className="mt-px size-3 shrink-0" aria-hidden />}
                  <span className="min-w-0">
                    <span className="font-semibold">{name}</span>
                    {srcNet?.ip && <span className="font-mono"> ({srcNet.ip})</span>}
                    {blocked && <span className="block leading-snug">{localize(blocked.reason, locale)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function CidrField({ label, value, usable, onCommit }: { label: string; value: string; usable: string | null; onCommit: (v: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const ok = parseCidr(draft ?? value) !== null;
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      <input
        id={id}
        className={cn(inputCls, 'h-8 font-mono text-sm', !ok && 'border-danger')}
        value={draft ?? value}
        spellCheck={false}
        onChange={(e) => {
          setDraft(e.target.value);
          if (parseCidr(e.target.value)) onCommit(e.target.value.trim());
        }}
        onBlur={() => setDraft(null)}
      />
      {usable && <span className="col-start-2 text-[11px] text-muted-foreground">{usable}</span>}
    </div>
  );
}

/** Route table rows: destination → target. */
function RouteTable({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <h5 className="mb-1 text-[11px] font-semibold">{title}</h5>
      <table className="w-full text-[11px]">
        <tbody>
          {rows.map(([dest, target]) => (
            <tr key={dest + target} className="border-t first:border-t-0">
              <td className="py-0.5 pr-2 font-mono">{dest}</td>
              <td className="py-0.5 text-muted-foreground">→ {target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The VPC itself: CIDR blocks (validated, with usable IP counts) and the route
 * tables the engine uses, derived from the NAT Gateway / endpoints on the canvas.
 */
export function VpcEditor({ network, sim, nodes, onChange }: { network: NetworkConfig; sim: SimResult; nodes: LabNode[]; onChange: (n: NetworkConfig) => void }) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const problems = validateNetwork(network);
  const used = (p: Placement) => Object.values(sim.nodes).filter((n) => n.net.placement === p).length;
  const usable = (cidr: string, p?: Placement) => {
    const c = parseCidr(cidr);
    if (!c) return null;
    return p ? t('net.usableUsed', { usable: usableIps(c).toLocaleString(locale), used: used(p) }) : t('net.usable', { usable: usableIps(c).toLocaleString(locale) });
  };
  const nameOf = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    return n ? n.data.label || getService(n.data.service)?.short || id : id;
  };
  const nat = nodes.find((n) => n.data.service === 'nat' && sim.nodes[n.id]?.net.placement === 'public');
  const gw = nodes.find((n) => n.data.service === 'vpce' && n.data.config.type !== 'interface');
  const iface = nodes.find((n) => n.data.service === 'vpce' && n.data.config.type === 'interface');
  const privateRows: [string, string][] = [[network.vpcCidr, 'local']];
  if (gw) privateRows.push(['pl-s3, pl-dynamodb', nameOf(gw.id)]);
  if (iface) privateRows.push([t('net.awsServices'), `${nameOf(iface.id)} (PrivateLink)`]);
  privateRows.push([ANYWHERE, nat ? nameOf(nat.id) : t('net.noRoute')]);

  return (
    <section className="flex flex-col gap-3 border-t p-3" aria-label={t('net.vpcTitle')}>
      <div>
        <h3 className="font-semibold">{t('net.vpcTitle')}</h3>
        <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{t('net.vpcHint')}</p>
      </div>
      <CidrField label={t('zone.vpc')} value={network.vpcCidr} usable={usable(network.vpcCidr)} onCommit={(v) => onChange({ ...network, vpcCidr: v })} />
      <CidrField label={t('zone.public')} value={network.publicCidr} usable={usable(network.publicCidr, 'public')} onCommit={(v) => onChange({ ...network, publicCidr: v })} />
      <CidrField label={t('zone.private')} value={network.privateCidr} usable={usable(network.privateCidr, 'private')} onCommit={(v) => onChange({ ...network, privateCidr: v })} />
      {problems.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md bg-danger-soft p-2 text-[11px] text-danger" data-testid="vpc-problems">
          {problems.map((p, i) => (
            <li key={i}>{localize(p, locale)}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 rounded-md bg-muted/60 p-2.5">
        <RouteTable title={t('net.rtPublic')} rows={[[network.vpcCidr, 'local'], [ANYWHERE, 'Internet Gateway']]} />
        <RouteTable title={t('net.rtPrivate')} rows={privateRows} />
        <p className="text-[11px] leading-snug text-muted-foreground">{t('net.rtHint')}</p>
      </div>
    </section>
  );
}
