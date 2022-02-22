import inflection from 'inflection'
import camelCase from 'camelcase'
import { version } from '../package.json'


export interface ConfigValues {
    output?: string
    // format:  'typescript' | 'json' | 'typedb'
    backend:  string
    schema: string
    database: string
    connection: string
    tables: string[]
    enums?: boolean
    ignoreFieldCollisions?: string[]

    writeHeader?: boolean
    typesFile?: boolean
    throwOnMissingType?: boolean
    
    enumFormatter?: string
    tableFormatter?: string
    columnFormatter?: string    
}

export type CommandOptions = Partial<ConfigValues> & Pick<ConfigValues, 'schema' | 'tables' | 'backend' | 'database' | 'ignoreFieldCollisions' >


export class Config {
    constructor (connection: string, public config: CommandOptions) {
        this.config = {
            ignoreFieldCollisions: [],
            writeHeader: true,
            // camelCase: false,
            throwOnMissingType: true,
            enums: false,
            ...config,
        }
    }

    public getCLICommand (dbConnection: string): string {
        const commands = ['schemats', 'generate', dbConnection]
        // if (this.config.camelCase) {
        //     commands.push('-C')
        // }
        if (this.config.tables?.length > 0) {
            commands.push('-t', this.config.tables.join(' '))
        }
        if (this.config.schema) {
            commands.push(`-s ${this.config.schema}`)
        }
        return commands.join(' ')
    }

    public get version () {
        return version
    }

    public get ignoreFieldCollisions () : string[] {
        return (this.config.ignoreFieldCollisions || []).filter(x => !!x)
    }

    public get database () {
        return this.config.database
    }

    public get backend () {
        return this.config.backend
    }

    public get enums () {
        return this.config.enums
    }

    public get tables () {
        return this.config.tables
    }

    public get schema () {
        return this.config.schema
    }

    public get writeHeader () {
        return this.config.writeHeader
    }

    public get typesFile () {
        return this.config.typesFile
    }

    public get throwOnMissingType () {
        return this.config.throwOnMissingType
    }

    public formatEnumName (name: string) {
        return inflect(name, this.config.enumFormatter)
    }
    
    public formatTableName (name: string) {
        return inflect(name, this.config.tableFormatter)
    }

    public formatColumnName (name: string) {
        return inflect(name, this.config.columnFormatter)
    }
}

export const inflect = (name: string, format: string | undefined) : string => {
    if (!format) {
        return name
    }
    if (['camel', 'camelcase'].includes(format)) {
        return camelCase(name, { pascalCase: false })
    } 
    if (['pascal'].includes(format)) {
        return camelCase(name, { pascalCase: true })
    }   
    if (['snakecase', 'underscore'].includes(format)) {
        return inflection.underscore(name)
    }  
    if (['lower', 'lowercase', 'downcase'].includes(format)) {
        return name.toLowerCase()
    }      
    throw `Unsupported formatter: ${format}`
}