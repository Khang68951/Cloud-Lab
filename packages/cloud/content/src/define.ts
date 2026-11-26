import type { CloudExercise } from '@learninglab/cloud-challenges';
import type { CourseExercises as Exercises } from '@learninglab/course-kit';

export { defineCourse } from '@learninglab/course-kit';

/** Exercises of one Cloud course, keyed module slug → lesson slug. */
export type CourseExercises = Exercises<CloudExercise>;
