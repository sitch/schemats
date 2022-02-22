export interface Database {
    version: string
    getConnectionString: () => string
    isReady(): Promise<void>
    close(): Promise<void>
    getDefaultSchema(): string
    getSchemaTableNames(schemaName: string): Promise<string[]>
    getEnumDefinitions(schemaName: string): Promise<EnumDefinitions>
    getTableDefinition(schemaName: string, tableName: string): Promise<TableDefinition>

    // getTableComments(schemaName: string, tableName: string): Promise<TableComments>
    // getForeignKeys(schemaName: string, tableName: string): Promise<ForeignKeys>
    // getTableKeys(schemaName: string, tableName: string): Promise<TableKeys>

    // getTableDefinition(schemaName: string, tableName: string, customTypes: CustomType[]): Promise<TableDefinition>
    // getTableDefinitions(schemaName: string, customTypes: CustomType[]): Promise<TableDefinitions>
}
export interface ForeignKey {
    table: string;
    column: string;
}

export interface Metadata {
    schema: string;
    enumTypes: any
    foreignKeys: ForeignKeys
    tableToKeys: TableKeys
    columnComments: ColumnComments
    tableComments: TableComments
}

export type CustomType = Set<string> 
export type CustomTypes = CustomType[]

export interface ColumnDefinition {
    name: string,
    udtName: string,
    nullable: boolean,
    tsType?: string
    isArray: boolean
    comment?: string;
    foreignKey?: ForeignKey
    hasDefault: boolean
}


export type TableKeys = Record<string, string>
export type ForeignKeys = Record<string, { [columnName: string]: ForeignKey }>
export type TableComments = Record<string, string>
export type ColumnComments = Record<string, Record<string, string>>


export interface TableDefinition {
    name: string,
    columns: ColumnDefinition[],

}
export type TableDefinitions = TableDefinition[]

export interface ParameterizedEnumDefinition<T> {
    name: string,
    table?: string | undefined | null,
    column: string,
    values: T[]
}

// export type EnumDefinition = Record<string, string[]>
export type EnumDefinition = ParameterizedEnumDefinition<string>
export type EnumDefinitions = EnumDefinition[]