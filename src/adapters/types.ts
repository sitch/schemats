export type SchemaName = string
export type TableName = string
export type ColumnName = string
export type Comment = string
export type EnumName = string
export type UDTName = string
export type ConstraintName = string
export type CatValue = string

//------------------------------------------------------------------------------

// export type PrimaryKeyMap = Record<TableName, PrimaryKey[]>;
// export type ForeignKeyMap = Record<TableName, ForeignKey[]>;
// export type TableDefinitionMap = Record<TableName, TableDefinition>;
// export type ColumnCommentMap = Record<ColumnName, ColumnComment>;
// export type ColumnDefinitionMap = Record<ColumnName, ColumnDefinition>;

//------------------------------------------------------------------------------

export interface ParameterizedEnumDefinition<T> {
  name: EnumName
  values: T[]
  table?: TableName
  column?: ColumnName
  hasDefault?: boolean
  isNullable?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any
}
export type EnumDefinition = ParameterizedEnumDefinition<string>

//------------------------------------------------------------------------------

export interface TableDefinition {
  name: TableName
  columns: ColumnDefinition[]
  comment?: Comment
  primaryKeys?: PrimaryKey[]
  foreignKeys?: ForeignKey[]
  statistics?: TableStatistics
}

export interface TableStatistics {
  count: number
  catValues?: CatValue[]
}

//------------------------------------------------------------------------------

export interface ColumnDefinition {
  name: ColumnName
  udtName: UDTName
  comment?: Comment
  // primaryKey?: PrimaryKey;
  // foreignKey?: ForeignKey;
  isArray: boolean
  hasDefault: boolean
  isNullable: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue: any
}

//------------------------------------------------------------------------------

export interface TableComment {
  table: TableName
  comment: Comment
}

export interface ColumnComment {
  table: TableName
  column: ColumnName
  comment: Comment
}

//------------------------------------------------------------------------------

export interface PrimaryKey {
  table: TableName
  column: ColumnName
  constraint: ConstraintName
  isUnique: boolean
  ordinalPosition: number
}

//------------------------------------------------------------------------------

// export interface TableColumnVector {
//   table: TableName;
//   column: ColumnName;
// }
export interface ForeignKey {
  // source: TableColumnVector;
  // dest: TableColumnVector;
  primaryTable: TableName
  primaryColumn: ColumnName
  foreignTable: TableName
  foreignColumn: ColumnName
  constraint: ConstraintName
}

//------------------------------------------------------------------------------

export interface Database {
  version: string
  getConnectionString: () => string
  isReady(): Promise<void>
  close(): Promise<void>
  getDefaultSchema(): Promise<SchemaName>
  getTableNames(schema: SchemaName): Promise<TableName[]>
  getPrimaryKeys(schema: SchemaName): Promise<PrimaryKey[]>
  getForeignKeys(schema: SchemaName): Promise<ForeignKey[]>
  getTableComments(schema: SchemaName): Promise<TableComment[]>
  getColumnComments(schema: SchemaName): Promise<ColumnComment[]>
  getEnums(schema: SchemaName): Promise<EnumDefinition[]>
  getTable(schema: SchemaName, table: TableName): Promise<TableDefinition>
}

//------------------------------------------------------------------------------
