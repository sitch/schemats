import { Config } from "../config";
import { Database } from "../schema-interfaces";
import { flatMap } from "lodash";
import {
  EnumDefinition,
  TableDefinition,
  ColumnDefinition,
  EnumDefinitions,
  TableDefinitions,
  CustomType,
  CustomTypes,
} from "../schema-interfaces";

//------------------------------------------------------------------------------

const reservedJSNames = new Set(["string", "number", "package"]);
const normalizeName = (name: string): string =>
  reservedJSNames.has(name) ? `${name}_` : name;

//------------------------------------------------------------------------------

const MYSQL_TYPES: Record<string, string> = {
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

const POSTGRES_TYPES: Record<string, string> = {
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
  'json': 'JSON',
  'jsonb': 'JSONB',
  date: "Date",
  timestamp: "Date",
  timestamptz: "Date",
  point: "{ x: number, y: number }",
};

const TYPES = { ...MYSQL_TYPES, ...POSTGRES_TYPES };


const typing = (config: Config, { name, udtName }: ColumnDefinition, enumDefinitions: EnumDefinitions): string => {
  const type = TYPES[udtName];
  if (type && !['unknown'].includes(type)) {
    return type;
  }

  const enumDefinition = enumDefinitions.find(column => column.name === udtName)
  if(enumDefinition ) {
    return config.formatEnumName(enumDefinition.name)
  }

  const warning = `Type [${udtName} has been mapped to [any] because no specific type has been found.`;
  if (config.throwOnMissingType) {
    throw new Error(warning);
  }
  console.warn(warning);
  return "any";
};

const translateType = (config: Config, record: ColumnDefinition, enumDefinitions: EnumDefinitions): string => {
  const type = typing(config, record, enumDefinitions);
  return `${type}${record.isArray ? "[]" : ""}${
    record.nullable ? " | null" : ""
  }`;
};

//------------------------------------------------------------------------------

const castHeader = async (config: Config, db: Database): Promise<string> => `
/**
 * AUTO-GENERATED FILE @ ${new Date().toUTCString()} - DO NOT EDIT!
 *
 * This file was automatically generated by schemats v.${config.version}
 * $ ${config.getCLICommand(db.getConnectionString())}
 *
 */`;

//------------------------------------------------------------------------------

const Enums = {
  name: (config: Config, { table, name, column }: EnumDefinition): string =>
    // config.formatEnumName(normalizeName(`${table}_${name}`)),
    config.formatEnumName(normalizeName(`${name}`)),

  key: (config: Config, value: string): string =>
    // `${config.formatColumnName(normalizeName(name))}${nullable ? "?" : ""}`,
    value,

  value: (config: Config, value: string): string =>
    // config.formatEnumName(value),
    value
};

const castEnumAsEnum = (config: Config) => (record: EnumDefinition) => {
  const entries = Array.from(record.values).map(
    (value: string) => `  '${Enums.key(config, value)}' = '${Enums.value(config, value)}'`
  );
  return `export enum ${Enums.name(config, record)} {\n${entries.join(
    ",\n"
  )}\n}`;
};

const castEnumAsType = (config: Config) => (record: EnumDefinition) => {
  const entries = Array.from(record.values).map(
    (value: string) => `'${value}'`
  );
  return `export type ${Enums.name(config, record)} = ${entries.join(" | ")}`;
};

const castEnum =
  (config: Config) =>
  (record: EnumDefinition): string => {
    if (config.enums) {
      return castEnumAsEnum(config)(record);
    }
    return castEnumAsType(config)(record);
  };

//------------------------------------------------------------------------------

const Interface = {
  name: (config: Config, { name }: TableDefinition): string =>
    config.formatTableName(normalizeName(name)),

  key: (config: Config, { name, nullable }: ColumnDefinition): string =>
    `${config.formatColumnName(normalizeName(name))}${nullable ? "?" : ""}`,

  value: (config: Config, record: ColumnDefinition, enumDefinitions: EnumDefinitions): string =>
    translateType(config, record, enumDefinitions),
};

const castInterface = (config: Config, enumDefinitions: EnumDefinitions) => (record: TableDefinition) => {
  const name = Interface.name(config, record);
  const fields = record.columns.map(
    (column) =>
      `  ${Interface.key(config, column)}: ${Interface.value(config, column, enumDefinitions)}`
  );
  return `export interface ${name} {\n${fields.join("\n")}\n}`;
};

//------------------------------------------------------------------------------

const castCustom =
  (config: Config) =>
  (record: CustomType): string =>
    `import { ${Array.from(record).join(", ")} } from '${
      config.typesFile
    }'\n\n`;

//------------------------------------------------------------------------------

export const castLookup = (
  config: Config,
  records: TableDefinitions
): string => {
  const types = records.map(
    ({ name }) => `  ${name}: ${config.formatTableName(normalizeName(name))}`
  );
  return `export interface Tables {\n${types.join(",\n")}\n}`;
};

//------------------------------------------------------------------------------

export const typescriptOfSchema = async (
  config: Config,
  db: Database,
  schema: string,
  tableDefinitions: TableDefinitions,
  enumDefinitions: EnumDefinitions,
  customTypes: CustomTypes
) => {
  const header = await castHeader(config, db);
  const customs = flatMap(customTypes, castCustom(config));
  const enums = flatMap(enumDefinitions, castEnum(config));
  const interfaces = flatMap(tableDefinitions, castInterface(config, enumDefinitions));
  const lookup = castLookup(config, tableDefinitions);


  return [
    header,
    customs.join("\n\n"),
    enums.join("\n\n"),
    interfaces.join("\n\n"),
    lookup,
  ].join("\n\n");
};
