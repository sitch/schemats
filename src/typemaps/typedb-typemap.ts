import type { ColumnDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { DataSource, DataSourceEnum } from '../config'
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

export const NEO4J_TO_TYPEDB_TYPEMAP: UDTTypeMap<TypeDBType> = {
  boolean: 'boolean',

  long: 'long',
  integer: 'long',
  float: 'double',
  double: 'double',

  string: 'string',
  stringarray: 'string',

  date: 'datetime',
  time: 'datetime',
  datetime: 'datetime',
  localtime: 'datetime',
  localdatetime: 'datetime',

  // duration: 'datetime',
  // point: 'point',
}

export const TYPEDB_TYPEMAP: UDTTypeMap<TypeDBType> = {
  ...NEO4J_TO_TYPEDB_TYPEMAP,
  ...MYSQL_TO_TYPEDB_TYPEMAP,
  ...POSTGRES_TO_TYPEDB_TYPEMAP,
}

export const DATA_SOURCE_TYPEDB_TYPEMAP: Record<DataSource, UDTTypeMap<TypeDBType>> = {
  [DataSourceEnum.neo4j]: NEO4J_TO_TYPEDB_TYPEMAP,
  [DataSourceEnum.mysql]: MYSQL_TO_TYPEDB_TYPEMAP,
  [DataSourceEnum.postgres]: POSTGRES_TO_TYPEDB_TYPEMAP,
}

//------------------------------------------------------------------------------

export const lookup_typedb_type = (
  column: ColumnDefinition,
  data_source: DataSource,
): TypeDBType => {
  const { udt_name } = column
  const type = DATA_SOURCE_TYPEDB_TYPEMAP[data_source][udt_name.toLowerCase()]
  if (type && !['unknown'].includes(type)) {
    return type
  }
  return 'unknown'
}

export const cast_typedb_type = (
  { data_source, config, enums }: BuildContext,
  column: ColumnDefinition,
): TypeDBType => {
  const { udt_name } = column
  const type = DATA_SOURCE_TYPEDB_TYPEMAP[data_source][udt_name.toLowerCase()]

  if (type && !['unknown'].includes(type)) {
    return type
  }
  const enum_definition = enums.find(({ name }) => name === udt_name)
  if (enum_definition) {
    const enum_type = config.formatEnumName(enum_definition.name)
    return `string; # enum: ${enum_type}`
  }

  const warning = `Type "${udt_name}" has been mapped to [any] because no specific type has been found.`
  if (config.throwOnMissingType) {
    console.log({ data_source, column, backend: config.backend })

    throw new Error(warning)
  }
  console.warn(warning)
  return 'any'
}

export const pragma = ({ config }: BuildContext): string => `
define

${config.database}-entity sub entity, abstract;
${config.database}-relation sub relation, abstract;`
