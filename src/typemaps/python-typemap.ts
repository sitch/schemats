import type { PropertyDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { UDTTypeMap } from '../coreference'
import { DataSource, DataSourceEnum } from '../enums'

export type PythonType = string

//------------------------------------------------------------------------------

export const MYSQL_TO_PYTHON_TYPEMAP: UDTTypeMap<PythonType> = {
  char: 'str',
  varchar: 'str',
  text: 'str',
  tinytext: 'str',
  mediumtext: 'str',
  longtext: 'str',

  tinyblob: 'str',
  mediumblob: 'str',
  longblob: 'str',
  blob: 'str',
  binary: 'str',
  varbinary: 'str',

  bit: 'str',

  tinyint: 'bool',

  smallint: 'int',
  mediumint: 'int',
  int: 'int',
  // integer: "Int4",
  bigint: 'int',

  double: 'float',
  decimal: 'float',
  numeric: 'float',
  float: 'float',
  year: 'int',
  json: 'JSON',

  geometry: 'str',
  set: 'str',
  enum: 'str',

  date: 'date',
  time: 'time',
  datetime: 'datetime',
  timestamp: 'datetime',
}

export const POSTGRES_TO_PYTHON_TYPEMAP: UDTTypeMap<PythonType> = {
  bool: 'bool',

  bfp: 'str',
  bit: 'str',
  bpchar: 'str',
  bytea: 'str',
  char: 'str',
  citext: 'str',
  inet: 'INET',
  interval: 'int',
  mol: 'Mol',
  name: 'str',
  text: 'str',
  tsvector: 'str',
  varchar: 'str',
  uuid: 'UUID',

  int2: 'int',
  int4: 'int',
  int8: 'int',
  int16: 'int',
  int32: 'int',
  int64: 'int',
  float4: 'float',
  float8: 'float',
  float16: 'float',
  float32: 'float',
  float64: 'float',
  numeric: 'float',
  money: 'Money',

  date: 'date',
  time: 'time',
  timetz: 'time',
  timestamp: 'datetime',
  timestamptz: 'datetime',

  // oid: "number",
  json: 'JSON',
  jsonb: 'JSONB',

  // point: "{ x: number, y: number }",
}

export const NEO4J_TO_PYTHON_TYPEMAP: UDTTypeMap<PythonType> = {
  boolean: 'bool',

  long: 'int',
  integer: 'int',
  float: 'float',
  double: 'float',

  string: 'str',
  stringarray: 'str',

  date: 'date',
  time: 'time',
  datetime: 'datetime',
  localtime: 'datetime',
  localdatetime: 'datetime',

  // duration: 'datetime',
  // point: 'point',
}

// export const PYTHON_TYPEMAP: UDTTypeMap<PythonType> = {
//   ...MYSQL_TO_PYTHON_TYPEMAP,
//   ...POSTGRES_TO_PYTHON_TYPEMAP,
// }

export const DATA_SOURCE_PYTHON_TYPEMAP: Record<DataSource, UDTTypeMap<PythonType>> = {
  [DataSourceEnum.neo4j]: NEO4J_TO_PYTHON_TYPEMAP,
  [DataSourceEnum.mysql]: MYSQL_TO_PYTHON_TYPEMAP,
  [DataSourceEnum.postgres]: POSTGRES_TO_PYTHON_TYPEMAP,
}

//------------------------------------------------------------------------------

export const pragma = (_context: BuildContext): string => `
Nullable{T} = Union{Nothing,T}
`
export const cast_python_type = (
  { config, enums, data_source }: BuildContext,
  { udt_name }: PropertyDefinition,
): PythonType => {
  const type = DATA_SOURCE_PYTHON_TYPEMAP[data_source][udt_name.toLowerCase()]
  if (type && !['unknown'].includes(type)) {
    return type
  }

  const enum_definition = enums.find(({ name }) => name === udt_name.toLowerCase())
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
): PythonType => {
  let type = cast_python_type(context, record)
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
): PythonType => {
  let type = cast_python_type(context, record)
  if (record.is_array) {
    type = `Array{<:${type}}`
    return type
  }
  if (record.is_nullable) {
    type = `Nullable{${type}}`
  }
  return type
}
