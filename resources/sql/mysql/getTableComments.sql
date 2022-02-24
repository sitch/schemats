SELECT
    t.TABLE_NAME AS "table"
    , t.TABLE_COMMENT AS "description"
FROM
    information_schema.tables AS t
