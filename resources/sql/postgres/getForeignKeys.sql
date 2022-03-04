SELECT
    cl2.relname AS "primary_table"
    , att2.attname AS "primary_column"
    , cl.relname AS "foreign_table"
    , att.attname AS "foreign_column"
    , conname AS "constraint"
FROM (
    SELECT
        unnest(con1.conkey) AS "parent"
        , unnest(con1.confkey) AS "child"
        , con1.confrelid
        , con1.conrelid
        , con1.conname
    FROM
        pg_class cl
        JOIN pg_namespace ns ON cl.relnamespace = ns.oid
        JOIN pg_constraint con1 ON con1.conrelid = cl.oid
    WHERE
        ns.nspname = $1
        AND con1.contype = 'f') con
    JOIN pg_attribute att ON att.attrelid = con.confrelid
        AND att.attnum = con.child
    JOIN pg_class cl ON cl.oid = con.confrelid
    JOIN pg_class cl2 ON cl2.oid = con.conrelid
    JOIN pg_attribute att2 ON att2.attrelid = con.conrelid
        AND att2.attnum = con.parent
