import { Config } from "../config";
import { Connection, createConnection, RowDataPacket } from "mysql2/promise";
import {
  Database,
  TableDefinition,
  TableDefinitions,
  EnumDefinition,
  EnumDefinitions,
  ColumnDefinition,
  CustomType,
  CustomTypes,
} from "./types";

import { translateMySQLToTypescript} from "../typemaps/typescript-typemap"

const parseMysqlEnumeration = (mysqlEnum: string): string[] => {
  return mysqlEnum.replace(/(^(enum|set)\('|'\)$)/gi, "").split(`','`);
};

const getEnumNameFromColumn = (
  dataType: string,
  columnName: string
): string => {
  return `${dataType}_${columnName}`;
};

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
    const tables = await this.query<{ TABLE_NAME: string }>(
      `
            SELECT TABLE_NAME
            FROM information_schema.columns
            WHERE table_schema = ?
            GROUP BY TABLE_NAME
        `,
      [schemaName]
    );
    return tables.map(({ TABLE_NAME }) => TABLE_NAME);
  }

  public async getEnumDefinitions(
    schemaName: string
  ): Promise<EnumDefinitions> {
    const rawEnumRecords = await this.query<{
      COLUMN_NAME: string;
      COLUMN_TYPE: string;
      DATA_TYPE: string;
    }>(
      `
            SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE
            FROM information_schema.columns
            WHERE DATA_TYPE IN ('enum', 'set') and table_schema = ?
        `,
      [schemaName]
    );

    return rawEnumRecords.map(
      ({ COLUMN_NAME, COLUMN_TYPE, DATA_TYPE }): EnumDefinition => {
        const enumName = getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME);
        const enumValues = parseMysqlEnumeration(COLUMN_TYPE);
        // if (result[enumName] && JSON.stringify(result[enumName]) !== JSON.stringify(enumValues)) {
        //     throw new Error(
        //         `Multiple enums with the same name and contradicting types were found: ${COLUMN_NAME}: ${JSON.stringify(result[enumName])} and ${JSON.stringify(enumValues)}`
        //     )
        // }
        return {
          // table: `MISSING TABLE ${enumName}`,
          name: enumName,
          column: COLUMN_NAME,
          // values: new Set(enumValues)
          values: enumValues,
        };
      }
    );
  }

  public async getTableDefinition(
    schemaName: string,
    tableName: string
  ): Promise<TableDefinition> {
    const tableColumns = await this.query<{
      COLUMN_NAME: string;
      DATA_TYPE: string;
      IS_NULLABLE: string;
      COLUMN_DEFAULT: string;
    }>(
      `
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.columns
            WHERE TABLE_NAME = ? and table_schema = ?`,
      [tableName, schemaName]
    );
    return tableColumns.reduce(
      (
        tableDefinition: TableDefinition,
        { COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT }
      ): TableDefinition => {
        const columnDefinition: ColumnDefinition = {
          name: COLUMN_NAME,
          udtName: /^(enum|set)$/i.test(DATA_TYPE)
            ? getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME)
            : DATA_TYPE,
          nullable: IS_NULLABLE === "YES",
          isArray: false,
          hasDefault: COLUMN_DEFAULT !== null,
        };
            tableDefinition.columns[COLUMN_NAME] = columnDefinition
        return tableDefinition;
      },
      { name: tableName, columns: {}}
    );
  }

  public async getTableDefinitions(
    schemaName: string,
    tableName: string,
    customTypes: CustomTypes
  ) {
    const enumType = await this.getEnumDefinitions(schemaName);
    const columnComments = await this.getTableComments(schemaName, tableName);
    return translateMySQLToTypescript(
      this.config,
      await this.getTableDefinition(schemaName, tableName),
      new Set(Object.keys(enumType)),
      customTypes,
      columnComments
    );
  }

  public async getTableComments(schemaName: string, tableName: string) {
    // See https://stackoverflow.com/a/4946306/388951
    const commentsResult = await this.query<{
      TABLE_NAME: string;
      COLUMN_NAME: string;
      DESCRIPTION: string;
    }>(
      `
            select COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, column_comment
            from information_schema.COLUMNS
            where table_schema = ? and TABLE_NAME = ?;
            `,
      [schemaName, tableName]
    );
    return commentsResult.reduce((result, { COLUMN_NAME, DESCRIPTION }) => {
      result[COLUMN_NAME] = DESCRIPTION;
      return result;
    }, {} as Record<string, string>);
  }

  private async query<T>(query: string, args: any[]): Promise<T[]> {
    const [rows, columns] = await this.db.query<RowDataPacket[]>(query, args);
    return rows as unknown as T[];
  }
}
