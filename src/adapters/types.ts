import { Config } from "../config";

export type Schema = string;
export type TableName = string;
export type ColumnName = string;

//------------------------------------------------------------------------------

export interface ParameterizedEnumDefinition<T> {
  values: T[];
  name: string;
  // table?: string;
  column?: string;
}
export type EnumDefinition = ParameterizedEnumDefinition<string>;
export type EnumDefinitions = EnumDefinition[];

//------------------------------------------------------------------------------

export interface TableDefinition {
  name: TableName;
  columns: ColumnDefinitions;
}
export type TableDefinitions = Record<TableName, TableDefinition>;

export interface TableComment {
  column: TableName;
  description: string;
}
export type TableKeys = Record<string, string>;
// export type TableComments = Record<string, TableComment>;

export interface TableComments {
  table: TableName;
  columns: Record<string, TableComment>
}
//------------------------------------------------------------------------------

export interface ColumnDefinition {
  name: ColumnName;
  udtName: string;
  comment?: string;
  isArray: boolean;
  nullable: boolean;
  hasDefault: boolean;
  foreignKey?: ForeignKey;

  // TODO: Remove
  tsType?: string
}
export type ColumnComments = Record<string, Record<string, string>>;
export type ColumnDefinitions = Record<ColumnName, ColumnDefinition>;

//------------------------------------------------------------------------------

export interface ForeignKey {
  table: string;
  column: string;
  // cardinality: Cardinality;
}
export type ForeignKeys = Record<string, { [columnName: string]: ForeignKey }>;

export type RelationshipType = string;
export interface Relationship {
  source: TableDefinition;
  sink: TableDefinition;
  type: RelationshipType;
}
export type Relationships = Relationship[];

export interface Metadata {
  schema: string;
  enumTypes: any;
  foreignKeys: ForeignKeys;
  tableToKeys: TableKeys;
  columnComments: ColumnComments;
  tableComments: TableComments;
}

//------------------------------------------------------------------------------

export type Coreference = Record<string, string>;

export interface Coreferences {
  all: Coreference;
  user: Coreference;
}
//------------------------------------------------------------------------------

export type CustomType = Set<string>;
export type CustomTypes = CustomType[];

//------------------------------------------------------------------------------

export interface BuildContext {
  schema: Schema;
  config: Config;
  tables: TableDefinitions;
  tableComments: TableComments[];
  enums: EnumDefinitions;
  relationships: Relationships;
  customTypes: CustomTypes;
  coreferences: Coreferences;
}

export type DBTypeMap = Record<string, string>;

//------------------------------------------------------------------------------

const ALL_BACKENDS = ["typescript", "json", "typedb"] as const;

export type Backends = typeof ALL_BACKENDS;

// export type Backend = "typescript" | "json" | "typedb";
export type Backend = string;

//------------------------------------------------------------------------------

export interface Database {
  version: string;
  getConnectionString: () => string;
  isReady(): Promise<void>;
  close(): Promise<void>;
  getDefaultSchema(): Promise<Schema>;
  getTableNames(schemaName: Schema): Promise<TableName[]>;
  getEnumDefinitions(schemaName: Schema): Promise<EnumDefinitions>;
  getTableDefinition(
    schemaName: Schema,
    tableName: TableName
  ): Promise<TableDefinition>;

  getTableComments(schemaName: Schema, tableName: TableName): Promise<TableComments>

  // getTableKeys(schemaName: string, tableName: string): Promise<TableKeys>
  // getForeignKeys(schemaName: string, tableName: string): Promise<ForeignKeys>

  // getTableDefinition(schemaName: string, tableName: string, customTypes: CustomType[]): Promise<TableDefinition>
  // getTableDefinitions(schemaName: string, customTypes: CustomType[]): Promise<TableDefinitions>
}

//------------------------------------------------------------------------------
