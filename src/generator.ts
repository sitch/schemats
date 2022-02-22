import { Config, Backend, ALL_BACKENDS } from "./config";
import {
  Schema,
  EnumDefinitions,
  Coreferences,
  Database,
  Relationships,
} from "./adapters/types";
import { TableDefinitions, CustomTypes } from "./adapters/types";
import { keyBy } from "lodash";
import { jsonOfSchema } from "./backends/json";
import { typedbOfSchema } from "./backends/typedb";
import { typescriptOfSchema } from "./backends/typescript";
import { getCoreferences } from "./coreference";
import { getRelationships } from "./relationships";

export interface BuildContext {
  schema: Schema;
  config: Config;
  tables: TableDefinitions;
  enums: EnumDefinitions;
  relationships: Relationships;
  customTypes: CustomTypes;
  coreferences: Coreferences;
}

export async function generate(config: Config, db: Database): Promise<string> {
  const context = await build(config, db);
  const backend = context.config.backend;
  return await render(context, backend);
}

const build = async (config: Config, db: Database): Promise<BuildContext> => {
  const schema = config.schema || (await db.getDefaultSchema());
  const tableNames = config.tables || (await db.getTableNames(schema));
  const enums = await db.getEnumDefinitions(schema);
  const tableDefinitions = await Promise.all(
    tableNames.map((tableName) => db.getTableDefinition(schema, tableName))
  );

  const tables = keyBy(tableDefinitions, "name");
  const customTypes = getCustomTypes(config, tables);
  const relationships = getRelationships(config, tables);
  const coreferences = getCoreferences(config, tables);

  return {
    config,
    relationships,
    coreferences,
    schema,
    tables,
    enums,
    customTypes,
  };
};

const render = async (context: BuildContext, backend: Backend) => {
  if (backend === "typescript") {
    return await typescriptOfSchema(context);
  }
  if (backend === "json") {
    return await jsonOfSchema(context);
  }
  if (backend === "typedb") {
    return await typedbOfSchema(context);
  }
  const backends = ALL_BACKENDS.join(", ");
  throw `Invalid backend: ${backend} must be one of: ${backends}`;
};

export const getCustomTypes = (
  config: Config,
  tables: TableDefinitions
): CustomTypes => {
  return [];
};
