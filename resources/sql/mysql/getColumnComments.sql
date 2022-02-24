SELECT
    c.TABLE_NAME AS "table"
    , c.COLUMN_NAME AS "column"
    , c.COLUMN_COMMENT AS "comment"
FROM
    information_schema.COLUMNS AS c
WHERE
    c.TABLE_SCHEMA = ?
    AND c.COLUMN_COMMENT IS NOT NULL
    AND c.COLUMN_COMMENT != ''
