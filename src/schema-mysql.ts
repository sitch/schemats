import { Config } from './generator'
import { Connection, createConnection, RowDataPacket } from 'mysql2/promise'
import { Database, TableDefinition, TableDefinitions,  EnumDefinition, EnumDefinitions, ColumnDefinition,  CustomType, CustomTypes } from './schema-interfaces'

// uses the type mappings from https://github.com/mysqljs/ where sensible
const mapTableDefinitionToType = (config: Config, tableDefinition: TableDefinition, enumType: Set<string>, customTypes: CustomTypes, columnDescriptions: Record<string, string>): TableDefinition => {
    return Object.entries(tableDefinition).reduce((result, [columnName, column]) => {
        switch (column.udtName) {
            case 'char':
            case 'varchar':
            case 'text':
            case 'tinytext':
            case 'mediumtext':
            case 'longtext':
            case 'time':
            case 'geometry':
            case 'set':
            case 'enum':
                // keep set and enum defaulted to string if custom type not mapped
                column.tsType = 'string'
                break
            case 'integer':
            case 'int':
            case 'smallint':
            case 'mediumint':
            case 'bigint':
            case 'double':
            case 'decimal':
            case 'numeric':
            case 'float':
            case 'year':
                column.tsType = 'number'
                break
            case 'tinyint':
                column.tsType = 'boolean'
                break
            // case 'json':
            //     column.tsType = 'unknown'
            //     if (columnDescriptions[columnName]) {
            //         const type = /@type \{([^}]+)\}/.exec(columnDescriptions[columnName])
            //         if (type) {
            //             column.tsType = type[1].trim()
            //             // customTypes.add(column.tsType)
            //         }
            //     }
            //     break
            case 'date':
            case 'datetime':
            case 'timestamp':
                column.tsType = 'Date'
                break
            case 'tinyblob':
            case 'mediumblob':
            case 'longblob':
            case 'blob':
            case 'binary':
            case 'varbinary':
            case 'bit':
                column.tsType = 'Buffer'
                break
            default:
                if (enumType.has(column.udtName)) {
                    column.tsType = config.formatTableName(column.udtName)
                    break
                } else {
                    const warning = `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`
                    if (config.throwOnMissingType) {
                        throw new Error(warning)
                    }
                    console.log(`Type [${column.udtName} has been mapped to [any] because no specific type has been found.`)
                    column.tsType = 'any'
                    break
                }
        }
        // result[columnName] = column
        result.columns.push(column)
        return result
    }, {name: tableDefinition.name} as TableDefinition)
}

const parseMysqlEnumeration = (mysqlEnum: string): string[] => {
    return mysqlEnum.replace(/(^(enum|set)\('|'\)$)/gi, '').split(`','`)
}

const getEnumNameFromColumn = (dataType: string, columnName: string): string => {
    return `${dataType}_${columnName}`
}

export class MysqlDatabase implements Database {
    public version: string = ''
    private db!: Connection

    constructor (private config: Config, public connectionString: string) {
    }

    public async isReady(): Promise<void> {
        this.db = await createConnection(this.connectionString)
    }

    public async close(): Promise<void> {
        await this.db.destroy()
    }

    public getConnectionString (): string {
        return this.connectionString
    }

    public getDefaultSchema (): string {
        return 'public'
    }


    public async getSchemaTableNames (schemaName: string): Promise<string[]> {
        const schemaTables = await this.query<{ table_name: string }>(`
            SELECT table_name
            FROM information_schema.columns
            WHERE table_schema = ?
            GROUP BY table_name
        `,
            [schemaName]
        )
        return schemaTables.map(( { table_name }) => table_name)
    }

    public async getEnumDefinitions(schema: string): Promise<EnumDefinitions> {
        return []
        // const rawEnumRecords = await this.query<{ column_name: string, column_type: string, data_type: string }>(`
        //     SELECT column_name, column_type, data_type
        //     FROM information_schema.columns
        //     WHERE data_type IN ('enum', 'set') and table_schema = ?
        // `, [schema])
        // return rawEnumRecords.reduce((result, { column_name, column_type, data_type }) => {
        //     const enumName = getEnumNameFromColumn(data_type, column_name)
        //     const enumValues = parseMysqlEnumeration(column_type)
        //     if (result[enumName] && JSON.stringify(result[enumName]) !== JSON.stringify(enumValues)) {
        //         throw new Error(
        //             `Multiple enums with the same name and contradicting types were found: ${column_name}: ${JSON.stringify(result[enumName])} and ${JSON.stringify(enumValues)}`
        //         )
        //     }
        //     result[enumName] = enumValues
        //     return result
        // }, {} as EnumDefinition)
    }

    public async getTableDefinition(tableSchema: string, tableName: string) :  Promise<TableDefinition> {
        const tableColumns = await this.query<{ column_name: string, data_type: string, is_nullable: string, column_default: string }>(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = ? and table_schema = ?`,
            [tableName, tableSchema]
        )
        return tableColumns.reduce((tableDefinition: TableDefinition, { column_name, data_type, is_nullable, column_default }) : TableDefinition =>  {
            const columnDefinition : ColumnDefinition = {
                name: column_name,
                udtName: /^(enum|set)$/i.test(data_type) ? getEnumNameFromColumn(data_type, column_name) : data_type,
                nullable: is_nullable === 'YES',
                isArray: false,
                hasDefault: column_default !== null                  
            }
            tableDefinition.columns.push(columnDefinition)
            return tableDefinition
        }, {name: tableName, columns: []})        
    }

    public async getTableDefinitions (tableSchema: string, tableName: string, customTypes: CustomTypes) {
        const enumType = await this.getEnumDefinitions(tableSchema)
        const columnComments = await this.getTableComments(tableSchema, tableName)
        return mapTableDefinitionToType(
            this.config, 
            await this.getTableDefinition(tableSchema, tableName), 
            new Set(Object.keys(enumType)), 
            customTypes,
            columnComments
        )
    }


    public async getTableComments(schemaName: string, tableName: string) {
        // See https://stackoverflow.com/a/4946306/388951
        const commentsResult = await this.query<{
            table_name: string;
            column_name: string;
            description: string;
        }>(
            `
            select column_name, column_type, column_default, column_comment
            from information_schema.COLUMNS
            where table_schema = ? and table_name = ?;
            `,
            [schemaName, tableName],
        );
        return commentsResult.reduce((result, { column_name, description }) => {
            result[column_name] = description
            return result
        }, {} as Record<string, string>)
    }

    private async query <T>(query: string, args: any[]): Promise<T[]> {
        const [rows, columns] = await this.db.query<RowDataPacket[]>(query, args)
        return rows as unknown as T[]
    }
}
