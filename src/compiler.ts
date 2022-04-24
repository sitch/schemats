/* eslint-disable import/max-dependencies */

import { isEmpty, sortBy } from 'lodash'

import type {
  ColumnComment,
  Database,
  EnumDefinition,
  ForeignKey,
  PrimaryKey,
  SchemaName,
  TableComment,
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
import type { Backend, Config, DataSource, UserImport } from './config'
import { BACKENDS, get_user_imports } from './config'
import type { Coreferences } from './coreference'
import { build_coreferences } from './coreference'
import type { Relationship, RelationshipEdge, RelationshipNode } from './relationships'
import { build_relationships } from './relationships'
import { merge_table_meta } from './tables'
import { validate_coreferences, validate_enums, validate_tables } from './validators'

//------------------------------------------------------------------------------

export interface BuildContext {
  data_source: DataSource
  schema: SchemaName
  config: Config
  user_imports: UserImport[]
  primary_keys: PrimaryKey[]
  foreign_keys: ForeignKey[]
  table_comments: TableComment[]
  column_comments: ColumnComment[]
  enums: EnumDefinition[]
  tables: TableDefinition[]
  relationships: Relationship[]
  coreferences: Coreferences
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
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

  const coreferences = build_coreferences(config, tables)
  config.log('[build] Compiled coreferences', coreferences)

  const relationships = build_relationships(config, tables)
  config.log('[build] Compiled relationships', relationships)

  sortBy
  return {
    data_source,
    schema,
    config,
    coreferences,
    user_imports: user_imports,
    enums: sortBy(enums, 'name'),
    tables: sortBy(tables, 'name'),
    primary_keys: sortBy(primary_keys, 'table'),
    foreign_keys: sortBy(foreign_keys, 'primary_table'),
    relationships: sortBy(relationships, 'foreign.name'),
    table_comments: sortBy(table_comments, 'table'),
    column_comments: sortBy(column_comments, 'column'),
    nodes: [],
    edges: [],
  }
}

export const render = async (context: BuildContext, backend: Backend) => {
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
  if (backend === 'algebraic-julia') {
    return await render_algebraic_julia(context)
  }
  if (backend === 'julia-genie') {
    return await render_julia_genie(context)
  }
  if (backend === 'julia-octo') {
    return await render_julia_octo(context)
  }
  if (backend === 'hydra') {
    return await render_hydra(context)
  }
  if (backend === 'typedb-loader-config') {
    return await render_typedb_loader_config(context)
  }

  const backends = BACKENDS.join(', ')
  throw `Invalid backend: ${backend} must be one of: ${backends}`
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
