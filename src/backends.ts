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
