SELECT
    t.table_name AS "table"
    , pgd.description AS "description"
FROM
    pg_catalog.pg_statio_all_tables AS st
    INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
    INNER JOIN information_schema.tables t ON (t.table_schema = st.schemaname
            AND t.table_name = st.relname)
WHERE
    pgd.objsubid = 0
    AND t.table_schema = $1
    AND pgd.description IS NOT NULL
    AND pgd.description != ''
