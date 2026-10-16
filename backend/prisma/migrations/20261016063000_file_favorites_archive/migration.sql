-- Additive metadata only. No user files are removed or re-uploaded.
ALTER TABLE `files`
  ADD COLUMN `starred_at` DATETIME(3) NULL,
  ADD COLUMN `archived_at` DATETIME(3) NULL;
CREATE INDEX `files_user_id_status_starred_at_idx` ON `files` (`user_id`, `status`, `starred_at`);
CREATE INDEX `files_user_id_status_archived_at_idx` ON `files` (`user_id`, `status`, `archived_at`);
