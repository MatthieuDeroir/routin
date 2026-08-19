CREATE TABLE `preference` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`theme` text DEFAULT 'brume' NOT NULL,
	`scheme` text DEFAULT 'system' NOT NULL,
	`accent` text,
	`radius` text,
	`density` text DEFAULT 'normal' NOT NULL,
	`text_scale` real DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
