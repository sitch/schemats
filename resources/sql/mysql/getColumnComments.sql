SELECT
    c.TABLE_NAME AS "table"
    , c.COLUMN_NAME AS "column"
    , c.COLUMN_TYPE AS "columnType"
    , c.COLUMN_DEFAULT AS "columnDefault"
    , c.COLUMN_COMMENT AS "comment"
FROM
    information_schema.COLUMNS AS c
WHERE
    c.TABLE_SCHEMA = ?
