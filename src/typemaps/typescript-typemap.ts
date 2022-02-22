
import { DBTypeMap } from "../adapters/types";

import { Config } from "../config";
import { Connection, createConnection, RowDataPacket } from "mysql2/promise";
import {
  Database,
  TableDefinition,
  TableDefinitions,
  EnumDefinition,
  EnumDefinitions,
  ColumnDefinition,
  CustomType,
  CustomTypes,
} from "../adapters/types";

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

export const TYPEDB_TYPES = { ...TYPEDB_MYSQL_TYPEMAP, ...TYPEDB_POSTGRES_TYPEMAP };


export const isReservedWord = (name: string) : boolean => TYPEDB_RESERVED_WORDS.has(name)


// uses the type mappings from https://github.com/mysqljs/ where sensible
export const translateMySQLToTypescript = (config: Config, tableDefinition: TableDefinition, enumType: Set<string>, customTypes: CustomTypes, columnDescriptions: Record<string, string>): TableDefinition => {
  return Object.entries(tableDefinition).reduce((result, [columnName, column]) => {
      switch (column.udtName) {
          case 'char':
          case 'varchar':
          case 'text':
          case 'tinytext':
          case 'mediumtext':
          case 'longtext':
          case 'time':
          case 'geometry':
          case 'set':
          case 'enum':
              // keep set and enum defaulted to string if custom type not mapped
              column.tsType = 'string'
              break
          case 'integer':
          case 'int':
          case 'smallint':
          case 'mediumint':
          case 'bigint':
          case 'double':
          case 'decimal':
          case 'numeric':
          case 'float':
          case 'year':
              column.tsType = 'number'
              break
          case 'tinyint':
              column.tsType = 'boolean'
              break
          // case 'json':
          //     column.tsType = 'unknown'
          //     if (columnDescriptions[columnName]) {
          //         const type = /@type \{([^}]+)\}/.exec(columnDescriptions[columnName])
          //         if (type) {
          //             column.tsType = type[1].trim()
          //             // customTypes.add(column.tsType)
          //         }
          //     }
          //     break
          case 'date':
          case 'datetime':
          case 'timestamp':
              column.tsType = 'Date'
              break
          case 'tinyblob':
          case 'mediumblob':
          case 'longblob':
          case 'blob':
          case 'binary':
          case 'varbinary':
          case 'bit':
              column.tsType = 'Buffer'
              break
          default:
              if (enumType.has(column.udtName)) {
                  column.tsType = config.formatTableName(column.udtName)
                  break
              } else {
                  const warning = `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`
                  if (config.throwOnMissingType) {
                      throw new Error(warning)
                  }
                  console.log(`Type [${column.udtName} has been mapped to [any] because no specific type has been found.`)
                  column.tsType = 'any'
                  break
              }
      }
      // result[columnName] = column
      result.columns[columnName] = column
      return result
  }, {name: tableDefinition.name, columns: {}} as TableDefinition)
}


export const translatePostgresToTypescript = (config: Config, tableDefinition: TableDefinition, enumType: Set<string>, customTypes: CustomTypes, columnDescriptions: Record<string, string>): TableDefinition => {
  return Object.values(tableDefinition.columns).reduce((result, column) => {
      switch (column.udtName) {
          case 'bpchar':
          case 'char':
          case 'varchar':
          case 'text':
          case 'citext':
          case 'uuid':
          case 'bytea':
          case 'inet':
          case 'time':
          case 'timetz':
          case 'interval':
          case 'tsvector':
          case 'mol':
          case 'bfp':
          case 'bit':
          case 'name':
              column.tsType = 'string'
              break
          case 'int2':
          case 'int4':
          case 'int8':
          case 'float4':
          case 'float8':
          case 'numeric':
          case 'money':
          case 'oid':
              column.tsType = 'number'
              break
          case 'bool':
              column.tsType = 'boolean'
              break
          case 'json':
          // case 'jsonb':
          //     column.tsType = 'unknown'
          //     if (columnDescriptions[columnName]) {
          //         const type = /@type \{([^}]+)\}/.exec(columnDescriptions[columnName])
          //         if (type) {
          //             column.tsType = type[1].trim()
          //             // customTypes.add(column.tsType)
          //         }
          //     }
          //     break
          case 'date':
          case 'timestamp':
          case 'timestamptz':
              column.tsType = 'Date'
              break
          case 'point':
              column.tsType = '{ x: number, y: number }'
              break
          default:
              if (enumType.has(column.udtName)) {
                  column.tsType = config.formatTableName(column.udtName)
                  break
              } else {
                  const warning = `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`
                  if (config.throwOnMissingType) {
                      throw new Error(warning)
                  }
                  console.log(`Type [${column.udtName} has been mapped to [any] because no specific type has been found.`)
                  column.tsType = 'any'
                  break
              }
      }
      result.columns[column.name] = column
      return result
  }, {name: tableDefinition.name, columns: {}} as TableDefinition)
}
