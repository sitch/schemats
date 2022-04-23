import type { ColumnDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { UDTTypeMap } from '../coreference'

export type JuliaType = string

//------------------------------------------------------------------------------

export const JULIA_RESERVED_WORDS = new Set([
  '__dot__',
  '_cmd',
  '_str',
  '@doc_str',
  'abstract',
  'bitstype',
  'block',
  'call',
  'catch',
  'cell1d',
  'comparison',
  'const',
  'curly',
  'do',
  'end',
  'memq',
  'eqv',
  'false',
  'finally',
  'for',
  'function',
  'global',
  'if',
  'kw',
  'line',
  'local',
  'macro',
  'macrocall',
  'memv',
  'module',
  'mutable',
  'none',
  'parameters',
  'primitive',
  'quote',
  'ref',
  'return',
  'row',
  'string',
  'struct',
  'toplevel',
  'true',
  'try',
  'tuple',
  'type',
  'typealias',
  'typed_comprehension',
  'typed_hcat',
  'typed_vcat',
  'vect',
  'where',
])

export const is_reserved_word = (name: string): boolean =>
  JULIA_RESERVED_WORDS.has(name)

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

//------------------------------------------------------------------------------

export const pragma = (_context: BuildContext): string => `
Nullable{T} = Union{Nothing,T}
`
export const cast_julia_type = (
  { config, enums }: BuildContext,
  { udt_name }: ColumnDefinition,
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
  record: ColumnDefinition,
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
  record: ColumnDefinition,
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
