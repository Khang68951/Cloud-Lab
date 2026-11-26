import { getService, REGIONS, type FieldSpec, type NetworkConfig, type RegionId, type Scenario, type ServiceConfig } from '@cloudlab/catalog';
import { localize, type LocalizedText } from '@cloudlab/shared';
import type { NodeResult, SimResult } from '@cloudlab/sim-engine';
import { Copy, Lock, Power, Trash2 } from 'lucide-react';
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { currentLocale } from '@/i18n';
import { formatNumber, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LabEdge, LabNode } from '../model';
import { CATEGORY_HUE } from '../hues';
import { ServiceIcon } from '../visuals';
import { NodeNetwork } from './NetworkPanel';

const inputCls = 'h-8 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-60';

function Row({ label, help, htmlFor, children }: { label: string; help?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-medium">
        {label}
      </label>
      {children}
      {help && <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>}
    </div>
  );
}

/** A number input that only commits valid numbers (keeps a draft while typing). */
function NumberInput({
  id,
  value,
  min,
  max,
  step,
  disabled,
  onCommit,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      id={id}
      type="number"
      className={cn(inputCls, 'font-mono tabular-nums')}
      value={draft ?? String(value)}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function FieldInput({ field, value, onChange }: { field: FieldSpec; value: ServiceConfig[string]; onChange: (v: ServiceConfig[string]) => void }) {
  const locale = currentLocale();
  const id = useId();
  const label = localize(field.label, locale);
  const help = field.help ? localize(field.help, locale) : undefined;

  if (field.kind === 'toggle') {
    return (
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="text-xs font-medium">
            {label}
          </label>
          {help && <p className="text-[11px] leading-snug text-muted-foreground">{help}</p>}
        </div>
        <Switch id={id} checked={value === true} onCheckedChange={(v) => onChange(v)} />
      </div>
    );
  }
  if (field.kind === 'select') {
    return (
      <Row label={label} help={help} htmlFor={id}>
        <select id={id} className={inputCls} value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {typeof o.label === 'string' ? o.label : localize(o.label, locale)}
            </option>
          ))}
        </select>
      </Row>
    );
  }
  return (
    <Row label={field.unit ? `${label} (${field.unit})` : label} help={help} htmlFor={id}>
      <NumberInput id={id} value={Number(value)} min={field.min} max={field.max} step={field.step} onCommit={onChange} />
    </Row>
  );
}

function DocList({ title, items, tone }: { title: string; items: LocalizedText[]; tone: string }) {
  const locale = currentLocale();
  if (!items.length) return null;
  return (
    <div>
      <h4 className={cn('mb-1 text-xs font-semibold', tone)}>{title}</h4>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-[12px] leading-snug text-muted-foreground">
        {items.map((it, i) => (
          <li key={i}>{localize(it, locale)}</li>
        ))}
      </ul>
    </div>
  );
}

export function NodeInspector({
  node,
  result,
  killed,
  onConfig,
  onClearConfig,
  onRename,
  onDelete,
  onDuplicate,
  onToggleKill,
  nodes,
  edges,
  sim,
  network,
}: {
  nodes: LabNode[];
  edges: LabEdge[];
  sim: SimResult;
  network: NetworkConfig;
  node: LabNode;
  result: NodeResult | undefined;
  killed: boolean;
  onConfig: (key: string, value: ServiceConfig[string]) => void;
  onClearConfig: (key: string) => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleKill: () => void;
}) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const labelId = useId();
  const def = getService(node.data.service);
  if (!def) return null;
  const cfg = node.data.config;
  const isUsers = def.behavior === 'client';
  const finite = result && Number.isFinite(result.model.capacityRps);

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="track-accent flex items-start gap-3" style={{ '--hue': CATEGORY_HUE[def.category] } as CSSProperties}>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-(--tc-soft) text-(--tc)">
          <ServiceIcon name={def.icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold leading-tight">{def.name}</h3>
          <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{localize(def.description, locale)}</p>
          {def.equivalents && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Azure: {def.equivalents.azure} · GCP: {def.equivalents.gcp}
            </p>
          )}
        </div>
      </div>

      {!isUsers && (
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={onDuplicate}>
            <Copy />
            {t('inspector.duplicate')}
          </Button>
          <Button size="sm" variant={killed ? 'default' : 'outline'} onClick={onToggleKill} title={t('inspector.killHelp')}>
            <Power />
            {killed ? t('inspector.revive') : t('inspector.kill')}
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={onDelete}>
            <Trash2 />
            {t('inspector.delete')}
          </Button>
        </div>
      )}

      {result && !isUsers && (
        <dl className="grid grid-cols-2 gap-2 rounded-lg bg-muted/60 p-2.5 text-[11px]">
          <div>
            <dt className="text-muted-foreground">{t('inspector.traffic')}</dt>
            <dd className="font-mono tabular-nums">
              {formatNumber(result.avg.r + result.avg.w, locale, { maximumFractionDigits: 1 })} / {formatNumber(result.peak.r + result.peak.w, locale, { maximumFractionDigits: 0 })}{' '}
              req/s
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('inspector.capacity')}</dt>
            <dd className="font-mono tabular-nums">
              {finite ? `${formatNumber(result.model.capacityRps, locale, { maximumFractionDigits: 0 })} req/s` : t('autoScales')}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('utilizationAtPeak')}</dt>
            <dd className={cn('font-mono tabular-nums', result.utilization >= 1 ? 'text-danger' : result.utilization >= 0.8 ? 'text-warning' : '')}>
              {finite ? `${Math.round(result.utilization * 100)}%` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('inspector.latency')}</dt>
            <dd className="font-mono tabular-nums">{formatNumber(result.latencyMs, locale, { maximumFractionDigits: 1 })} ms</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('inspector.cost')}</dt>
            <dd className="font-mono tabular-nums">{formatUsd(result.monthlyUsd, locale)}</dd>
          </div>
          {result.queue && (
            <>
              <div>
                <dt className="text-muted-foreground">{t('inspector.queueDrain')}</dt>
                <dd className="font-mono tabular-nums">{formatNumber(result.queue.drainRps, locale, { maximumFractionDigits: 0 })} msg/s</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('inspector.queueBacklog')}</dt>
                <dd className="font-mono tabular-nums text-warning">+{formatNumber(result.queue.backlogRps, locale, { maximumFractionDigits: 0 })} msg/s</dd>
              </div>
            </>
          )}
          <div>
            <dt className="text-muted-foreground">{t('inspector.layout')}</dt>
            <dd>{t(`layout.${result.model.azLayout}`)}</dd>
          </div>
        </dl>
      )}

      {isUsers ? (
        <p className="rounded-lg bg-info-soft p-2.5 text-[12px] text-info">{t('inspector.usersHint')}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Row label={t('inspector.label')} htmlFor={labelId}>
            <input
              id={labelId}
              className={inputCls}
              value={node.data.label ?? ''}
              placeholder={def.short}
              maxLength={60}
              onChange={(e) => onRename(e.target.value)}
            />
          </Row>
          {def.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={cfg[f.key] ?? f.default} onChange={(v) => onConfig(f.key, v)} />
          ))}
        </div>
      )}

      {!isUsers && <NodeNetwork node={node} nodes={nodes} edges={edges} sim={sim} network={network} onConfig={onConfig} onClearConfig={onClearConfig} />}

      <details className="group rounded-lg border p-2.5" open={!isUsers}>
        <summary className="cursor-pointer text-xs font-semibold">{t('inspector.guide')}</summary>
        <div className="mt-2.5 flex flex-col gap-3">
          <DocList title={t('docs.whenToUse')} items={def.docs.whenToUse} tone="text-success" />
          <DocList title={t('docs.whenNotTo')} items={def.docs.whenNotTo} tone="text-danger" />
          <DocList title={t('docs.pros')} items={def.docs.pros} tone="text-foreground" />
          <DocList title={t('docs.cons')} items={def.docs.cons} tone="text-foreground" />
          <DocList title={t('docs.pitfalls')} items={def.docs.pitfalls} tone="text-warning" />
          <div>
            <h4 className="mb-1 text-xs font-semibold">{t('docs.pricing')}</h4>
            <p className="text-[12px] leading-snug text-muted-foreground">{localize(def.docs.pricing, locale)}</p>
          </div>
        </div>
      </details>
    </div>
  );
}

