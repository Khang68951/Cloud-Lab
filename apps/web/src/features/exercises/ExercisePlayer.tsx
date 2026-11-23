import type { Exercise } from '@cloudlab/exercise-kit';
import { ChallengeCard } from './ChallengeCard';
import { EstimationPlayer } from './EstimationPlayer';
import { QuizPlayer } from './QuizPlayer';

/**
 * Exercise registry: one player per exercise kind. A new kind (e.g. IAM policy
 * lab) = new player component + one case here.
 */
export function ExercisePlayer({ exercise, index }: { exercise: Exercise; index?: number }) {
  switch (exercise.kind) {
    case 'scenario-quiz':
      return <QuizPlayer exercise={exercise} index={index} />;
    case 'estimation':
      return <EstimationPlayer exercise={exercise} index={index} />;
    case 'canvas-design':
    case 'canvas-fix':
      return <ChallengeCard exercise={exercise} index={index} />;
  }
}
