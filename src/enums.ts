//------------------------------------------------------------------------------

export enum DataSourceEnum {
  neo4j = 'neo4j',
  postgres = 'postgres',
  mysql = 'mysql',
}
export type DataSource = keyof typeof DataSourceEnum

//------------------------------------------------------------------------------

export enum BackendEnum {
  algebraic_julia = 'algebraic_julia',
  haskell = 'haskell',
  hydra = 'hydra',
  json = 'json',
  julia = 'julia',
  julia_genie = 'julia_genie',
  julia_octo = 'julia_octo',
  python = 'python',
  typedb = 'typedb',
  typedb_loader_config = 'typedb_loader_config',
  typescript = 'typescript',
}
export type BackendName = keyof typeof BackendEnum

//------------------------------------------------------------------------------

export enum InferredPTypeEnum {
  boolean = 'boolean',
  categorical = 'categorical',
  date = 'date',
  float = 'float',
  integer = 'integer',
  string = 'string',
}

export type InferredPType = keyof typeof InferredPTypeEnum

//------------------------------------------------------------------------------

export enum InflectionFormatEnum {
  none = 'none',
  camel = 'camel',
  camelcase = 'camelcase',
  pascal = 'pascal',
  snakecase = 'snakecase',
  underscore = 'underscore',
  lower = 'lower',
  lowercase = 'lowercase',
  downcase = 'downcase',
}

export type InflectionFormat = keyof typeof InflectionFormatEnum

//------------------------------------------------------------------------------
