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
import { render_algebraic_julia } from './backends/algebraic-julia'
import { render_hydra } from './backends/hydra'
import { render_json } from './backends/json'
import { render_julia } from './backends/julia'
import { render_julia_genie } from './backends/julia-genie'
import { render_julia_octo } from './backends/julia-octo'
import { render_typedb } from './backends/typedb'
import { render_typedb_loader_config } from './backends/typedb-loader-config'
import { render_typescript } from './backends/typescript'
import { Config, get_user_imports, UserImport } from './config'
import { merge_table_meta } from './tables'
import { validate_coreferences, validate_enums, validate_tables } from './validators'

//------------------------------------------------------------------------------

enum DataSourceEnum {
  neo4j = 'neo4j',
  postgres = 'postgres',
  mysql = 'mysql',
}
export type DataSource = keyof typeof DataSourceEnum

enum BackendEnum {
  typescript = 'typescript',
  json = 'json',
  typedb = 'typedb',
  julia = 'julia',
  algebraic_julia = 'algebraic_julia',
  hydra = 'hydra',
  julia_genie = 'julia_genie',
  julia_octo = 'julia_octo',
  haskell = 'haskell',
  typedb_loader_config = 'typedb_loader_config',
}
export type BackendName = keyof typeof BackendEnum

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

export const render = async (context: BuildContext, backend: BackendName) => {
  validate_coreferences(context, backend)

  if (backend === 'typescript') {
    return await render_typescript(context)
  }
  if (backend === 'json') {
    return await render_json(context)
  }
  if (backend === 'typedb') {
    return await render_typedb(context)
  }
  if (backend === 'julia') {
    return await render_julia(context)
  }
  if (backend === 'algebraic_julia') {
    return await render_algebraic_julia(context)
  }
  if (backend === 'julia_genie') {
    return await render_julia_genie(context)
  }
  if (backend === 'julia_octo') {
    return await render_julia_octo(context)
  }
  if (backend === 'hydra') {
    return await render_hydra(context)
  }
  if (backend === 'typedb_loader_config') {
    return await render_typedb_loader_config(context)
  }
  throw `Invalid backend: ${backend} must be one of: ${Object.values(BackendEnum).join(
    ',',
  )}`
}

export async function generate(
  config: Config,
  database: Database,
  data_source: DataSource,
): Promise<string> {
  const context = await compile(config, database, data_source)
  const backend = context.config.backend
  return await render(context, backend)
}
