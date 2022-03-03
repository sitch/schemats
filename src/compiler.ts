import { isEmpty, sortBy } from 'lodash'

import {
  ColumnComment,
  Database,
  EnumDefinition,
  ForeignKey,
  PrimaryKey,
  SchemaName,
  TableComment,
  TableDefinition,
} from './adapters/types'
import { jsonOfSchema } from './backends/json'
import { juliaOfSchema } from './backends/julia'
import { typedbOfSchema } from './backends/typedb'
import { typescriptOfSchema } from './backends/typescript'
import { Backend, BACKENDS, Config, getUserImports, UserImport } from './config'
import { buildCoreferences, Coreferences } from './coreference'
import { buildRelationships, Relationship } from './relationships'
import { mergeTableMeta } from './tables'
import { validateCoreferences, validateEnums, validateTables } from './validators'

//------------------------------------------------------------------------------

export interface BuildContext {
  schema: SchemaName
  config: Config
  primaryKeys: PrimaryKey[]
  foreignKeys: ForeignKey[]
  tableComments: TableComment[]
  columnComments: ColumnComment[]
  enums: EnumDefinition[]
  tables: TableDefinition[]
  relationships: Relationship[]
  coreferences: Coreferences
  userImports: UserImport[]
}

//------------------------------------------------------------------------------

export async function generate(config: Config, database: Database): Promise<string> {
  const context = await compile(config, database)
  const backend = context.config.backend
  return await render(context, backend)
}

const compile = async (config: Config, database: Database): Promise<BuildContext> => {
  //----------------------------------------------------------------------------
  // Database
  //----------------------------------------------------------------------------

  const schema = config.schema || (await database.getDefaultSchema())
  config.log('[db] Using schema', schema)

  const tableNames = !isEmpty(config.tables)
    ? config.tables
    : await database.getTableNames(schema)
  config.log('[db] Fetched tableNames', tableNames)

  const enums = await database.getEnums(schema)
  validateEnums(config, enums)
  config.log('[db] Fetched enums', enums)

  const primaryKeys = await database.getPrimaryKeys(schema)
  config.log('[db] Fetched primaryKeys', primaryKeys)

  const foreignKeys = await database.getForeignKeys(schema)
  config.log('[db] Fetched foreignKeys', foreignKeys)

  const tableComments = await database.getTableComments(schema)
  config.log('[db] Fetched tableComments', tableComments)

  const columnComments = await database.getColumnComments(schema)
  config.log('[db] Fetched columnComments', columnComments)

  const tableList = await Promise.all(
    tableNames.map(table => database.getTable(schema, table)),
  )
  config.log('[db] Fetched tables', tableList)

  //----------------------------------------------------------------------------
  // Compilation
  //----------------------------------------------------------------------------

  const tables = mergeTableMeta(
    tableList,
    tableComments,
    columnComments,
    primaryKeys,
    foreignKeys,
  )
  validateTables(config, tables)
  config.log('[build] Transformed tables', tables)

  const userImports = getUserImports(config, tables)
  config.log('[build] Compiled userImports', userImports)

  const coreferences = buildCoreferences(config, tables)
  config.log('[build] Compiled coreferences', coreferences)

  const relationships = buildRelationships(config, tables)
  config.log('[build] Compiled relationships', relationships)

  sortBy
  return {
    schema,
    config,
    coreferences,
    userImports: userImports,
    enums: sortBy(enums, 'name'),
    tables: sortBy(tables, 'name'),
    primaryKeys: sortBy(primaryKeys, 'table'),
    foreignKeys: sortBy(foreignKeys, 'primaryTable'),
    relationships: sortBy(relationships, 'foreign.name'),
    tableComments: sortBy(tableComments, 'table'),
    columnComments: sortBy(columnComments, 'column'),
  }
}

const render = async (context: BuildContext, backend: Backend) => {
  validateCoreferences(context, backend)

  if (backend === 'typescript') {
    return await typescriptOfSchema(context)
  }
  if (backend === 'json') {
    return await jsonOfSchema(context)
  }
  if (backend === 'typedb') {
    return await typedbOfSchema(context)
  }
  if (backend === 'julia') {
    return await juliaOfSchema(context)
  }
  const backends = BACKENDS.join(', ')
  throw `Invalid backend: ${backend} must be one of: ${backends}`
}
