import { Config } from "./config";
import {
  Schema,
  EnumDefinitions,
  Coreferences,
  Database,
  Relationships,
} from "./adapters/types";
import { TableDefinitions, CustomTypes } from "./adapters/types";
import { typescriptOfSchema } from "./backends/typescript";
import { typedbOfSchema } from "./backends/typedb";
import { jsonOfSchema } from "./backends/json";
import { keyBy } from "lodash";

export interface BuildContext {
  schema: Schema;
  config: Config;
  tables: TableDefinitions;
  enums: EnumDefinitions;
  relationships: Relationships;
  customTypes: CustomTypes;
  coreferences: Coreferences;
}

export type DBTypeMap = Record<string, string>;

const ALL_BACKENDS = ["typescript", "json", "typedb"] as const;

export type Backends = typeof ALL_BACKENDS;

// export type Backend = "typescript" | "json" | "typedb";
export type Backend = string;

export async function generate(config: Config, db: Database): Promise<string> {
  const context = await build(config, db);

  const backend = context.config.backend;

  return await render(context, backend);
}

const build = async (config: Config, db: Database): Promise<BuildContext> => {
  const schema = config.schema || (await db.getDefaultSchema());
  const tableNames = config.tables || (await db.getTableNames(schema));
  const enums = await db.getEnumDefinitions(schema);
  // const command = config.getCLICommand(db.getConnectionString())

  // let customTypes = new Set<string>()
  let customTypes: CustomTypes = [];
  const tableList = await Promise.all(
    tableNames.map((tableName) => db.getTableDefinition(schema, tableName))
  );

  const tables = keyBy(tableList, 'name')

  const relationships: Relationships = [];
  const coreferences: Coreferences = {
    all: {},
    user: {},
  };

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
  throw `Invalid backend: ${backend} must be one of: ${ALL_BACKENDS.join(
    ", "
  )}`;
};
