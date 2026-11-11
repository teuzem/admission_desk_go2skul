DELETE FROM "user_security_keys"
WHERE "credential_id" LIKE 'simulated\_%' ESCAPE '\';
--> statement-breakpoint
DELETE FROM "user_backup_codes"
WHERE "code_hash" !~ '^[0-9a-f]{64}$';
--> statement-breakpoint
UPDATE "profiles" AS p
SET "is_two_factor_enabled" = (
  EXISTS (
    SELECT 1 FROM "mfa_factors" AS f
    WHERE f."user_id" = p."id" AND f."verified_at" IS NOT NULL
  )
  OR EXISTS (
    SELECT 1 FROM "user_security_keys" AS k
    WHERE k."user_id" = p."id"
  )
);
--> statement-breakpoint
INSERT INTO "user_security_settings" ("user_id", "security_keys_enabled")
SELECT
  u."id",
  EXISTS (
    SELECT 1 FROM "user_security_keys" AS k
    WHERE k."user_id" = u."id"
  )
FROM "users" AS u
ON CONFLICT ("user_id") DO UPDATE
SET "security_keys_enabled" = EXCLUDED."security_keys_enabled";
--> statement-breakpoint
UPDATE "user_security_settings" AS s
SET "backup_codes_generated_at" = (
  SELECT MAX(c."created_at")
  FROM "user_backup_codes" AS c
  WHERE c."user_id" = s."user_id"
);
