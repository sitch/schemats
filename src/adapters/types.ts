import type { EntityStatistics, PropertyStatistics } from '../statistics'

export type SchemaName = string
export type TableName = string
export type ColumnName = string
export type Comment = string
export type EnumName = string
export type UDTName = string
export type ConstraintName = string
export type NodeLabel = string

export type EdgeName = string
export type RelationName = string

//------------------------------------------------------------------------------
// Entities
//------------------------------------------------------------------------------

export interface EntityDefinition {
  name: TableName
  columns: PropertyDefinition[]
  comment?: Comment | undefined
  entity_statistics?: EntityStatistics
}
export interface TableDefinition extends EntityDefinition {
  primary_keys?: PrimaryKeyDefinition[]
  foreign_keys?: ForeignKeyDefinition[]
}

export interface NodeDefinition extends EntityDefinition {
  labels?: NodeLabel[]
  relationships?: NodeRelationship[]
}

export type NodeRelationship = never

// export type EntityDefinition = TableDefinition | NodeDefinition
// export type EntityLikeDefinition = TableDefinition | NodeDefinition | EdgeDefinition

//------------------------------------------------------------------------------
// Relations
//------------------------------------------------------------------------------

export interface RelationDefinition {
  name: RelationName
  source: EntityDefinition
  target: EntityDefinition
  comment?: Comment | undefined
  // relation_statistics?: RelationStatistics
}

export interface EdgeDefinition extends RelationDefinition {
  columns: PropertyDefinition[]
  statistics?: EntityStatistics
  comment?: string
}

//------------------------------------------------------------------------------
// Properties
//------------------------------------------------------------------------------

export interface PropertyDefinition {
  name: ColumnName
  udt_name: UDTName
  // primary_key?: PrimaryKeyDefinition;
  // foreign_key?: ForeignKeyDefinition;
  is_array: boolean
  has_default: boolean
  is_nullable: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default_value: any
  comment?: Comment | undefined
  // statistics?: PropertyStatistics
}

export interface ColumnDefinition extends PropertyDefinition {
  // name: ColumnName
  // udt_name: UDTName
  // // primary_key?: PrimaryKeyDefinition;
  // // foreign_key?: ForeignKeyDefinition;
  // is_array: boolean
  // has_default: boolean
  // is_nullable: boolean
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // default_value: any
  // comment?: Comment | undefined
  statistics?: PropertyStatistics
}

//------------------------------------------------------------------------------

export interface TableCommentDefinition {
  table: TableName
  comment: Comment
}

export interface ColumnCommentDefinition {
  table: TableName
  column: ColumnName
  comment: Comment
}

//------------------------------------------------------------------------------
// Relational Keys
//------------------------------------------------------------------------------

export interface RelationalKey {
  source_table: TableName
  source_column: ColumnName
  constraint: ConstraintName
}

export interface PrimaryKeyDefinition extends RelationalKey {
  is_unique: boolean
  ordinal_position: number
}

export interface ForeignKeyDefinition extends RelationalKey {
  target_table: TableName
  target_column: ColumnName
}

//------------------------------------------------------------------------------
// Enum
//------------------------------------------------------------------------------
interface ParameterizedEnumDefinition<T> {
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

export interface Database {
  version: string
  getConnectionString(): string
  isReady(): Promise<void>
  close(): Promise<void>
  getDefaultSchema(): Promise<SchemaName>
  getTableNames(schema: SchemaName): Promise<TableName[]>
  getPrimaryKeys(schema: SchemaName): Promise<PrimaryKeyDefinition[]>
  getForeignKeys(schema: SchemaName): Promise<ForeignKeyDefinition[]>
  getTableComments(schema: SchemaName): Promise<TableCommentDefinition[]>
  getColumnComments(schema: SchemaName): Promise<ColumnCommentDefinition[]>
  getEnums(schema: SchemaName): Promise<EnumDefinition[]>
  getTable(schema: SchemaName, table: TableName): Promise<TableDefinition>
  getTableStatistics(schema: SchemaName, table: TableName): Promise<EntityStatistics>
  getColumnStatistics(
    schema: SchemaName,
    table: TableName,
  ): Promise<PropertyStatistics[]>
}

//------------------------------------------------------------------------------
