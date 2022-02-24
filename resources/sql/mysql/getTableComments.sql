SELECT
    t.TABLE_NAME AS "table"
    , t.TABLE_COMMENT AS "description"
FROM
    information_schema.tables AS t
WHERE
    t.TABLE_COMMENT IS NOT NULL
    AND t.TABLE_COMMENT != ''
