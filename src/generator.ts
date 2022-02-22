import { Config, ConfigValues, CommandOptions } from './config'
import { Database } from './schema-interfaces'
import { EnumDefinition, TableDefinitions, CustomTypes } from './schema-interfaces'
import { typescriptOfSchema} from "./backends/typescript"
import { typedbOfSchema} from "./backends/typedb"
import { jsonOfSchema} from "./backends/json"

const backends = ['typescript', 'typedb', 'json']

const formatter = async (config: Config, db: Database, schema: string, tableDefinitions: TableDefinitions, enumDefinitions: EnumDefinition[], customTypes: CustomTypes) => {
    const { backend } = config

    if(backend === 'typescript') {
        return await typescriptOfSchema(config, db, schema, tableDefinitions, enumDefinitions, customTypes)
    }   
    if(backend === 'json') {
        return await jsonOfSchema(config, db, schema, tableDefinitions, enumDefinitions, customTypes)
    }          
    if(backend === 'typedb') {
        return await typedbOfSchema(config, db, schema, tableDefinitions, enumDefinitions, customTypes)
    }    

    throw `Invalid backend: ${backend} must be one of: ${backends.join(', ')}`
}

export async function generate(config: Config, db: Database) : Promise<string>   {
    const schema = config.schema || await db.getDefaultSchema()
    const tables = config.tables || await db.getSchemaTableNames(schema)
    const enumDefinitions = await db.getEnumDefinitions(schema)
    const command = config.getCLICommand(db.getConnectionString())

    // let customTypes = new Set<string>()
    let customTypes: CustomTypes = []
    const tableDefinitions = await Promise.all(tables.map(table => db.getTableDefinition(schema, table)))

    return await formatter(config, db, schema, tableDefinitions, enumDefinitions, customTypes)
}

export {
    Config,
    ConfigValues,
    CommandOptions,
    backends
}
