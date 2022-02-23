import { Client } from "pg";
import { groupBy, countBy, mapValues, fromPairs } from "lodash";
import * as lodash from "lodash";
import { Config } from "../config";
import {
  Database,
  EnumDefinition,
  EnumDefinitions,
  TableDefinition,
  TableComment,
  TableComments,
  TableDefinitions,
  ColumnDefinition,
  CustomType,
  CustomTypes,
  ForeignKey,
  ForeignKeys,
} from "./types";
import { translatePostgresToTypescript } from "../typemaps/typescript-typemap";

export class PostgresDatabase implements Database {
  private db: Client;
  public version: string = "";

  constructor(private config: Config, private connectionString?: string) {
    this.db = new Client(connectionString);
  }

  public async isReady() {
    await this.db.connect();
    this.connectionString = `postgres://username:password@${this.db.host}:${this.db.port}/${this.db.database}`;
    const result = await this.db.query<{ version: string }>(`SELECT version()`);
    this.version = result.rows[0].version;
  }

  public async close() {
    await this.db.end();
  }

  public getConnectionString(): string {
    return this.connectionString!;
  }

  public async getDefaultSchema(): Promise<string> {
    return "public";
  }

  public async getTableNames(schemaName: string): Promise<string[]> {
    const result = await this.db.query(
      `
        SELECT
          table_name AS table_name
        FROM
          information_schema.columns
        WHERE
          table_schema = $1
        GROUP BY
          table_name

        `,
      [schemaName]
    );
    if (result.rows.length === 0) {
      console.error(`Missing schema: ${schemaName}`);
    }
    return result.rows.map(({ table_name }) => table_name);
  }

  // n.oid as oid
  // n.nspname as nspname
  // n.nspowner as nspowner
  // n.nspacl as nspacl

  // t.oid as oid
  // t.typname as typname
  // t.typnamespace as typnamespace
  // t.typowner as typowner
  // t.typlen as typlen
  // t.typbyval as typbyval
  // t.typtype as typtype
  // t.typcategory as typcategory
  // t.typispreferred as typispreferred
  // t.typisdefined as typisdefined
  // t.typdelim as typdelim
  // t.typrelid as typrelid
  // t.typsubscript as typsubscript
  // t.typelem as typelem
  // t.typarray as typarray
  // t.typinput as typinput
  // t.typoutput as typoutput
  // t.typreceive as typreceive
  // t.typsend as typsend
  // t.typmodin as typmodin
  // t.typmodout as typmodout
  // t.typanalyze as typanalyze
  // t.typalign as typalign
  // t.typstorage as typstorage
  // t.typnotnull as typnotnull
  // t.typbasetype as typbasetype
  // t.typtypmod as typtypmod
  // t.typndims as typndims
  // t.typcollation as typcollation
  // t.typdefaultbin as typdefaultbin
  // t.typdefault as typdefault
  // t.typacl as typacl

  // e.oid as oid
  // e.enumtypid as enumtypid
  // e.enumsortorder as enumsortorder
  // e.enumlabel as enumlabel

  public async getEnumDefinitions(schema: string): Promise<EnumDefinitions> {
    const result = await this.db.query<{ name: string; value: string }>(
      `
        SELECT
          t.typname AS name,
          e.enumlabel AS value
        FROM
          pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
        WHERE
          n.nspname = $1
        `,
      [schema]
    );
    const groups = groupBy(result.rows, "name");
    return Object.keys(groups).map(
      (name): EnumDefinition => ({
        // table: `MISSING TABLE ${name}`,
        // column: name,
        name,
        values: groups[name].map(({ value }) => value),
      })
    );
  }

  public async getTableDefinition(
    schemaName: string,
    tableName: string
  ): Promise<TableDefinition> {
    // https://www.developerfiles.com/adding-and-retrieving-comments-on-postgresql-tables/
    const result = await this.db.query<{
      column_name: string;
      udt_name: string;
      is_nullable: string;
      column_default: boolean;
    }>(
      `
        SELECT
          column_name AS column_name,
          udt_name AS udt_name,
          is_nullable AS is_nullable,
          column_default IS NOT NULL AS column_default
        FROM
          information_schema.columns
        WHERE
          table_name = $1
          AND table_schema = $2

        `,
      [tableName, schemaName]
    );
    if (result.rows.length === 0) {
      console.error(`Missing table: ${schemaName}.${tableName}`);
    }
    return result.rows.reduce(
      (table, { column_name, udt_name, is_nullable, column_default }) => {
        table.columns[column_name] = {
          name: column_name,
          hasDefault: column_default,
          nullable: is_nullable === "YES",
          udtName: udt_name.replace(/^_/, ""),
          isArray: udt_name.startsWith("_"),
        };
        return table;
      },
      { name: tableName, columns: {} } as TableDefinition
    );
  }

