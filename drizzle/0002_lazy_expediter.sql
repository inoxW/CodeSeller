CREATE TABLE `payout_items` (
	`order_id` text PRIMARY KEY NOT NULL,
	`payout_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` text PRIMARY KEY NOT NULL,
	`seller` text NOT NULL,
	`recipient` text NOT NULL,
	`sender` text NOT NULL,
	`asset` text NOT NULL,
	`chain_id` integer NOT NULL,
	`token` text NOT NULL,
	`amount_raw` text NOT NULL,
	`reference` text NOT NULL,
	`created` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`tx_hash` text,
	`paid_at` text,
	`last_check` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transfer_claims` (
	`key` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `payout_due` text;