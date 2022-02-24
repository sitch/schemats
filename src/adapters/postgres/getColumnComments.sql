SELECT
    c.table_name AS "table"
    , c.column_name AS "column"
    , pgd.description AS "comment"
FROM
    pg_catalog.pg_statio_all_tables AS st
    INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
    INNER JOIN information_schema.columns c ON (pgd.objsubid = c.ordinal_position
            AND c.table_schema = st.schemaname
            AND c.table_name = st.relname)
WHERE
    c.table_schema = $1
