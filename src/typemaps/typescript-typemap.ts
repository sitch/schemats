import { BuildContext } from "../generator";
import { ColumnDefinition } from "../adapters/types";
import { UDTTypeMap } from "../coreference";



export type TypescriptType = string

//------------------------------------------------------------------------------


export const TYPESCRIPT_RESERVED_WORDS = new Set([
  // primatives

  "string",
  "number",
  "package",
]);

const TYPESCRIPT_MYSQL_TYPES: Record<string, string> = {
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
  integer: "number",
  int: "number",
  smallint: "number",
  mediumint: "number",
  bigint: "number",
  double: "number",
  decimal: "number",
  numeric: "number",
  float: "number",
  year: "number",
  tinyint: "boolean",
  json: "JSON",
  date: "Date",
  datetime: "Date",
  timestamp: "Date",
  tinyblob: "string",
  mediumblob: "string",
  longblob: "string",
  blob: "string",
  binary: "string",
  varbinary: "string",
  bit: "string",
};

const TYPESCRIPT_POSTGRES_TYPES: Record<string, string> = {
  bpchar: "string",
  char: "string",
  varchar: "string",
  text: "string",
  citext: "string",
  uuid: "string",
  bytea: "string",
  inet: "string",
  time: "string",
  timetz: "string",
  interval: "string",
  tsvector: "string",
  mol: "string",
  bit: "string",
  bfp: "string",
  name: "string",
  int2: "number",
  int4: "number",
  int8: "number",
  float4: "number",
  float8: "number",
  numeric: "number",
  money: "number",
  oid: "number",
  bool: "boolean",
  json: "JSON",
  jsonb: "JSONB",
  date: "Date",
  timestamp: "Date",
  timestamptz: "Date",
  point: "{ x: number, y: number }",
};

export const TYPESCRIPT_TYPEMAP = {
  ...TYPESCRIPT_MYSQL_TYPES,
  ...TYPESCRIPT_POSTGRES_TYPES,
};

export const isReservedWord = (name: string): boolean =>
  TYPESCRIPT_RESERVED_WORDS.has(name);


//------------------------------------------------------------------------------








  export const castTypescriptType = (
    { config, enums }: BuildContext,
    { udtName }: ColumnDefinition
  ): TypescriptType => {
    const type = TYPESCRIPT_TYPEMAP[udtName];
    if (type && !["unknown"].includes(type)) {
      return type;
    }

    const enumDefinition = enums.find(({ name }) => name === udtName);
    if (enumDefinition) {
      const enumType = config.formatEnumName(enumDefinition.name);
      return `string; # enum: ${enumType}`;
    }

    const warning = `Type [${udtName} has been mapped to [any] because no specific type has been found.`;
    if (config.throwOnMissingType) {
      throw new Error(warning);
    }
    console.warn(warning);
    return "any";
  };

  export const translateType = (
    context: BuildContext,
    record: ColumnDefinition,
  ): TypescriptType => {
    const type = castTypescriptType(context, record);
    return `${type}${record.isArray ? "[]" : ""}${
      record.isNullable ? " | null" : ""
    }`;
  };



// // uses the type mappings from https://github.com/mysqljs/ where sensible
// export const translateMySQLToTypescript = (
//   config: Config,
//   tableDefinition: TableDefinition,
//   enumType: Set<string>,
//   userImports: UserImport[],
//   columnDescriptions: Record<string, string>
// ): TableDefinition => {
//   return Object.entries(tableDefinition).reduce(
//     (result, [columnName, column]) => {
//       switch (column.udtName) {
//         case "char":
//         case "varchar":
//         case "text":
//         case "tinytext":
//         case "mediumtext":
//         case "longtext":
//         case "time":
//         case "geometry":
//         case "set":
//         case "enum":
//           // keep set and enum defaulted to string if custom type not mapped
//           column.tsType = "string";
//           break;
//         case "integer":
//         case "int":
//         case "smallint":
//         case "mediumint":
//         case "bigint":
//         case "double":
//         case "decimal":
//         case "numeric":
//         case "float":
//         case "year":
//           column.tsType = "number";
//           break;
//         case "tinyint":
//           column.tsType = "boolean";
//           break;
//         // case 'json':
//         //     column.tsType = 'unknown'
//         //     if (columnDescriptions[columnName]) {
//         //         const type = /@type \{([^}]+)\}/.exec(columnDescriptions[columnName])
//         //         if (type) {
//         //             column.tsType = type[1].trim()
//         //             // userImports.add(column.tsType)
//         //         }
//         //     }
//         //     break
//         case "date":
//         case "datetime":
//         case "timestamp":
//           column.tsType = "Date";
//           break;
//         case "tinyblob":
//         case "mediumblob":
//         case "longblob":
//         case "blob":
//         case "binary":
//         case "varbinary":
//         case "bit":
//           column.tsType = "Buffer";
//           break;
//         default:
//           if (enumType.has(column.udtName)) {
//             column.tsType = config.formatTableName(column.udtName);
//             break;
//           } else {
//             const warning = `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`;
//             if (config.throwOnMissingType) {
//               throw new Error(warning);
//             }
//             console.error(
//               `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`
//             );
//             column.tsType = "any";
//             break;
//           }
//       }
//       // result[columnName] = column
//       result.columns[columnName] = column;
//       return result;
//     },
//     { name: tableDefinition.name, columns: {} } as TableDefinition
//   );
// };

