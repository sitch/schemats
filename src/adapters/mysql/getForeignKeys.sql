-- SELECT
--     tc.CONSTRAINT_NAME AS "constraint"
--     , tc.TABLE_NAME AS "table"
--     , cl2.relname AS "tabl2e"
--     , att2.attname AS "column"
--     , cl.relname AS "foreignTable"
--     , att.attname AS "foreignColumn"
--     , conname AS "constraint"
-- FROM
--     INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
-- WHERE
--     tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
--     AND tc.TABLE_SCHEMA = $1
--
-- SELECT DISTINCT
--     fks.referenced_table_name AS "primary_table"
--     , fks.table_name AS "foreign_table"
--     , fks.constraint_name AS "constraint_name"
--     , kcu.column_name AS "column_name"
--     --         fks.*
--     , kcu.*
-- FROM
--     information_schema.referential_constraints fks
--     JOIN information_schema.key_column_usage kcu ON fks.constraint_schema = kcu.table_schema
--         AND fks.table_name = kcu.table_name
--         AND fks.constraint_name = kcu.constraint_name
--         -- WHERE fks.constraint_schema = 'database name'
--         -- AND fks.unique_constraint_schema = 'database name'
--
--
--
--
SELECT
    kcu.TABLE_NAME AS "primaryTable"
    , kcu.COLUMN_NAME AS "primaryColumn"
    , kcu.REFERENCED_TABLE_NAME AS "foreignTable"
    , kcu.REFERENCED_COLUMN_NAME AS "foreignColumn"
    , kcu.CONSTRAINT_NAME AS "constraintName"
FROM
    information_schema.key_column_usage AS kcu
WHERE
    kcu.REFERENCED_TABLE_NAME IS NOT NULL
    AND kcu.REFERENCED_COLUMN_NAME IS NOT NULL
    AND kcu.TABLE_SCHEMA = kcu.REFERENCED_TABLE_SCHEMA
    AND kcu.TABLE_SCHEMA = ?
    --   and kcu.REFERENCED_TABLE_NAME = $2 -- TABLE_NAME
