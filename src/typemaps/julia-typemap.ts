import { ColumnDefinition } from '../adapters/types'
import { BuildContext } from '../compiler'
import { UDTTypeMap } from '../coreference'

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

export const isReservedWord = (name: string): boolean => JULIA_RESERVED_WORDS.has(name)

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

  time: 'Datetime',
  date: 'Datetime',
  datetime: 'Datetime',
  timestamp: 'Datetime',
}

export const POSTGRES_TO_JULIA_TYPEMAP: UDTTypeMap<JuliaType> = {
  bool: 'Bool',

  bfp: 'String',
  bit: 'String',
  bpchar: 'String',
  bytea: 'String',
  char: 'String',
  citext: 'String',
  inet: 'String',
  interval: 'String',
  mol: 'String',
  name: 'String',
  text: 'String',
  tsvector: 'String',
  uuid: 'String',
  varchar: 'String',

  int2: 'Int2',
  int4: 'Int4',
  int8: 'Int8',
  int16: 'Int16',
  int32: 'Int32',
  int64: 'Int64',
  float4: 'Float',
  float8: 'Float',
  numeric: 'Float',
  money: 'Float',

  date: 'Datetime',
  time: 'Datetime',
  timetz: 'Datetime',
  timestamp: 'Datetime',
  timestamptz: 'Datetime',

  // oid: "number",
  json: 'JSON',
  // jsonb: 'JSONB',

  // point: "{ x: number, y: number }",
}

export const JULIA_TYPEMAP: UDTTypeMap<JuliaType> = {
  ...MYSQL_TO_JULIA_TYPEMAP,
  ...POSTGRES_TO_JULIA_TYPEMAP,
}

//------------------------------------------------------------------------------

export const pragma = (_context: BuildContext): string => `
Nullable{T} = Union{Nothing,T}
Optional{T} = Union{Nothing,T}
`

export const castJuliaType = (
  { config, enums }: BuildContext,
  { udtName }: ColumnDefinition,
): JuliaType => {
  const type = JULIA_TYPEMAP[udtName]
  if (type && !['unknown'].includes(type)) {
    return type
  }

  const enumDefinition = enums.find(({ name }) => name === udtName)
  if (enumDefinition) {
    const enumType = config.formatEnumName(enumDefinition.name)
    return `String; # enum: ${enumType}`
  }

  const warning = `Type [${udtName} has been mapped to [any] because no specific type has been found.`
  if (config.throwOnMissingType) {
    throw new Error(warning)
  }
  console.warn(warning)
  return 'any'
}

export const translateType = (
  context: BuildContext,
  record: ColumnDefinition,
): JuliaType => {
  let type = castJuliaType(context, record)
  if (record.isArray) {
    type = `Array{<:${type}}`
  }
  if (record.isNullable) {
    type = `Nullable{${type}}`
  }
  return type
}

export const translateRelationName = (
  context: BuildContext,
  record: ColumnDefinition,
): JuliaType => {
  let type = castJuliaType(context, record)
  if (record.isArray) {
    type = `Array{<:${type}}`
  }
  if (record.isNullable) {
    type = `Optional{${type}}`
  }
  return type
}
