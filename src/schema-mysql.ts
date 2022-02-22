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
        const schemaTables = await this.query<{ TABLE_NAME: string }>(`
            SELECT TABLE_NAME
            FROM information_schema.columns
            WHERE table_schema = ?
            GROUP BY TABLE_NAME
        `,
            [schemaName]
        )
        return schemaTables.map(( { TABLE_NAME }) => TABLE_NAME)
    }

    public async getEnumDefinitions(schema: string): Promise<EnumDefinitions> {
        const rawEnumRecords = await this.query<{ COLUMN_NAME: string, COLUMN_TYPE: string, DATA_TYPE: string }>(`
            SELECT COLUMN_NAME, COLUMN_TYPE, DATA_TYPE
            FROM information_schema.columns
            WHERE DATA_TYPE IN ('enum', 'set') and table_schema = ?
        `, [schema])

        return rawEnumRecords.map(
            ({ COLUMN_NAME, COLUMN_TYPE, DATA_TYPE }) : EnumDefinition => {
            const enumName = getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME)
            const enumValues = parseMysqlEnumeration(COLUMN_TYPE)
            // if (result[enumName] && JSON.stringify(result[enumName]) !== JSON.stringify(enumValues)) {
            //     throw new Error(
            //         `Multiple enums with the same name and contradicting types were found: ${COLUMN_NAME}: ${JSON.stringify(result[enumName])} and ${JSON.stringify(enumValues)}`
            //     )
            // }
            return {
                table: `MISSING TABLE ${enumName}`,
                name: enumName,
                column: COLUMN_NAME,
                values: new Set(enumValues)
            } 
        })


        // return rawEnumRecords.rows.map(({name, value}) : EnumDefinition =>  ({
        //     table: `MISSING ${name}`,
        //     column: name,
        //     values: new Set([value]),
        // }
    // ))        
    }

    public async getTableDefinition(tableSchema: string, tableName: string) :  Promise<TableDefinition> {
        const tableColumns = await this.query<{ COLUMN_NAME: string, DATA_TYPE: string, IS_NULLABLE: string, COLUMN_DEFAULT: string }>(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM information_schema.columns
            WHERE TABLE_NAME = ? and table_schema = ?`,
            [tableName, tableSchema]
        )
        return tableColumns.reduce((tableDefinition: TableDefinition, { COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT }) : TableDefinition =>  {
            const columnDefinition : ColumnDefinition = {
                name: COLUMN_NAME,
                udtName: /^(enum|set)$/i.test(DATA_TYPE) ? getEnumNameFromColumn(DATA_TYPE, COLUMN_NAME) : DATA_TYPE,
                nullable: IS_NULLABLE === 'YES',
                isArray: false,
                hasDefault: COLUMN_DEFAULT !== null                  
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
            TABLE_NAME: string;
            COLUMN_NAME: string;
            DESCRIPTION: string;
        }>(
            `
            select COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, column_comment
            from information_schema.COLUMNS
            where table_schema = ? and TABLE_NAME = ?;
            `,
            [schemaName, tableName],
        );
        return commentsResult.reduce((result, { COLUMN_NAME, DESCRIPTION }) => {
            result[COLUMN_NAME] = DESCRIPTION
            return result
        }, {} as Record<string, string>)
    }

    private async query <T>(query: string, args: any[]): Promise<T[]> {
        const [rows, columns] = await this.db.query<RowDataPacket[]>(query, args)
        return rows as unknown as T[]
    }
}
