SELECT
    c.TABLE_NAME AS "table"
FROM
    information_schema.columns AS c
WHERE
    c.TABLE_SCHEMA = ?
GROUP BY
    c.TABLE_NAME
