-- SELECT
--     kcu.table_name AS "table"
--     , kcu.column_name AS "column"
--     , tco.constraint_name AS "constraintName"
--     , kcu.ordinal_position AS "ordinalPosition"
-- FROM
--     information_schema.table_constraints tco
--     JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tco.constraint_name
--         AND kcu.constraint_schema = tco.constraint_schema
--         AND kcu.constraint_name = tco.constraint_name
-- WHERE
--     tco.constraint_type = 'PRIMARY KEY'
--     AND kcu.table_schema = $1
-- ORDER BY
--     kcu.table_name
--     , kcu.ordinal_position;
--
--
SELECT
    tab.TABLE_NAME AS "table"
    , sta.COLUMN_NAME AS "column"
    , sta.INDEX_NAME AS "constraintName"
    , sta.SEQ_IN_INDEX AS "ordinalPosition"
    , (NOT sta.NON_UNIQUE) AS "isUnique"
FROM
    information_schema.tables AS tab
    INNER JOIN information_schema.statistics AS sta ON sta.TABLE_SCHEMA = tab.TABLE_SCHEMA
        AND sta.TABLE_NAME = tab.TABLE_NAME
        AND sta.INDEX_NAME = 'primary'
WHERE
    tab.TABLE_SCHEMA = ?
    -- AND tab.TABLE_TYPE = ? -- TABLE_NAME
ORDER BY
    tab.TABLE_NAME
    , sta.SEQ_IN_INDEX
