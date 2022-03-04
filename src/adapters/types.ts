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
  has_default?: boolean
  is_nullable?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default_value?: any
}
export type EnumDefinition = ParameterizedEnumDefinition<string>

//------------------------------------------------------------------------------

export interface TableDefinition {
  name: TableName
  columns: ColumnDefinition[]
  comment?: Comment
  primary_keys?: PrimaryKey[]
  foreign_keys?: ForeignKey[]
  statistics?: TableStatistics
}

export interface TableStatistics {
  count: number
  cat_values?: CatValue[]
}

//------------------------------------------------------------------------------

export interface ColumnDefinition {
  name: ColumnName
  udt_name: UDTName
  comment?: Comment
  // primary_key?: PrimaryKey;
  // foreign_key?: ForeignKey;
  is_array: boolean
  has_default: boolean
  is_nullable: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default_value: any
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
  is_unique: boolean
  ordinal_position: number
}

//------------------------------------------------------------------------------

// export interface TableColumnVector {
//   table: TableName;
//   column: ColumnName;
// }
export interface ForeignKey {
  // source: TableColumnVector;
  // dest: TableColumnVector;
  primary_table: TableName
  primary_column: ColumnName
  foreign_table: TableName
  foreign_column: ColumnName
  constraint: ConstraintName
}

//------------------------------------------------------------------------------

export interface Database {
  version: string
  getConnectionString(): string
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
