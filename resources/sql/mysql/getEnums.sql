SELECT
    c.TABLE_NAME AS "table"
    , c.COLUMN_NAME AS "column"
    , CONCAT(c.COLUMN_NAME , '::' , c.DATA_TYPE) AS "name"
    , CAST(c.IS_NULLABLE = 'YES' AS unsigned) AS "isNullable"
    , CAST(c.COLUMN_DEFAULT IS NOT NULL AS unsigned) AS "hasDefault"
    , c.COLUMN_TYPE AS "encodedEnumValues"
FROM
    information_schema.columns AS c
WHERE
    c.DATA_TYPE IN ('enum' , 'set')
    AND c.TABLE_SCHEMA = ?
