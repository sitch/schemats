SELECT
    table_name AS "table"
FROM
    information_schema.columns
WHERE
    table_schema = $1
GROUP BY
    table_name
