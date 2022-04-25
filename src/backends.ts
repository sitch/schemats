import { render_algebraic_julia } from './backends/algebraic-julia'
import { render_hydra } from './backends/hydra'
import { render_json } from './backends/json'
import { render_julia } from './backends/julia'
import { render_julia_genie } from './backends/julia-genie'
import { render_julia_octo } from './backends/julia-octo'
import { render_typedb } from './backends/typedb'
import { render_typedb_loader_config } from './backends/typedb-loader-config'
import { render_typescript } from './backends/typescript'

//------------------------------------------------------------------------------

export enum DataSourceEnum {
  neo4j = 'neo4j',
  postgres = 'postgres',
  mysql = 'mysql',
}
export type DataSource = keyof typeof DataSourceEnum

//------------------------------------------------------------------------------

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

//------------------------------------------------------------------------------

export const apply_backend = (backend: BackendName) => {
  if (backend === 'typescript') {
    return render_typescript
  }
  if (backend === 'json') {
    return render_json
  }
  if (backend === 'typedb') {
    return render_typedb
  }
  if (backend === 'julia') {
    return render_julia
  }
  if (backend === 'algebraic_julia') {
    return render_algebraic_julia
  }
  if (backend === 'julia_genie') {
    return render_julia_genie
  }
  if (backend === 'julia_octo') {
    return render_julia_octo
  }
  if (backend === 'hydra') {
    return render_hydra
  }
  if (backend === 'typedb_loader_config') {
    return render_typedb_loader_config
  }
  throw `Invalid backend: ${backend} must be one of: ${Object.values(BackendEnum).join(
    ',',
  )}`
}
