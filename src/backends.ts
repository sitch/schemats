import { render_algebraic_julia } from './backends/algebraic-julia'
import { render_hydra } from './backends/hydra'
import { render_json } from './backends/json'
import { render_julia } from './backends/julia'
import { render_julia_genie } from './backends/julia-genie'
import { render_julia_octo } from './backends/julia-octo'
import { render_typedb } from './backends/typedb'
import { render_typedb_loader_config } from './backends/typedb-loader-config'
import { render_typescript } from './backends/typescript'
import type { BuildContext } from './compiler'
import type { TypeQualifiedCoreferences } from './coreference'

export enum DataSourceEnum {
  neo4j = 'neo4j',
  postgres = 'postgres',
  mysql = 'mysql',
}
export type DataSource = keyof typeof DataSourceEnum

export enum BackendEnum {
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

export type CommentDelimiter = string
export type IndentDelimiter = string

export interface BackendContext {
  backend: BackendName
  comment: CommentDelimiter
  indent: IndentDelimiter
  character_line_limit: number
  coreferences: TypeQualifiedCoreferences
}

export interface ConfigLike {
  version?: string
  timestamp?: string
  command_from_cli?: string
}

//------------------------------------------------------------------------------

export const render = async (context: BuildContext, backend: BackendName) => {
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
