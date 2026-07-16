ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

WITH cleaned AS (
  SELECT
    id,
    trim(
      both '-' from regexp_replace(
        lower(coalesce(nullif(split_part(email, '@', 1), ''), 'player')),
        '[^a-z0-9_-]+',
        '-',
        'g'
      )
    ) AS cleaned_username
  FROM users
  WHERE username IS NULL
),
normalized AS (
  SELECT
    id,
    CASE
      WHEN length(cleaned_username) >= 3 THEN left(cleaned_username, 24)
      ELSE 'player-' || id::text
    END AS base_username
  FROM cleaned
),
deduped AS (
  SELECT
    id,
    CASE
      WHEN count(*) OVER (PARTITION BY base_username) = 1 THEN base_username
      ELSE left(
        base_username,
        greatest(1, 24 - length('-' || id::text))
      ) || '-' || id::text
    END AS final_username
  FROM normalized
)
UPDATE users
SET username = deduped.final_username,
    updated_at = now()
FROM deduped
WHERE users.id = deduped.id
  AND users.username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_not_null
  ON users (email)
  WHERE email IS NOT NULL;
