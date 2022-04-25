/* eslint-disable import/max-dependencies */

import { isEmpty, sortBy } from 'lodash'

import type {
  ColumnCommentDefinition,
  Database,
  EdgeDefinition,
  EnumDefinition,
  ForeignKeyDefinition,
  NodeDefinition,
  PrimaryKeyDefinition,
  SchemaName,
  TableCommentDefinition,
  TableDefinition,
} from './adapters/types'
import { apply_backend, BackendName, DataSource } from './backends'
import { Config, get_user_imports, UserImport } from './config'
import { merge_table_meta } from './tables'
import { validate_coreferences, validate_enums, validate_tables } from './validators'

//------------------------------------------------------------------------------

export interface BuildContext {
  data_source: DataSource
  schema: SchemaName
  config: Config
  user_imports: UserImport[]
  primary_keys: PrimaryKeyDefinition[]
  foreign_keys: ForeignKeyDefinition[]
  table_comments: TableCommentDefinition[]
  column_comments: ColumnCommentDefinition[]
  enums: EnumDefinition[]
  tables: TableDefinition[]
  nodes: NodeDefinition[]
  edges: EdgeDefinition[]
}

//------------------------------------------------------------------------------

const compile = async (
  config: Config,
  database: Database,
  data_source: DataSource,
): Promise<BuildContext> => {
  //----------------------------------------------------------------------------
  // Database
  //----------------------------------------------------------------------------

  const schema = config.schema || (await database.getDefaultSchema())
  config.log('[db] Using schema', schema)

  const table_names = !isEmpty(config.tables)
    ? config.tables
    : await database.getTableNames(schema)
  config.log('[db] Fetched table_names', table_names)

  const enums = await database.getEnums(schema)
  validate_enums(config, enums)
  config.log('[db] Fetched enums', enums)

  const primary_keys = await database.getPrimaryKeys(schema)
  config.log('[db] Fetched primary_keys', primary_keys)

  const foreign_keys = await database.getForeignKeys(schema)
  config.log('[db] Fetched foreign_keys', foreign_keys)

  const table_comments = await database.getTableComments(schema)
  config.log('[db] Fetched table_comments', table_comments)

  const column_comments = await database.getColumnComments(schema)
  config.log('[db] Fetched column_comments', column_comments)

  const table_list = await Promise.all(
    table_names.map(table => database.getTable(schema, table)),
  )
  config.log('[db] Fetched tables', table_list)

  //----------------------------------------------------------------------------
  // Compilation
  //----------------------------------------------------------------------------

  const tables = merge_table_meta(
    table_list,
    table_comments,
    column_comments,
    primary_keys,
    foreign_keys,
  )
  validate_tables(config, tables)
  config.log('[build] Transformed tables', tables)

  const user_imports = get_user_imports(config, tables)
  config.log('[build] Compiled user_imports', user_imports)

  return {
    data_source,
    schema,
    config,
    user_imports: user_imports,
    enums: sortBy(enums, 'name'),
    tables: sortBy(tables, 'name'),
    primary_keys: sortBy(primary_keys, 'table'),
    foreign_keys: sortBy(foreign_keys, 'source_table'),
    table_comments: sortBy(table_comments, 'table'),
    column_comments: sortBy(column_comments, 'column'),
    nodes: [],
    edges: [],
  }
}

export async function render(context: BuildContext, backend: BackendName) {
  return apply_backend(backend)(context)
}

export async function generate(
  config: Config,
  database: Database,
  data_source: DataSource,
): Promise<string> {
  const context = await compile(config, database, data_source)
  const backend = context.config.backend
  validate_coreferences(context, backend)
  return await render(context, backend)
}