  public async getTableComments(
    schemaName: string,
    tableName: string
  ): Promise<TableComments> {
    // See https://stackoverflow.com/a/4946306/388951
    const result = await this.db.query<{
      column: string;
      description: string;
    }>(
      `
          SELECT
            c.column_name AS column,
            pgd.description AS description
          FROM
            pg_catalog.pg_statio_all_tables AS st
            INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
            INNER JOIN information_schema.columns c ON (
              pgd.objsubid = c.ordinal_position
              AND c.table_schema = st.schemaname
              AND c.table_name = st.relname
            )
          WHERE
            c.table_schema = $1
            and c.table_name = $2
          `,
      [schemaName, tableName]
    );
    return result.rows.reduce(
      (result, { column, description }) => {
        result.columns[column] = { column, description };
        return result;
      },
      { table: tableName, columns: {} } as TableComments
    );
  }

  // public async getMeta(schemaName: string, tableName: string) : Promise<void> {
  //   // See https://stackoverflow.com/a/4946306/388951
  //   const result = await this.db.query<{
  //     schemaname: string;
  //     TABLENAME: string;
  //     field: string;
  //     type: string;
  //     len: string;
  //   }>(
  //     `
  //       SELECT
  //         pg_tables.schemaname,
  //         pg_tables.TABLENAME,
  //         pg_attribute.attname AS field,
  //         format_type(pg_attribute.atttypid, NULL) AS "type",
  //         pg_attribute.atttypmod AS len,
  //         (
  //           SELECT
  //             col_description(
  //               pg_attribute.attrelid, pg_attribute.attnum
  //             )
  //         ) AS COMMENT,
  //         CASE pg_attribute.attnotnull WHEN FALSE THEN 1 ELSE 0 END AS "notnull",
  //         pg_constraint.conname AS "key",
  //         pc2.conname AS ckey,
  //         (
  //           SELECT
  //             pg_attrdef.adsrc
  //           FROM
  //             pg_attrdef
  //           WHERE
  //             pg_attrdef.adrelid = pg_class.oid
  //             AND pg_attrdef.adnum = pg_attribute.attnum
  //         ) AS def
  //       FROM
  //         pg_tables,
  //         pg_class
  //         JOIN pg_attribute ON pg_class.oid = pg_attribute.attrelid
  //         AND pg_attribute.attnum > 0
  //         LEFT JOIN pg_constraint ON pg_constraint.contype = 'p' :: "char"
  //         AND pg_constraint.conrelid = pg_class.oid
  //         AND (
  //           pg_attribute.attnum = ANY (pg_constraint.conkey)
  //         )
  //         LEFT JOIN pg_constraint AS pc2 ON pc2.contype = 'f' :: "char"
  //         AND pc2.conrelid = pg_class.oid
  //         AND (
  //           pg_attribute.attnum = ANY (pc2.conkey)
  //         )
  //       WHERE
  //         pg_class.relname = pg_tables.TABLENAME
  //         AND pg_tables.schemaname IN ('op', 'im', 'cs', 'usr', 'li') -- AND pg_tables.tableowner = "current_user"()
  //         AND pg_attribute.atttypid <> 0 :: oid ---AND TABLENAME = $1
  //       ORDER BY
  //         pg_tables.schemaname,
  //         pg_tables.TABLENAME ASC;
  // `,
  //     [schemaName, tableName]
  //   );
  //   console.log(result.rows);
  // }

  // public async getTableComments(schemaName: string, tableName: string): Promise<TableComments> {

  //     const comments: TableComment[] = await this.db.query(
  //         `
  //             SELECT
  //                 t.table_name,
  //                 pgd.description
  //             FROM pg_catalog.pg_statio_all_tables AS st
  //             INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid=st.relid)
  //             INNER JOIN information_schema.tables t ON (
  //                 t.table_schema=st.schemaname AND
  //                 t.table_name=st.relname
  //             )
  //             WHERE pgd.objsubid = 0
  //                 AND t.table_schema = $1;
  //         `,
  //         [schemaName],
  //     );

  //     return _.fromPairs(comments.map((c) => [c.table_name, c.description]));
  // }

