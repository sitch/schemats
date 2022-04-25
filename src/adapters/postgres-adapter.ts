import { groupBy } from 'lodash'
import { Client } from 'pg'

import type { Config } from '../config'
import type { EntityStatistics, PropertyStatistics } from '../statistics'
import { read_sql } from '../utils'
import type {
  ColumnCommentDefinition,
  ColumnName,
  Database,
  EnumDefinition,
  ForeignKeyDefinition,
  PrimaryKeyDefinition,
  SchemaName,
  TableCommentDefinition,
  TableDefinition,
  TableName,
  UDTName,
} from './types'

//------------------------------------------------------------------------------

const Queries = {
  getEnums: read_sql('resources/sql/postgres/getEnums.sql'),
  getTable: read_sql('resources/sql/postgres/getTable.sql'),
  getTableNames: read_sql('resources/sql/postgres/getTableNames.sql'),
  getPrimaryKeys: read_sql('resources/sql/postgres/getPrimaryKeys.sql'),
  getForeignKeys: read_sql('resources/sql/postgres/getForeignKeys.sql'),
  getTableComments: read_sql('resources/sql/postgres/getTableComments.sql'),
  getColumnComments: read_sql('resources/sql/postgres/getColumnComments.sql'),
  getTableStatistics: read_sql('resources/sql/postgres/getTableStatistics.sql'),
  getColumnStatistics: read_sql('resources/sql/postgres/getColumnStatistics.sql'),
  // getTableMeta: read_sql("resources/sql/postgres/getTableMeta.sql"),
}

//------------------------------------------------------------------------------

export class PostgresDatabase implements Database {
  private db: Client
  public version = ''

  constructor(private config: Config, private connectionString?: string) {
    this.db = new Client(connectionString)
  }

  public async isReady(): Promise<void> {
    await this.db.connect()
    const { host, port, database } = this.db
    this.connectionString = `postgres://username:password@${host}:${port}/${
      database || ''
    }`
    const result = await this.query<{ version: string }>(`SELECT version()`)
    this.version = result[0].version
  }

  public async close(): Promise<void> {
    await this.db.end()
  }

  public getConnectionString(): string {
    if (!this.connectionString) {
      throw new Error('Expected connectionString')
    }
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

  // https://dataedo.com/kb/query/postgresql/list-all-primary-keys-and-their-columns
  public async getPrimaryKeys(schema: SchemaName): Promise<PrimaryKeyDefinition[]> {
    return await this.query<PrimaryKeyDefinition>(Queries.getPrimaryKeys, [schema])
  }

  // See https://stackoverflow.com/a/10950402/388951
  public async getForeignKeys(schema: SchemaName): Promise<ForeignKeyDefinition[]> {
    return await this.query<ForeignKeyDefinition>(Queries.getForeignKeys, [schema])
  }

  public async getTableComments(schema: SchemaName): Promise<TableCommentDefinition[]> {
    return await this.query<TableCommentDefinition>(Queries.getTableComments, [schema])
  }

  public async getColumnComments(
    schema: SchemaName,
  ): Promise<ColumnCommentDefinition[]> {
    return await this.query<ColumnCommentDefinition>(Queries.getColumnComments, [
      schema,
    ])
  }

  public async getEnums(schema: SchemaName): Promise<EnumDefinition[]> {
    const result = await this.query<{
      name: string
      value: string
    }>(Queries.getEnums, [schema])

    const groups = groupBy(result, 'name')
    return Object.keys(groups).map(name => ({
      name,
      values: groups[name].map(({ value }) => value),
    }))
  }

  // https://www.developerfiles.com/adding-and-retrieving-comments-on-postgresql-tables/
  public async getTable(
    schema: SchemaName,
    table: TableName,
  ): Promise<TableDefinition> {
    const result = await this.query<{
      name: ColumnName
      udt_name: UDTName
      is_array: boolean
      is_nullable: boolean
      has_default: boolean
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      default_value: any
    }>(Queries.getTable, [schema, table])

    if (result.length === 0) {
      console.error(`[postgres] Missing columns for table: ${schema}.${table}`)
    }
    return { name: table, columns: result }
  }

  // https://towardsdatascience.com/how-to-derive-summary-statistics-using-postgresql-742f3cdc0f44
  public async getTableStatistics(
    schema: SchemaName,
    table: TableName,
  ): Promise<EntityStatistics> {
    const result = await this.query<EntityStatistics>(Queries.getTableStatistics, [
      schema,
      table,
    ])
    if (result.length !== 1) {
      throw `[postgres] getTableStatistics failed to return a row: ${schema}.${table}`
    }
    return result[0]
  }

  public async getColumnStatistics(
    schema: SchemaName,
    table: TableName,
  ): Promise<PropertyStatistics[]> {
    return await this.query<PropertyStatistics>(Queries.getColumnStatistics, [
      schema,
      table,
    ])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async query<T>(query: string, args: any[] = []): Promise<T[]> {
    const result = await this.db.query<T>(query, args)
    return result.rows
  }
}
