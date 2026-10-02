CREATE TABLE `auth_challenges` (
	`nonce` text PRIMARY KEY NOT NULL,
	`wallet` text NOT NULL,
	`browser_hash` text NOT NULL,
	`message` text NOT NULL,
	`expires` integer NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`n` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallet_links` (
	`legacy_id` text PRIMARY KEY NOT NULL,
	`wallet` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wallet_sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`wallet` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
DROP INDEX `orders_wallet_amount_unique`;--> statement-breakpoint
DROP INDEX `orders_tx_unique`;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `asset` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `chain_id` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `contract` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `token` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `amount_raw` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `order_hash` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `deadline` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `fee_wallet` text;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_chain_tx_unique` ON `orders` (`chain_id`,`tx_hash`);