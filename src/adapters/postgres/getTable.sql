SELECT
    c.column_name AS "name"
    , REGEXP_REPLACE(c.udt_name , '^_' , '') AS "udtName"
    , CAST(c.is_nullable = 'YES' AS boolean) AS "isNullable"
    , c.column_default IS NOT NULL AS "hasDefault"
    , c.udt_name LIKE '^_' AS "isArray"
FROM
    information_schema.columns AS c
WHERE
    c.table_schema = $1
    AND c.table_name = $2
