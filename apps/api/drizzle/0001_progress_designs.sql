CREATE TABLE `designs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`graph` text NOT NULL,
	`monthly_usd` real,
	`engine_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `exercise_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercise_id` text NOT NULL,
	`kind` text NOT NULL,
	`passed` integer NOT NULL,
	`score` integer NOT NULL,
	`hints_used` integer DEFAULT 0 NOT NULL,
	`answer` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attempts_exercise_idx` ON `exercise_attempts` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `lesson_progress` (
	`lesson_key` text PRIMARY KEY NOT NULL,
	`completed_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
