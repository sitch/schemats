export type SchemaName = string
export type TableName = string
export type ColumnName = string
export type Comment = string
export type EnumName = string
export type UDTName = string
export type ConstraintName = string

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
  statistics?: ColumnStatistics
}

//------------------------------------------------------------------------------
export interface TableStatistics {
  cardinality: number
  statistics?: ColumnStatistics[]
}

export interface CategoryStatistics<T> {
  label: string
  value: T | null
  frequency: number
  relative_frequency: number
}

export enum InferredPTypeEnum {
  boolean = 'boolean',
  categorical = 'categorical',
  date = 'date',
  float = 'float',
  integer = 'integer',
  string = 'string',
}

export type InferredPType =
  | InferredPTypeEnum.boolean
  | InferredPTypeEnum.categorical
  | InferredPTypeEnum.date
  | InferredPTypeEnum.float
  | InferredPTypeEnum.integer
  | InferredPTypeEnum.string

interface PType<T> {
  inferred_ptype: InferredPType
  anomalous_values: InferredPType[]
  missing_values: InferredPType[]
  normal_values: T[]
}
interface DefaultColumnStatistics<T> {
  cardinality: number
  is_null_present: boolean
  categories: CategoryStatistics<T>[]
  ptype: PType<T>
}

export interface NumericalColumnStatistics extends DefaultColumnStatistics<number> {
  mean: number
  median: number
  minimum: number
  maximum: number
  range: number
  standard_deviation: number
  variance: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  mode: number
}

export interface TextColumnStatistics extends DefaultColumnStatistics<string> {
  minimum_length: number
  maximum_length: number
  range: number
  standard_deviation: number
  variance: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  mode: number
}

type BooleanColumnStatistics = DefaultColumnStatistics<boolean>

export type ColumnStatistics =
  | NumericalColumnStatistics
  | TextColumnStatistics
  | BooleanColumnStatistics

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
  getTableStatistics(schema: SchemaName, table: TableName): Promise<TableStatistics>
  getColumnStatistics(schema: SchemaName, table: TableName): Promise<ColumnStatistics[]>
}

//------------------------------------------------------------------------------
