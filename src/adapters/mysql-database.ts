import { Config } from "../config";
import { jsonEq } from "../utils";
import { Connection, createConnection, RowDataPacket } from "mysql2/promise";
import {
  Database,
  EnumDefinition,
  EnumDefinitions,
  TableDefinition,
  TableDefinitions,
  ColumnDefinition,
  ColumnDefinitions,
  CustomType,
  CustomTypes,
  TableComments,
  ForeignKeys,
} from "./types";
import { translateMySQLToTypescript } from "../typemaps/typescript-typemap";

const parseMysqlEnumeration = (mysqlEnum: string): string[] => {
  return mysqlEnum.replace(/(^(enum|set)\('|'\)$)/gi, "").split(`','`);
};

const getEnumNameFromColumn = (
  dataType: string,
  columnName: string
): string => {
  return `${dataType}_${columnName}`;
};

const assertValidEnum = (
  enumMap: Record<string, string[]>,
  { name, values }: EnumDefinition,
  column: string
) => {
  if (enumMap[name] && jsonEq(enumMap[name], values)) {
    throw new Error(
      `Multiple enums with the same name and contradicting types were found: ${column}: ${JSON.stringify(
        enumMap[name]
      )} and ${JSON.stringify(values)}`
    );
  }
};

// const castTableDefinition = ( { COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT }  : {
//   COLUMN_NAME: string;
//   DATA_TYPE: string;
//   IS_NULLABLE: string;
//   COLUMN_DEFAULT: string;
// }) => ({
//   name: COLUMN_NAME,
//   udtName: /^(enum|set)$/i.test(DATA_TYPE)
//     ? getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME)
//     : DATA_TYPE,
//   nullable: IS_NULLABLE === "YES",
//   isArray: false,
//   hasDefault: COLUMN_DEFAULT !== null,
// })

export class MysqlDatabase implements Database {
  public version: string = "";
  private db!: Connection;

  constructor(private config: Config, public connectionString: string) {}

  public async isReady(): Promise<void> {
    this.db = await createConnection(this.connectionString);
  }

  public async close(): Promise<void> {
    await this.db.destroy();
  }

  public getConnectionString(): string {
    return this.connectionString;
  }

  public async getDefaultSchema(): Promise<string> {
    return "public";
  }

  public async getTableNames(schemaName: string): Promise<string[]> {
    const result = await this.query<{ TABLE_NAME: string }>(
      `
        SELECT
          TABLE_NAME AS TABLE_NAME
        FROM
          information_schema.columns
        WHERE
          table_schema = ?
        GROUP BY
          TABLE_NAME
        `,
      [schemaName]
    );
    return result.map(({ TABLE_NAME }) => TABLE_NAME);
  }

  public async getEnumDefinitions(
    schemaName: string
  ): Promise<EnumDefinitions> {
    const result = await this.query<{
      COLUMN_NAME: string;
      COLUMN_TYPE: string;
      DATA_TYPE: string;
    }>(
      `
        SELECT
          COLUMN_NAME AS COLUMN_NAME,
          COLUMN_TYPE AS COLUMN_TYPE,
          DATA_TYPE AS DATA_TYPE
        FROM
          information_schema.columns
        WHERE
          DATA_TYPE IN ('enum', 'set')
          AND table_schema = ?
        `,
      [schemaName]
    );

    let enumMap: Record<string, string[]> = {};

    return result.map(
      ({ COLUMN_NAME, COLUMN_TYPE, DATA_TYPE }): EnumDefinition => {
        const name = getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME);
        const values = parseMysqlEnumeration(COLUMN_TYPE);

        const record = {
          // table: `MISSING TABLE ${name}`,
          // values: new Set(values)
          column: COLUMN_NAME,
          name,
          values,
        };

        assertValidEnum(enumMap, record, COLUMN_NAME);
        enumMap[name] = values;

        return record;
      }
    );
  }

  public async getTableDefinition(
    schemaName: string,
    tableName: string
  ): Promise<TableDefinition> {
    const result = await this.query<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      IS_NULLABLE: string;
      COLUMN_DEFAULT: string;
    }>(
      `
        SELECT
          COLUMN_NAME AS COLUMN_NAME,
          DATA_TYPE AS DATA_TYPE,
          IS_NULLABLE AS IS_NULLABLE,
          COLUMN_DEFAULT AS COLUMN_DEFAULT
        FROM
          information_schema.columns
        WHERE
          TABLE_NAME = ?
          and table_schema = ?
      `,
      [tableName, schemaName]
    );
    return result.reduce(
      (
        table,
        { COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT }
      ): TableDefinition => {
        const columnDefinition: ColumnDefinition = {
          name: COLUMN_NAME,
          isArray: false,
          nullable: IS_NULLABLE === "YES",
          hasDefault: COLUMN_DEFAULT !== null,
          udtName: /^(enum|set)$/i.test(DATA_TYPE)
            ? getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME)
            : DATA_TYPE,
        };
        table.columns[COLUMN_NAME] = columnDefinition;
        return table;
      },
      { name: tableName, columns: {} } as TableDefinition
    );
  }

  public async getTableComments(schemaName: string, tableName: string) {
    // See https://stackoverflow.com/a/4946306/388951
    const result = await this.query<{
      TABLE_NAME: string;
      COLUMN_NAME: string;
      DESCRIPTION: string;
    }>(
      `
        SELECT
          COLUMN_NAME AS COLUMN_NAME,
          COLUMN_TYPE AS COLUMN_TYPE,
          COLUMN_DEFAULT AS COLUMN_DEFAULT,
          COLUMN_COMMENT AS COLUMN_COMMENT
        FROM
          information_schema.COLUMNS
        WHERE
          table_schema = ?
          AND TABLE_NAME = ?;
            `,
      [schemaName, tableName]
    );

    return result.reduce((result, { COLUMN_NAME, DESCRIPTION }) => {
      result.columns[COLUMN_NAME] = {column: COLUMN_NAME, description: DESCRIPTION};
      return result;
    }, {table: tableName, columns: {}} as TableComments);
  }

  public async getForeignKeys(schemaName: string) : Promise<ForeignKeys> {
    return {}
  }

  public async getMeta(schemaName: string, tableName: string) : Promise<void> {
  }

  private async query<T>(query: string, args: any[]): Promise<T[]> {
    const [rows, _columns] = await this.db.query<RowDataPacket[]>(query, args);
    return rows as unknown as T[];
  }
}
