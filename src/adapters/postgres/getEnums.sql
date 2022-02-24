SELECT
    t.typname AS "name"
    , e.enumlabel AS "value"
FROM
    pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE
    n.nspname = $1
