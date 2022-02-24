SELECT
    pg_tables.schemaname
    , pg_tables.TABLENAME
    , pg_attribute.attname AS field
    , format_type(pg_attribute.atttypid , NULL) AS "type"
    , pg_attribute.atttypmod AS len
    , (
        SELECT
            col_description(pg_attribute.attrelid , pg_attribute.attnum)) AS COMMENT
    , CASE pg_attribute.attnotnull
    WHEN FALSE THEN
        1
    ELSE
        0
    END AS "notnull"
    , pg_constraint.conname AS "key"
    , pc2.conname AS ckey
    , (
        SELECT
            pg_attrdef.adsrc
        FROM
            pg_attrdef
        WHERE
            pg_attrdef.adrelid = pg_class.oid
            AND pg_attrdef.adnum = pg_attribute.attnum) AS def
FROM
    pg_tables
    , pg_class
    JOIN pg_attribute ON pg_class.oid = pg_attribute.attrelid
        AND pg_attribute.attnum > 0
    LEFT JOIN pg_constraint ON pg_constraint.contype = 'p'::"char"
        AND pg_constraint.conrelid = pg_class.oid
        AND (pg_attribute.attnum = ANY (pg_constraint.conkey))
    LEFT JOIN pg_constraint AS pc2 ON pc2.contype = 'f'::"char"
        AND pc2.conrelid = pg_class.oid
        AND (pg_attribute.attnum = ANY (pc2.conkey))
WHERE
    pg_class.relname = pg_tables.TABLENAME
    AND pg_tables.schemaname IN ('op' , 'im' , 'cs' , 'usr' , 'li') -- AND pg_tables.tableowner = "current_user"()
    AND pg_attribute.atttypid <> 0::oid ---AND TABLENAME = $1
ORDER BY
    pg_tables.schemaname
    , pg_tables.TABLENAME ASC;
