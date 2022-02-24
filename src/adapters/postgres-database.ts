import { Client } from "pg";
import { groupBy, countBy, keyBy, mapValues, fromPairs } from "lodash";
import { Config } from "../config";
import { readSQL } from "../utils";
import {
  ColumnComment,
  ColumnName,
  Database,
  EnumDefinition,
  ForeignKey,
  PrimaryKey,
  SchemaName,
  TableComment,
  TableDefinition,
  TableName,
  UDTName,
} from "./types";

//------------------------------------------------------------------------------

const queryDir = `${__dirname}/postgres`;
const Queries = {
  getTableNames: readSQL(`${queryDir}/getTableNames.sql`),
  getPrimaryKeys: readSQL(`${queryDir}/getPrimaryKeys.sql`),
  getForeignKeys: readSQL(`${queryDir}/getForeignKeys.sql`),
  getTableComments: readSQL(`${queryDir}/getTableComments.sql`),
  getColumnComments: readSQL(`${queryDir}/getColumnComments.sql`),
  getEnums: readSQL(`${queryDir}/getEnums.sql`),
  getTable: readSQL(`${queryDir}/getTable.sql`),
  // getTableMeta: readSQL(`${queryDir}/getTableMeta.sql`),
};

//------------------------------------------------------------------------------

export class PostgresDatabase implements Database {
  private db: Client;
  public version: string = "";

  constructor(private config: Config, private connectionString?: string) {
    this.db = new Client(connectionString);
  }

  public async isReady(): Promise<void> {
    await this.db.connect();
    this.connectionString = `postgres://username:password@${this.db.host}:${this.db.port}/${this.db.database}`;
    const result = await this.query<{ version: string }>(`SELECT version()`);
    this.version = result[0].version;
  }

  public async close(): Promise<void> {
    await this.db.end();
  }

  public getConnectionString(): string {
    return this.connectionString!;
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

  // https://dataedo.com/kb/query/postgresql/list-all-primary-keys-and-their-columns
  public async getPrimaryKeys(schema: SchemaName): Promise<PrimaryKey[]> {
    return await this.query<PrimaryKey>(Queries.getPrimaryKeys, [schema]);
  }

  // See https://stackoverflow.com/a/10950402/388951
  public async getForeignKeys(schema: SchemaName): Promise<ForeignKey[]> {
    return await this.query<ForeignKey>(Queries.getForeignKeys, [schema]);
  }

  public async getTableComments(schema: SchemaName): Promise<TableComment[]> {
    return await this.query<TableComment>(Queries.getTableComments, [schema]);
  }

  public async getColumnComments(schema: SchemaName): Promise<ColumnComment[]> {
    return await this.query<ColumnComment>(Queries.getColumnComments, [schema]);
  }

  public async getEnums(schema: SchemaName): Promise<EnumDefinition[]> {
    const result = await this.query<{
      name: string;
      value: string;
    }>(Queries.getEnums, [schema]);

    const groups = groupBy(result, "name");
    return Object.keys(groups).map((name) => ({
      name,
      values: groups[name].map(({ value }) => value),
    }));
  }

  // https://www.developerfiles.com/adding-and-retrieving-comments-on-postgresql-tables/
  public async getTable(
    schema: SchemaName,
    table: TableName
  ): Promise<TableDefinition> {
    const result = await this.query<{
      name: ColumnName;
      udtName: UDTName;
      isArray: boolean;
      isNullable: boolean;
      hasDefault: boolean;
    }>(Queries.getTable, [schema, table]);

    if (result.length === 0) {
      console.error(`[postgres] Missing columns for table: ${schema}.${table}`);
    }
    return { name: table, columns: keyBy(result, "name") };
  }

  private async query<T>(query: string, args: any[] = []): Promise<T[]> {
    const result = await this.db.query<T>(query, args);
    return result.rows;
  }
}
