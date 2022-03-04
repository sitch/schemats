SELECT
    c.column_name AS "name"
    , REGEXP_REPLACE(c.udt_name , '^_' , '') AS "udt_name"
    , CAST(c.is_nullable = 'YES' AS boolean) AS "is_nullable"
    , c.column_default IS NOT NULL AS "has_default"
    , c.column_default AS "default_value"
    , c.udt_name LIKE '^_' AS "is_array"
FROM
    information_schema.columns AS c
WHERE
    c.table_schema = $1
    AND c.table_name = $2