export function ScenarioEditor({
  scenario,
  locked,
  onChange,
}: {
  scenario: Scenario;
  locked: boolean;
  onChange: (patch: Partial<Scenario>) => void;
}) {
  const { t } = useTranslation('lab');
  const locale = currentLocale();
  const ids = { rps: useId(), peak: useId(), read: useId(), payload: useId(), region: useId() };
  const monthlyM = (scenario.rps * 730 * 3600) / 1e6;

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{t('scenario.title')}</h3>
        {locked && (
          <Badge tone="neutral">
            <Lock aria-hidden />
            {t('scenario.locked')}
          </Badge>
        )}
      </div>
      <p className="text-[12px] leading-snug text-muted-foreground">{t('scenario.hint')}</p>
      <Row label={t('scenario.rps')} help={t('scenario.rpsHelp', { m: formatNumber(monthlyM, locale, { maximumFractionDigits: 1 }) })} htmlFor={ids.rps}>
        <NumberInput id={ids.rps} value={scenario.rps} min={0} max={10_000_000} step={10} disabled={locked} onCommit={(v) => onChange({ rps: v })} />
      </Row>
      <Row label={t('scenario.peak')} help={t('scenario.peakHelp', { peak: formatNumber(scenario.rps * scenario.peakMultiplier, locale) })} htmlFor={ids.peak}>
        <NumberInput id={ids.peak} value={scenario.peakMultiplier} min={1} max={100} step={0.5} disabled={locked} onCommit={(v) => onChange({ peakMultiplier: v })} />
      </Row>
      <Row label={`${t('scenario.readRatio')}: ${Math.round(scenario.readRatio * 100)}%`} help={t('scenario.readRatioHelp')} htmlFor={ids.read}>
        <input
          id={ids.read}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={scenario.readRatio}
          disabled={locked}
          onChange={(e) => onChange({ readRatio: Number(e.target.value) })}
          className="accent-(--primary)"
        />
      </Row>
      <Row label={t('scenario.payload')} help={t('scenario.payloadHelp')} htmlFor={ids.payload}>
        <NumberInput id={ids.payload} value={scenario.payloadKB} min={0.1} max={100_000} step={1} disabled={locked} onCommit={(v) => onChange({ payloadKB: v })} />
      </Row>
      <Row label={t('scenario.region')} htmlFor={ids.region}>
        <select
          id={ids.region}
          className={inputCls}
          value={scenario.region}
          disabled={locked}
          onChange={(e) => onChange({ region: e.target.value as RegionId })}
        >
          {Object.values(REGIONS).map((r) => (
            <option key={r.id} value={r.id}>
              {r.id} — {localize(r.name, locale)}
            </option>
          ))}
        </select>
      </Row>
      <p className="rounded-lg bg-muted p-2.5 text-[11px] leading-snug text-muted-foreground">{t('scenario.tip')}</p>
    </div>
  );
}
