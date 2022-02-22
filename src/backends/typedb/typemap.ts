
import { DBTypeMap } from "../../adapter";


export const TYPEDB_RESERVED_WORDS = new Set([
  // datatypes
  "boolean",
  "datetime",
  "double",
  "long",
  "string",

  // 	"COUNT",
  // "MAX",
  // "MEAN",
  // "MEDIAN",
  // "MIN",
  // "STD",
  // "SUM",

  "type",

  // query
  "match",
  "get",
  "define",
  "undefine",
  "delete",
  "compute",
  "insert",

  "abstract",
  "sub",
  "attribute",
  "entity",
  "relation",
  "thing",
  "role",
  "rule",

  "owns",
  "relates",
  "plays",

  "value",
  "isa",
]);


export const TYPEDB_MYSQL_TYPEMAP: DBTypeMap = {
  char: "string",
  varchar: "string",
  text: "string",
  tinytext: "string",
  mediumtext: "string",
  longtext: "string",
  time: "string",
  geometry: "string",
  set: "string",
  enum: "string",
  integer: "long",
  int: "long",
  smallint: "long",
  mediumint: "long",
  bigint: "long",
  double: "double",
  decimal: "double",
  numeric: "double",
  float: "double",
  year: "long",
  tinyint: "boolean",
  json: "JSON",
  date: "datetime",
  datetime: "datetime",
  timestamp: "datetime",
  tinyblob: "string",
  mediumblob: "string",
  longblob: "string",
  blob: "string",
  binary: "string",
  varbinary: "string",
  bit: "string",
};

export const TYPEDB_POSTGRES_TYPEMAP: DBTypeMap = {
  bpchar: "string",
  char: "string",
  varchar: "string",
  text: "string",
  citext: "string",
  uuid: "string",
  bytea: "string",
  inet: "string",
  time: "datetime",
  timetz: "datetime",
  interval: "string",
  tsvector: "string",
  mol: "string",
  bit: "string",
  bfp: "string",
  name: "string",
  int2: "long",
  int4: "long",
  int8: "long",
  float4: "double",
  float8: "double",
  numeric: "double",
  money: "double",
  // oid: "number",
  bool: "boolean",
  json: "JSON",
  // jsonb: 'JSONB',
  date: "datetime",
  timestamp: "datetime",
  timestamptz: "datetime",
  // point: "{ x: number, y: number }",
};

export const TYPEDB_TYPEMAP :DBTypeMap = { ...TYPEDB_MYSQL_TYPEMAP, ...TYPEDB_POSTGRES_TYPEMAP };

export const isReservedWord = (name: string) : boolean => TYPEDB_RESERVED_WORDS.has(name)
