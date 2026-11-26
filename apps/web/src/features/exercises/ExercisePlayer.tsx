import type { Exercise } from '@learninglab/content';
import { Suspense } from 'react';
import { DOMAINS } from '@/domains';
import { EstimationPlayer } from './EstimationPlayer';
import { QuizPlayer } from './QuizPlayer';

/** Players of domain-specific kinds, from every domain's definition. */
const DOMAIN_PLAYERS = Object.assign({}, ...DOMAINS.map((d) => d.players ?? {})) as NonNullable<(typeof DOMAINS)[number]['players']>;

/**
 * One player per exercise kind. The common kinds are built in; a domain adds
 * its own kinds through `DomainDefinition.players` (e.g. Cloud's canvas
 * challenges), so this file never changes for a new domain.
 */
export function ExercisePlayer({ exercise, index }: { exercise: Exercise; index?: number }) {
  switch (exercise.kind) {
    case 'scenario-quiz':
      return <QuizPlayer exercise={exercise} index={index} />;
    case 'estimation':
      return <EstimationPlayer exercise={exercise} index={index} />;
    default: {
      const Player = DOMAIN_PLAYERS[exercise.kind];
      if (!Player) throw new Error(`No player registered for exercise kind "${exercise.kind}" (${exercise.id})`);
      return (
        <Suspense fallback={<div className="h-40 rounded-xl border bg-card" aria-busy="true" />}>
          <Player exercise={exercise} index={index} />
        </Suspense>
      );
    }
  }
}