// export const translatePostgresToTypescript = (
//   config: Config,
//   tableDefinition: TableDefinition,
//   enumType: Set<string>,
//   userImports: UserImports,
//   columnDescriptions: Record<string, string>
// ): TableDefinition => {
//   return Object.values(tableDefinition.columns).reduce(
//     (result, column) => {
//       switch (column.udtName) {
//         case "bpchar":
//         case "char":
//         case "varchar":
//         case "text":
//         case "citext":
//         case "uuid":
//         case "bytea":
//         case "inet":
//         case "time":
//         case "timetz":
//         case "interval":
//         case "tsvector":
//         case "mol":
//         case "bfp":
//         case "bit":
//         case "name":
//           column.tsType = "string";
//           break;
//         case "int2":
//         case "int4":
//         case "int8":
//         case "float4":
//         case "float8":
//         case "numeric":
//         case "money":
//         case "oid":
//           column.tsType = "number";
//           break;
//         case "bool":
//           column.tsType = "boolean";
//           break;
//         case "json":
//         // case 'jsonb':
//         //     column.tsType = 'unknown'
//         //     if (columnDescriptions[columnName]) {
//         //         const type = /@type \{([^}]+)\}/.exec(columnDescriptions[columnName])
//         //         if (type) {
//         //             column.tsType = type[1].trim()
//         //             // userImports.add(column.tsType)
//         //         }
//         //     }
//         //     break
//         case "date":
//         case "timestamp":
//         case "timestamptz":
//           column.tsType = "Date";
//           break;
//         case "point":
//           column.tsType = "{ x: number, y: number }";
//           break;
//         default:
//           if (enumType.has(column.udtName)) {
//             column.tsType = config.formatTableName(column.udtName);
//             break;
//           } else {
//             const warning = `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`;
//             if (config.throwOnMissingType) {
//               throw new Error(warning);
//             }
//             console.error(
//               `Type [${column.udtName} has been mapped to [any] because no specific type has been found.`
//             );
//             column.tsType = "any";
//             break;
//           }
//       }
//       result.columns[column.name] = column;
//       return result;
//     },
//     { name: tableDefinition.name, columns: {} } as TableDefinition
//   );
// };

//-------------------------------------------------------------
// mysql
//-------------------------------------------------------------
// public async getTableMap(
//   schemaName: Schema,
//   tableName: TableName,
//   userImports: UserImports
// ) {
//   const enumType = await this.getEnums(schemaName);
//   const columnComments = await this.getTableComments(schemaName, tableName);
//   return translateMySQLToTypescript(
//     this.config,
//     await this.getTable(schemaName, tableName),
//     new Set(Object.keys(enumType)),
//     userImports,
//     columnComments
//   );
// }

//-------------------------------------------------------------
// postgres
//-------------------------------------------------------------
// public async getTableMap(schemaName: Schema, tableName: TableName, userImports: UserImports) :  Promise<TableType> {
//     const enumType = await this.getEnums(schemaName)
//     const columnComments = await this.getTableComments(schemaName, tableName)
//     return translatePostgresToTypescript(
//         this.config,
//         await this.getTable(schemaName, tableName),
//         new Set(Object.keys(enumType)),
//         userImports,
//         columnComments
//     )
// }
