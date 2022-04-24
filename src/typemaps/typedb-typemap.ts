import type { ColumnDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { UDTTypeMap } from '../coreference'

export type TypeDBType = string

//------------------------------------------------------------------------------

export const TYPEDB_RESERVED_WORDS = new Set([
  // datatypes
  'boolean',
  'datetime',
  'double',
  'long',
  'string',

  // 	"COUNT",
  // "MAX",
  // "MEAN",
  // "MEDIAN",
  // "MIN",
  // "STD",
  // "SUM",

  'type',

  // query
  'match',
  'get',
  'define',
  'undefine',
  'delete',
  'compute',
  'insert',

  'abstract',
  'sub',
  'attribute',
  'entity',
  'relation',
  'thing',
  'role',
  'rule',

  'owns',
  'relates',
  'plays',

  'value',
  'isa',
])

export const is_reserved_word = (name: string): boolean =>
  TYPEDB_RESERVED_WORDS.has(name)

//------------------------------------------------------------------------------

export const MYSQL_TO_TYPEDB_TYPEMAP: UDTTypeMap<TypeDBType> = {
  char: 'string',
  varchar: 'string',
  text: 'string',
  tinytext: 'string',
  mediumtext: 'string',
  longtext: 'string',
  geometry: 'string',
  set: 'string',
  enum: 'string',
  tinyblob: 'string',
  mediumblob: 'string',
  longblob: 'string',
  blob: 'string',
  binary: 'string',
  varbinary: 'string',
  bit: 'string',

  tinyint: 'boolean',
  int: 'long',
  smallint: 'long',
  mediumint: 'long',
  bigint: 'long',
  year: 'long',
  integer: 'long',

  double: 'double',
  decimal: 'double',
  numeric: 'double',
  float: 'double',

  json: 'JSON',

  time: 'datetime',
  date: 'datetime',
  datetime: 'datetime',
  timestamp: 'datetime',
}

export const POSTGRES_TO_TYPEDB_TYPEMAP: UDTTypeMap<TypeDBType> = {
  bpchar: 'string',
  char: 'string',
  varchar: 'string',
  text: 'string',
  citext: 'string',
  uuid: 'string',
  bytea: 'string',
  inet: 'string',

  interval: 'string',
  tsvector: 'string',
  mol: 'string',
  bit: 'string',
  bfp: 'string',
  name: 'string',

  int2: 'long',
  int4: 'long',
  int8: 'long',
  float4: 'double',
  float8: 'double',
  numeric: 'double',
  money: 'double',
  // oid: "number",

  bool: 'boolean',

  json: 'string',
  // json: 'JSON',
  // jsonb: 'JSONB',

  date: 'datetime',
  timestamp: 'datetime',
  timestamptz: 'datetime',
  time: 'datetime',
  timetz: 'datetime',
  // point: "{ x: number, y: number }",
}

export const TYPEDB_TYPEMAP: UDTTypeMap<TypeDBType> = {
  ...MYSQL_TO_TYPEDB_TYPEMAP,
  ...POSTGRES_TO_TYPEDB_TYPEMAP,
}

//------------------------------------------------------------------------------

export const cast_typedb_type = (
  { config, enums }: BuildContext,
  { udt_name }: ColumnDefinition,
): TypeDBType => {
  const type = TYPEDB_TYPEMAP[udt_name]
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

export const pragma = ({ config }: BuildContext): string => `
define

${config.database}-entity sub entity, abstract;
${config.database}-relation sub relation, abstract;`
