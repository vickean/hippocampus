CREATE TABLE `deployments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`environment` text NOT NULL,
	`purpose` text,
	`host` text,
	`public_url` text,
	`access_command` text,
	`software_version` text,
	`status` text DEFAULT 'unknown' NOT NULL,
	`last_verified_at` text,
	`notes` text,
	`tags` text,
	`encrypted_secrets` text,
	`created_at` text DEFAULT '(datetime(''now''))' NOT NULL,
	`updated_at` text DEFAULT '(datetime(''now''))' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_deployments_type` ON `deployments` (`type`);--> statement-breakpoint
CREATE INDEX `idx_deployments_environment` ON `deployments` (`environment`);--> statement-breakpoint
CREATE INDEX `idx_deployments_status` ON `deployments` (`status`);