import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { localize } from '@learninglab/shared';
import { Ban } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { currentLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { useLab } from './context';

function formatRps(rps: number) {
  if (rps >= 1000) return `${(rps / 1000).toFixed(rps >= 10000 ? 0 : 1)}k/s`;
  if (rps >= 10) return `${Math.round(rps)}/s`;
  return `${rps.toFixed(1)}/s`;
}

/**
 * Traffic range the dots can express: 1 req/s (sparse, slow) … 100k req/s
 * (dense, fast stream). Below/above that the visuals clamp.
 */
const FLOW_MIN_DECADE = 0; // 10^0 = 1 req/s
const FLOW_MAX_DECADE = 5; // 10^5 = 100k req/s
/** How much speed and density each grow over the whole range (16× each). */
const FLOW_RANGE = 16;
const SPEED_MIN = 25; // px/s at 1 req/s
const SPACING_MAX = 240; // px between dots at 1 req/s
const MAX_DOTS = 28; // per edge, keeps long edges cheap to animate

/**
 * Speed and spacing of the flow dots for a given traffic level.
 *
 * Traffic is shown as *dots passing per second* = speed ÷ spacing. Both grow
 * with the same power of rps, so every ×10 in traffic makes dots ~1.7× faster
 * AND ~1.7× denser → ~3× more dots per second. (A fully linear mapping can't
 * fit 1 → 100k req/s on screen; the old log-additive one only gave ~1.2×.)
 */
function flowVisuals(rps: number) {
  if (rps <= 0) return { speed: 18, spacing: Number.POSITIVE_INFINITY };
  const decade = Math.min(FLOW_MAX_DECADE, Math.max(FLOW_MIN_DECADE, Math.log10(rps)));
  const u = (decade - FLOW_MIN_DECADE) / (FLOW_MAX_DECADE - FLOW_MIN_DECADE); // 0..1
  const k = FLOW_RANGE ** u; // 1..16
  return { speed: SPEED_MIN * k, spacing: SPACING_MAX / k };
}

/**
 * Little dots that travel along the edge from source to target, so the learner
 * sees which way requests/messages flow. More traffic → more and faster dots.
 * Uses SMIL <animateMotion> (works on SVG paths everywhere); hidden by CSS
 * under prefers-reduced-motion.
 */
function FlowDots({ path, length, rps, async }: { path: string; length: number; rps: number; async: boolean }) {
  const { speed, spacing } = flowVisuals(rps);
  // Evenly spaced along the edge, so density (not edge length) reflects traffic.
  const count = Math.max(1, Math.min(MAX_DOTS, Math.round(length / spacing)));
  const dur = Math.max(0.4, length / speed);
  // Remount when timing changes: SMIL keeps the old phase otherwise and dots jump.
  const timingKey = `${dur.toFixed(2)}-${count}`;
  return (
    <g className="lab-flow-dot" aria-hidden style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={`${timingKey}-${i}`}
          r={async ? 3.25 : 3.75}
          fill={async ? 'var(--info)' : 'var(--primary)'}
          stroke="var(--card)"
          strokeWidth={1.25}
          opacity={rps > 0 ? 0.95 : 0.55}
        >
          <animateMotion dur={`${dur.toFixed(2)}s`} begin={`${(-(i * dur) / count).toFixed(2)}s`} repeatCount="indefinite" path={path} />
        </circle>
      ))}
    </g>
  );
}

/**
 * Edge that shows traffic (req/s), dashes for async delivery, red for invalid
 * or network-blocked connections, and which NAT/endpoint a routed call uses.
 */
function FlowEdgeImpl({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps) {
  const { t } = useTranslation('lab');
  const { result } = useLab();
  const r = result?.edges[id];
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  const blocked = r?.blocked;
  const invalid = r?.valid === false || Boolean(blocked);
  const via = r?.via;
  const rps = r ? r.avg.r + r.avg.w : 0;
  const stroke = invalid ? 'var(--danger)' : selected ? 'var(--primary)' : 'var(--muted-foreground)';

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#lab-arrow${invalid ? '-danger' : selected ? '-primary' : ''})`}
        style={{
          stroke,
          strokeWidth: selected ? 2.5 : 1.75,
          strokeDasharray: invalid ? '6 4' : r?.async ? '5 5' : undefined,
          animation: r?.async && !invalid ? 'lab-dash 1s linear infinite' : undefined,
        }}
      />
      {!invalid && (
        <FlowDots path={path} length={Math.abs(targetX - sourceX) + Math.abs(targetY - sourceY)} rps={rps} async={!!r?.async} />
      )}
      {(rps > 0 || invalid || via) && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan absolute flex items-center gap-1 rounded-full border bg-card px-1.5 py-px font-mono text-[10px] tabular-nums shadow-sm',
              blocked ? 'pointer-events-auto cursor-help border-danger font-sans font-semibold text-danger' : 'pointer-events-none',
              invalid && !blocked && 'border-danger text-danger',
              !invalid && 'text-muted-foreground',
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            title={blocked ? localize(blocked.reason, currentLocale()) : undefined}
            data-testid={blocked ? 'edge-blocked' : undefined}
          >
            {blocked ? (
              <>
                <Ban className="size-3" aria-hidden />
                {t(blocked.kind === 'sg' ? 'net.blockedSg' : 'net.blockedRoute')}
              </>
            ) : invalid ? (
              '✕'
            ) : (
              <>
                {rps > 0 && formatRps(rps)}
                {via && <span className="font-sans text-[9px] text-(--zc) zone" data-zone={via.kind === 'nat' ? 'public' : 'private'}>{t(via.kind === 'nat' ? 'net.viaNat' : 'net.viaEndpoint')}</span>}
              </>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const FlowEdge = memo(FlowEdgeImpl);

/** SVG arrow markers referenced by FlowEdge (render once inside the canvas). */
export function EdgeMarkers() {
  const marker = (id: string, color: string) => (
    <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
    </marker>
  );
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden>
      <defs>
        {marker('lab-arrow', 'var(--muted-foreground)')}
        {marker('lab-arrow-primary', 'var(--primary)')}
        {marker('lab-arrow-danger', 'var(--danger)')}
      </defs>
    </svg>
  );
}
