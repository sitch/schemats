SELECT
    c.TABLE_NAME AS "table"
    , c.COLUMN_NAME AS "column"
    , CONCAT(c.COLUMN_NAME , '::' , c.DATA_TYPE) AS "name"
    , CAST(c.IS_NULLABLE = 'YES' AS unsigned) AS "is_nullable"
    , CAST(c.COLUMN_DEFAULT IS NOT NULL AS unsigned) AS "has_default"
    , c.COLUMN_DEFAULT AS "default_value"
    , c.COLUMN_TYPE AS "encoded_enum_values"
FROM
    information_schema.columns AS c
WHERE
    c.DATA_TYPE IN ('enum' , 'set')
    AND c.TABLE_SCHEMA = ?
