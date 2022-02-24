SELECT
    kcu.table_name AS "table"
    , kcu.column_name AS "column"
    , tco.constraint_name AS "constraintName"
    , kcu.ordinal_position AS "ordinalPosition"
    , (kcu.position_in_unique_constraint IS NOT NULL) AS "isUnique"
FROM
    information_schema.table_constraints tco
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tco.constraint_name
        AND kcu.constraint_schema = tco.constraint_schema
        AND kcu.constraint_name = tco.constraint_name
WHERE
    tco.constraint_type = 'PRIMARY KEY'
    AND kcu.table_schema = $1
    -- AND kcu.table_name = $2 -- TABLE_NAME
ORDER BY
    kcu.table_name
    , kcu.ordinal_position;