  /**
        public async getPrimaryKeys(schemaName: string) {
        interface PrimaryKeyDefinition {
            table_name: string;
            constraint_name: string;
            ordinal_position: number;
            key_column: string;
        }

        // https://dataedo.com/kb/query/postgresql/list-all-primary-keys-and-their-columns
        const keysResult: PrimaryKeyDefinition[] = await this.db.query(
            `
        SELECT
          kcu.table_name,
          tco.constraint_name,
          kcu.ordinal_position as position,
          kcu.column_name as key_column
        FROM
          information_schema.table_constraints tco
          JOIN information_schema.key_column_usage kcu on kcu.constraint_name = tco.constraint_name
          and kcu.constraint_schema = tco.constraint_schema
          and kcu.constraint_name = tco.constraint_name
        WHERE
          tco.constraint_type = 'PRIMARY KEY'
          AND kcu.table_schema = $1
        ORDER BY
          kcu.table_name,
          position;
            `,
            [schemaName],
        );

        return []
    }
    **/

  public async getForeignKeys(schemaName: string): Promise<ForeignKeys> {
    // See https://stackoverflow.com/a/10950402/388951
    const result = await this.db.query<{
      table_name: string;
      column_name: string;
      foreign_table_name: string;
      foreign_column_name: string;
      conname: string;
    }>(
      `
          SELECT
              cl2.relname AS table_name,
              att2.attname AS column_name,
              cl.relname AS foreign_table_name,
              att.attname AS foreign_column_name,
              conname
          FROM
              (SELECT
                  unnest(con1.conkey) AS "parent",
                  unnest(con1.confkey) AS "child",
                  con1.confrelid,
                  con1.conrelid,
                  con1.conname
              FROM pg_class cl
              JOIN pg_namespace ns ON cl.relnamespace = ns.oid
              JOIN pg_constraint con1 ON con1.conrelid = cl.oid
              WHERE ns.nspname = $1 AND con1.contype = 'f'
              ) con
          JOIN pg_attribute att ON att.attrelid = con.confrelid and att.attnum = con.child
          JOIN pg_class cl ON cl.oid = con.confrelid
          JOIN pg_class cl2 ON cl2.oid = con.conrelid
          JOIN pg_attribute att2 ON att2.attrelid = con.conrelid AND att2.attnum = con.parent
          `,
      [schemaName]
    );

    // Multi-column foreign keys are harder to model.
    // To get consistent outputs, just ignore them for now.
    const countKey = (fk: ForeignKey) => `${fk.table_name},${fk.conname}`;
    const colCounts = countBy(result.rows, countKey);

    // console.log(result.rows);

    const groups: Record<string, ForeignKey[]> = groupBy(
      result.rows,
      "table_name"
    );

    return groups;

    // return mapValues(

    // groups,

    //   (fks) => {
    //     fks.map(

    //       ({table_name, column_name, foreign_table_name, foreign_column_name, conname}) : ForeignKey => ({
    //         table_name,
    //         column_name,
    //         foreign_table_name,
    //         foreign_column_name,
    //         conname,
    //       })
    //     )

    //   }

    // )

    // return {}

    // return _(result.rows)
    //     .filter((c) => colCounts[countKey(c)] < 2)
    //     .groupBy((c) => c.table_name)
    //     .mapValues((tks) =>
    //         fromPairs(
    //             tks.map((ck) => [
    //                 ck.column_name,
    //                 { table: ck.foreign_table_name, column: ck.foreign_column_name },
    //             ]),
    //         ),
    //     )
    //     .value();
  }

  // async getMeta(schemaName: string): Promise<Metadata> {
  //     if (this.metadata && schemaName === this.metadata.schema) {
  //         return this.metadata;
  //     }

  //     const [
  //         EnumDefinition,
  //         tableToKeys,
  //         foreignKeys,
  //         columnComments,
  //         tableComments,
  //     ] = await Promise.all([
  //         this.getEnumDefinition(),
  //         this.getPrimaryKeys(schemaName),
  //         this.getForeignKeys(schemaName),
  //         this.getTableComments(schemaName),
  //         this.getTableComments(schemaName),
  //     ]);

  //     const metadata: Metadata = {
  //         schema: schemaName,
  //         EnumDefinition,
  //         tableToKeys,
  //         foreignKeys,
  //         columnComments,
  //         tableComments,
  //     };

  //     this.metadata = metadata;
  //     return metadata;
  // }
}
