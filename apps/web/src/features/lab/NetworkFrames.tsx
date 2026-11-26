import { getService, placementOf, type NetworkConfig, type Placement } from '@learninglab/catalog';
import { Panel, useNodes, ViewportPortal } from '@xyflow/react';
import { Network } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { LabNode } from './model';
import { ZONE_ICON } from './hues';

const STORAGE_KEY = 'lab.networkView';
/** Fallback node size before React Flow has measured it (matches ServiceNode's width). */
const NODE_W = 176;
const NODE_H = 90;
const SUBNET_PAD = 18;
const VPC_PAD = 16;
/** Room above a frame's content for its label. */
const LABEL_H = 22;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function bounds(boxes: Box[], pad: number): Box {
  const x0 = Math.min(...boxes.map((b) => b.x)) - pad;
  const y0 = Math.min(...boxes.map((b) => b.y)) - pad - LABEL_H;
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + pad;
  const y1 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

type FrameZone = Extract<Placement, 'public' | 'private'> | 'vpc';

function Frame({ box, zone, label, cidr }: { box: Box; zone: FrameZone; label: string; cidr: string }) {
  const Icon = zone === 'vpc' ? Network : ZONE_ICON[zone];
  return (
    <div
      className={cn(
        'zone absolute rounded-2xl border-2 border-(--zc)/50',
        zone === 'vpc' ? 'border-dashed bg-(--zc-soft)/25' : 'bg-(--zc-soft)/60',
      )}
      data-zone={zone}
      data-testid={`frame-${zone}`}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
      <span className="absolute top-1 left-3 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-(--zc) uppercase">
        <Icon className="size-3.5" aria-hidden />
        {label}
        <span className="font-mono font-medium normal-case opacity-80">{cidr}</span>
      </span>
    </div>
  );
}

/**
 * Draws the VPC and its public / private subnets behind the Lab diagram, sized
 * from the nodes that live there, plus a canvas button to toggle the view.
 * Frames follow the nodes; when the learner interleaves tiers the frames may
 * overlap — each node's own zone chip still tells the truth.
 */
export function NetworkFrames({ network }: { network: NetworkConfig }) {
  const { t } = useTranslation('lab');
  const nodes = useNodes<LabNode>();
  const [on, setOn] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'off');
  const toggle = () => {
    setOn(!on);
    localStorage.setItem(STORAGE_KEY, on ? 'off' : 'on');
  };

  const byZone: Record<'public' | 'private', Box[]> = { public: [], private: [] };
  for (const n of nodes) {
    const def = getService(n.data.service);
    if (!def) continue;
    const zone = placementOf(def, n.data.config);
    if (zone !== 'public' && zone !== 'private') continue;
    byZone[zone].push({ x: n.position.x, y: n.position.y, w: n.measured?.width ?? NODE_W, h: n.measured?.height ?? NODE_H });
  }
  const subnets = (['public', 'private'] as const).filter((z) => byZone[z].length).map((z) => ({ zone: z, box: bounds(byZone[z], SUBNET_PAD) }));
  const vpc = subnets.length ? bounds(subnets.map((s) => s.box), VPC_PAD) : null;

  return (
    <>
      <Panel position="top-left">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={on}
          title={t('networkViewHelp')}
          className={cn(
            'flex items-center gap-1.5 rounded-md border bg-card px-2 py-1 text-xs font-medium shadow-sm transition-colors hover:bg-muted',
            on && 'border-primary text-primary',
          )}
          data-testid="network-view-toggle"
        >
          <Network className="size-3.5" aria-hidden />
          {t('networkView')}
        </button>
      </Panel>
      {on && vpc && (
        <ViewportPortal>
          {/* z-index −1 puts the frames under edges and nodes inside the viewport. */}
          <div className="pointer-events-none absolute top-0 left-0 -z-10">
            <Frame box={vpc} zone="vpc" label={t('zone.vpc')} cidr={network.vpcCidr} />
            {subnets.map((s) => (
              <Frame key={s.zone} box={s.box} zone={s.zone} label={t(`zone.${s.zone}`)} cidr={s.zone === 'public' ? network.publicCidr : network.privateCidr} />
            ))}
          </div>
        </ViewportPortal>
      )}
    </>
  );
}
