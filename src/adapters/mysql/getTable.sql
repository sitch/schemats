SELECT
    c.TABLE_NAME AS "table"
    , c.COLUMN_NAME AS "name"
    , c.DATA_TYPE AS "udtName"
    , cast(c.IS_NULLABLE = 'YES' AS unsigned) AS "isNullable"
    , CAST(c.COLUMN_DEFAULT IS NOT NULL AS unsigned) AS "hasDefault"
    , CAST(0 AS unsigned) AS "isArray"
FROM
    information_schema.COLUMNS AS c
WHERE
    c.TABLE_SCHEMA = ?
    AND c.TABLE_NAME = ?
