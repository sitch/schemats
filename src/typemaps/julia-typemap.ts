import type { PropertyDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { UDTTypeMap } from '../coreference'
import { DataSource, DataSourceEnum } from '../enums'

export type JuliaType = string

//------------------------------------------------------------------------------

export const MYSQL_TO_JULIA_TYPEMAP: UDTTypeMap<JuliaType> = {
  char: 'String',
  varchar: 'String',
  text: 'String',
  tinytext: 'String',
  mediumtext: 'String',
  longtext: 'String',

  tinyblob: 'String',
  mediumblob: 'String',
  longblob: 'String',
  blob: 'String',
  binary: 'String',
  varbinary: 'String',

  bit: 'String',

  tinyint: 'Bool',

  smallint: 'Int2',
  mediumint: 'Int3',
  int: 'Int4',
  // integer: "Int4",
  bigint: 'Int8',

  double: 'Float',
  decimal: 'Float',
  numeric: 'Float',
  float: 'Float',
  year: 'Int4',
  json: 'JSON',

  geometry: 'String',
  set: 'String',
  enum: 'String',

  date: 'Dates.Date',
  time: 'Dates.Time',
  datetime: 'Dates.DateTime',
  timestamp: 'Dates.DateTime',
}

export const POSTGRES_TO_JULIA_TYPEMAP: UDTTypeMap<JuliaType> = {
  bool: 'Bool',

  bfp: 'String',
  bit: 'String',
  bpchar: 'String',
  bytea: 'String',
  char: 'String',
  citext: 'String',
  inet: 'INET',
  interval: 'Interval',
  mol: 'Mol',
  name: 'String',
  text: 'String',
  tsvector: 'String',
  varchar: 'String',
  uuid: 'UUIDs.UUID',

  int2: 'Int2',
  int4: 'Int4',
  int8: 'Int8',
  int16: 'Int16',
  int32: 'Int32',
  int64: 'Int64',
  float4: 'Float4',
  float8: 'Float8',
  float16: 'Float16',
  float32: 'Float32',
  float64: 'Float64',
  numeric: 'Float32',
  money: 'Money',

  date: 'Dates.Date',
  time: 'Dates.Time',
  timetz: 'Dates.Time',
  timestamp: 'Dates.DateTime',
  timestamptz: 'Dates.DateTime',

  // oid: "number",
  json: 'JSON',
  jsonb: 'JSONB',

  // point: "{ x: number, y: number }",
}

export const JULIA_TYPEMAP: UDTTypeMap<JuliaType> = {
  ...MYSQL_TO_JULIA_TYPEMAP,
  ...POSTGRES_TO_JULIA_TYPEMAP,
}

export const DATA_SOURCE_JULIA_TYPEMAP: Record<DataSource, UDTTypeMap<JuliaType>> = {
  [DataSourceEnum.neo4j]: {
    ...MYSQL_TO_JULIA_TYPEMAP,
    ...POSTGRES_TO_JULIA_TYPEMAP,
  },
  [DataSourceEnum.mysql]: MYSQL_TO_JULIA_TYPEMAP,
  [DataSourceEnum.postgres]: POSTGRES_TO_JULIA_TYPEMAP,
}

//------------------------------------------------------------------------------

export const pragma = (_context: BuildContext): string => `
Nullable{T} = Union{Nothing,T}
`
export const cast_julia_type = (
  { config, enums }: BuildContext,
  { udt_name }: PropertyDefinition,
): JuliaType => {
  const type = JULIA_TYPEMAP[udt_name]
  if (type && !['unknown'].includes(type)) {
    return type
  }

  const enum_definition = enums.find(({ name }) => name === udt_name)
  if (enum_definition) {
    const enum_type = config.formatEnumName(enum_definition.name)
    return `String; # enum: ${enum_type}`
  }

  const warning = `Type [${udt_name} has been mapped to [any] because no specific type has been found.`
  if (config.throwOnMissingType) {
    throw new Error(warning)
  }
  console.warn(warning)
  return 'any'
}

export const translate_type = (
  context: BuildContext,
  record: PropertyDefinition,
): JuliaType => {
  let type = cast_julia_type(context, record)
  if (record.is_array) {
    type = `Array{<:${type}}`
  }
  if (record.is_nullable) {
    // type = `Nullable{${type}}`
    type = `Nullable{${type}}`
  }
  return type
}

export const translate_relation_name = (
  context: BuildContext,
  record: PropertyDefinition,
): JuliaType => {
  let type = cast_julia_type(context, record)
  if (record.is_array) {
    type = `Array{<:${type}}`
    return type
  }
  if (record.is_nullable) {
    type = `Nullable{${type}}`
  }
  return type
}
