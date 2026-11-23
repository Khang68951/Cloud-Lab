import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import { useLab } from './context';

function formatRps(rps: number) {
  if (rps >= 1000) return `${(rps / 1000).toFixed(rps >= 10000 ? 0 : 1)}k/s`;
  if (rps >= 10) return `${Math.round(rps)}/s`;
  return `${rps.toFixed(1)}/s`;
}

/**
 * Little dots that travel along the edge from source to target, so the learner
 * sees which way requests/messages flow. More traffic → more and faster dots.
 * Uses SMIL <animateMotion> (works on SVG paths everywhere); hidden by CSS
 * under prefers-reduced-motion.
 */
function FlowDots({ path, length, rps, async }: { path: string; length: number; rps: number; async: boolean }) {
  // 1 dot when idle, up to 4 under heavy traffic (log scale: 10/s → 2, 1k/s → 3, 100k/s → 4).
  const count = rps > 0 ? Math.min(4, 1 + Math.floor(Math.log10(Math.max(rps, 1)) / 1.5)) : 1;
  // Pixels per second: idle edges crawl, busy ones move briskly.
  const speed = rps > 0 ? Math.min(220, 70 + Math.log10(rps + 1) * 30) : 40;
  const dur = Math.max(0.8, length / speed);
  return (
    <g className="lab-flow-dot" aria-hidden style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
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

/** Edge that shows traffic (req/s), dashes for async delivery, red for invalid. */
function FlowEdgeImpl({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected }: EdgeProps) {
  const { result } = useLab();
  const r = result?.edges[id];
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 });
  const invalid = r?.valid === false;
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
      {(rps > 0 || invalid) && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              'nodrag nopan pointer-events-none absolute rounded-full border bg-card px-1.5 py-px font-mono text-[10px] tabular-nums shadow-sm',
              invalid ? 'border-danger text-danger' : 'text-muted-foreground',
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {invalid ? '✕' : formatRps(rps)}
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
