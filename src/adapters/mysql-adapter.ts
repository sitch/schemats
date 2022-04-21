import json5 from 'json5'
import { update } from 'lodash'
import { Connection, createConnection, RowDataPacket } from 'mysql2/promise'

import { Config } from '../config'
import { read_sql } from '../utils'
import {
  ColumnComment,
  ColumnName,
  ColumnStatistics,
  Database,
  EnumDefinition,
  EnumName,
  ForeignKey,
  PrimaryKey,
  SchemaName,
  TableComment,
  TableDefinition,
  TableName,
  TableStatistics,
  UDTName,
} from './types'

//------------------------------------------------------------------------------

const Queries = {
  getEnums: read_sql('resources/sql/mysql/getEnums.sql'),
  getTable: read_sql('resources/sql/mysql/getTable.sql'),
  getTableNames: read_sql('resources/sql/mysql/getTableNames.sql'),
  getPrimaryKeys: read_sql('resources/sql/mysql/getPrimaryKeys.sql'),
  getForeignKeys: read_sql('resources/sql/mysql/getForeignKeys.sql'),
  getTableComments: read_sql('resources/sql/mysql/getTableComments.sql'),
  getColumnComments: read_sql('resources/sql/mysql/getColumnComments.sql'),
  getTableStatistics: read_sql('resources/sql/mysql/getTableStatistics.sql'),
  getColumnStatistics: read_sql('resources/sql/mysql/getColumnStatistics.sql'),
}

//------------------------------------------------------------------------------

type MySQLEncodedEnumValueString = string

//------------------------------------------------------------------------------

export class MySQLDatabase implements Database {
  public version = ''
  private db!: Connection

  constructor(
    // eslint-disable-next-line no-unused-vars
    private config: Config,
    // eslint-disable-next-line no-unused-vars
    public connectionString: string,
  ) {}

  public async isReady(): Promise<void> {
    this.db = await createConnection(this.connectionString)
  }

  public async close(): Promise<void> {
    this.db.destroy()
    await this.db.end()
  }

  public getConnectionString(): string {
    return this.connectionString
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getDefaultSchema(): Promise<SchemaName> {
    return 'public'
  }

  public async getTableNames(schema: SchemaName): Promise<TableName[]> {
    const result = await this.query<{ table: TableName }>(Queries.getTableNames, [
      schema,
    ])
    return result.map(({ table }) => table)
  }

  // https://dataedo.com/kb/query/mysql/list-all-primary-keys-and-their-columns
  public async getPrimaryKeys(schema: SchemaName): Promise<PrimaryKey[]> {
    return await this.query<PrimaryKey>(Queries.getPrimaryKeys, [schema])
  }

  public async getForeignKeys(schema: SchemaName): Promise<ForeignKey[]> {
    return await this.query<ForeignKey>(Queries.getForeignKeys, [schema])
  }

  // See https://stackoverflow.com/a/4946306/388951
  public async getTableComments(schema: SchemaName): Promise<TableComment[]> {
    return await this.query<TableComment>(Queries.getTableComments, [schema])
  }

  public async getColumnComments(schema: SchemaName): Promise<ColumnComment[]> {
    return await this.query<ColumnComment>(Queries.getColumnComments, [schema])
  }

  public async getEnums(schema: SchemaName): Promise<EnumDefinition[]> {
    const result = await this.query<{
      name: EnumName
      table: TableName
      column: ColumnName
      is_nullable: boolean
      has_default: boolean
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default_value: any
      encoded_enum_values: MySQLEncodedEnumValueString
    }>(Queries.getEnums, [schema])

    return result
      .map(({ encoded_enum_values, ...rest }) => ({
        ...rest,
        values: this.parseEnumString(encoded_enum_values),
      }))
      .map(this.castUnsigned(['has_default', 'is_nullable']))
  }

  public async getTable(
    schema: SchemaName,
    table: TableName,
  ): Promise<TableDefinition> {
    const result = await this.query<{
      table: TableName
      name: ColumnName
      udt_name: UDTName
      is_array: boolean
      is_nullable: boolean
      has_default: boolean
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default_value: any
    }>(Queries.getTable, [schema, table])

    if (result.length === 0) {
      console.error(`[mysql] Missing columns for table: ${schema}.${table}`)
    }
    const columns = result
      // .map(
      //   this.castAny(["default_value"], (val) => {
      //     return val
      //   })
      // )
      .map(this.castUnsigned(['is_array', 'has_default', 'is_nullable']))
    return { name: table, columns }
  }

  // https://towardsdatascience.com/how-to-derive-summary-statistics-using-postgresql-742f3cdc0f44
  public async getTableStatistics(
    schema: SchemaName,
    table: TableName,
  ): Promise<TableStatistics> {
    const result = await this.query<TableStatistics>(Queries.getTableStatistics, [
      schema,
      table,
    ])
    if (result.length !== 1) {
      console.error(
        `[mysql] getTableStatistics failed to return a row: ${schema}.${table}`,
      )
    }
    return result[0]
  }

  public async getColumnStatistics(
    schema: SchemaName,
    table: TableName,
  ): Promise<ColumnStatistics[]> {
    return await this.query<ColumnStatistics>(Queries.getColumnStatistics, [
      schema,
      table,
    ])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async query<T>(query: string, args: any[]): Promise<T[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [rows, _columns] = await this.db.query<RowDataPacket[]>(query, args)
    return rows as T[]
  }

  private parseEnumString(value: MySQLEncodedEnumValueString): string[] {
    // eslint-disable-next-line regexp/no-unused-capturing-group
    const REGEX_MYSQL_SET_OR_ENUM = /^(enum|set)\(?|\)$/g

    if (!REGEX_MYSQL_SET_OR_ENUM.test(value)) {
      console.error(`[mysql] Unrecognized enum value format: ${value}`)
    }
    const encoded = `[${value.replace(REGEX_MYSQL_SET_OR_ENUM, '')}]`
    return json5.parse(encoded)
  }

  // private castAny<T extends object, W>(keys: W[], fun : (key: W) => W) : T )  {
  //   return (record: T) =>
  //     keys.reduce((record, key) => update(record, key, (val) => !!val), record);
  // }

  private castUnsigned<T extends object>(keys: string[]) {
    return (record: T) =>
      // eslint-disable-next-line unicorn/no-array-reduce
      keys.reduce(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        (record, key): T => update(record, key, value => !!value),
        record,
      )
  }
}
