import type { PropertyDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { UDTTypeMap } from '../coreference'

//------------------------------------------------------------------------------

export type TypescriptType = string

//------------------------------------------------------------------------------

export const TYPESCRIPT_RESERVED_WORDS = new Set([
  // primatives
  'string',
  'number',
  'package',
])

export const is_reserved_word = (name: string): boolean =>
  TYPESCRIPT_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

const MYSQL_TO_TYPESCRIPT_TYPEMAP: UDTTypeMap<TypescriptType> = {
  char: 'string',
  varchar: 'string',
  text: 'string',
  tinytext: 'string',
  mediumtext: 'string',
  longtext: 'string',
  geometry: 'string',
  set: 'string',
  enum: 'string',

  bit: 'Buffer',
  blob: 'Buffer',
  tinyblob: 'Buffer',
  mediumblob: 'Buffer',
  longblob: 'Buffer',
  binary: 'Buffer',
  varbinary: 'Buffer',

  integer: 'number',
  int: 'number',
  smallint: 'number',
  mediumint: 'number',
  bigint: 'number',
  double: 'number',
  decimal: 'number',
  numeric: 'number',
  float: 'number',
  year: 'number',

  tinyint: 'boolean',

  json: 'JSON',

  date: 'Date',
  datetime: 'Date',
  timestamp: 'Date',
  time: 'string',
}

const POSTGRES_TO_TYPESCRIPT_TYPEMAP: UDTTypeMap<TypescriptType> = {
  bpchar: 'string',
  char: 'string',
  varchar: 'string',
  text: 'string',
  citext: 'string',
  uuid: 'string',
  bytea: 'string',
  inet: 'string',

  mol: 'string',
  bit: 'string',
  bfp: 'string',
  name: 'string',

  int2: 'number',
  int4: 'number',
  int8: 'number',
  float4: 'number',
  float8: 'number',
  numeric: 'number',
  money: 'number',
  oid: 'number',

  bool: 'boolean',

  json: 'JSON',
  jsonb: 'JSONB',

  date: 'Date',
  timestamp: 'Date',
  timestamptz: 'Date',

  time: 'string',
  timetz: 'string',

  interval: 'string',
  tsvector: 'string',

  point: '{ x: number, y: number }',
}

export const TYPESCRIPT_TYPEMAP = {
  ...MYSQL_TO_TYPESCRIPT_TYPEMAP,
  ...POSTGRES_TO_TYPESCRIPT_TYPEMAP,
}

//------------------------------------------------------------------------------

export const cast_typescript_type = (
  { config, enums }: BuildContext,
  { udt_name }: PropertyDefinition,
): TypescriptType => {
  const type = TYPESCRIPT_TYPEMAP[udt_name]
  if (type && !['unknown'].includes(type)) {
    return type
  }

  const enum_definition = enums.find(({ name }) => name === udt_name)
  if (enum_definition) {
    const enum_type = config.formatEnumName(enum_definition.name)
    return `string; # enum: ${enum_type}`
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
): TypescriptType => {
  let type = cast_typescript_type(context, record)
  if (record.is_array) {
    type = `${type}[]`
  }
  if (record.is_nullable) {
    type = `${type} | null`
  }
  return type
}

export const pragma = (_context: BuildContext): string => ``
