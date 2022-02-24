import json5 from "json5";
import { keyBy } from "lodash";
import { Connection, createConnection, RowDataPacket } from "mysql2/promise";
import { Config } from "../config";
import { readSQL } from "../utils";
import {
  ColumnComment,
  ColumnName,
  Database,
  EnumDefinition,
  EnumName,
  ForeignKey,
  PrimaryKey,
  SchemaName,
  TableComment,
  TableDefinition,
  TableName,
  UDTName,
} from "./types";

//------------------------------------------------------------------------------

const Queries = {
  getTableNames: readSQL("resources/sql/mysql/getTableNames.sql"),
  getPrimaryKeys: readSQL("resources/sql/mysql/getPrimaryKeys.sql"),
  getForeignKeys: readSQL("resources/sql/mysql/getForeignKeys.sql"),
  getTableComments: readSQL("resources/sql/mysql/getTableComments.sql"),
  getColumnComments: readSQL("resources/sql/mysql/getColumnComments.sql"),
  getEnums: readSQL("resources/sql/mysql/getEnums.sql"),
  getTable: readSQL("resources/sql/mysql/getTable.sql"),
};

//------------------------------------------------------------------------------

type MySQLEncodedEnumValueString = string;

//------------------------------------------------------------------------------

export class MySQLDatabase implements Database {
  public version: string = "";
  private db!: Connection;

  constructor(private config: Config, public connectionString: string) {}

  public async isReady(): Promise<void> {
    this.db = await createConnection(this.connectionString);
  }

  public async close(): Promise<void> {
    this.db.destroy();
  }

  public getConnectionString(): string {
    return this.connectionString;
  }

  public async getDefaultSchema(): Promise<SchemaName> {
    return "public";
  }

  public async getTableNames(schema: SchemaName): Promise<TableName[]> {
    const result = await this.query<{ table: TableName }>(
      Queries.getTableNames,
      [schema]
    );
    return result.map(({ table }) => table);
  }

  // https://dataedo.com/kb/query/mysql/list-all-primary-keys-and-their-columns
  public async getPrimaryKeys(schema: SchemaName): Promise<PrimaryKey[]> {
    return await this.query<PrimaryKey>(Queries.getPrimaryKeys, [schema]);
  }

  public async getForeignKeys(schema: SchemaName): Promise<ForeignKey[]> {
    return await this.query<ForeignKey>(Queries.getForeignKeys, [schema]);
  }

  // See https://stackoverflow.com/a/4946306/388951
  public async getTableComments(schema: SchemaName): Promise<TableComment[]> {
    return await this.query<TableComment>(Queries.getTableComments, [schema]);
  }

  public async getColumnComments(schema: SchemaName): Promise<ColumnComment[]> {
    return await this.query<ColumnComment>(Queries.getColumnComments, [schema]);
  }

  public async getEnums(schema: SchemaName): Promise<EnumDefinition[]> {
    const result = await this.query<{
      name: EnumName;
      table: TableName;
      column: ColumnName;
      isNullable: boolean;
      hasDefault: boolean;
      encodedEnumValues: MySQLEncodedEnumValueString;
    }>(Queries.getEnums, [schema]);

    return result.map(
      ({ encodedEnumValues, ...rest }): EnumDefinition => ({
        ...rest,
        values: this.parseEnumString(encodedEnumValues),
      })
    );
  }

  public async getTable(
    schema: SchemaName,
    table: TableName
  ): Promise<TableDefinition> {
    const result = await this.query<{
      table: TableName;
      name: ColumnName;
      udtName: UDTName;
      isArray: boolean;
      isNullable: boolean;
      hasDefault: boolean;
    }>(Queries.getTable, [schema, table]);

    if (result.length === 0) {
      console.error(`[mysql] Missing columns for table: ${schema}.${table}`);
    }
    return { name: table, columns: keyBy(result, "name") };
  }

  private async query<T>(query: string, args: any[]): Promise<T[]> {
    const [rows, _columns] = await this.db.query<RowDataPacket[]>(query, args);
    return rows as T[];
  }

  private parseEnumString(value: MySQLEncodedEnumValueString): string[] {
    const REGEX_MYSQL_SET_OR_ENUM = /^(enum|set)\(?|\)$/g;

    if (!REGEX_MYSQL_SET_OR_ENUM.test(value)) {
      console.error(`[mysql] Unrecognized enum value format: ${value}`);
    }
    const encoded = `[${value.replace(REGEX_MYSQL_SET_OR_ENUM, "")}]`;
    return json5.parse(encoded);
  }
}
