SELECT
    c.TABLE_NAME AS "table"
    , c.COLUMN_NAME AS "name"
    , c.DATA_TYPE AS "udt_name"
    , cast(c.IS_NULLABLE = 'YES' AS unsigned) AS "is_nullable"
    , CAST(c.COLUMN_DEFAULT IS NOT NULL AS unsigned) AS "has_default"
    , c.COLUMN_DEFAULT AS "default_value"
    , CAST(0 AS unsigned) AS "is_array"
FROM
    information_schema.COLUMNS AS c
WHERE
    c.TABLE_SCHEMA = ?
    AND c.TABLE_NAME = ?
