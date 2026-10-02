CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`buyer` text NOT NULL,
	`seller` text NOT NULL,
	`product_id` text NOT NULL,
	`name` text NOT NULL,
	`price_cents` integer NOT NULL,
	`amount_units` integer NOT NULL,
	`wallet` text NOT NULL,
	`email` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tx_hash` text,
	`license_key` text,
	`created` text NOT NULL,
	`paid_at` text,
	`last_check` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_wallet_amount_unique` ON `orders` (`wallet`,`amount_units`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_tx_unique` ON `orders` (`tx_hash`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`price_cents` integer NOT NULL,
	`wallet` text NOT NULL,
	`category` text NOT NULL,
	`stack` text NOT NULL,
	`version` text NOT NULL,
	`color` text NOT NULL,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`size` integer NOT NULL,
	`created` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL
);
