import { Config, ConfigValues, CommandOptions } from "./config";
import {
  BuildContext,
  Coreferences,
  Database,
  Relationships,
} from "./schema-interfaces";
import {
  EnumDefinition,
  TableDefinitions,
  CustomTypes,
} from "./schema-interfaces";
import { typescriptOfSchema } from "./backends/typescript/typescript";
import { typedbOfSchema } from "./backends/typedb/typedb";
import { jsonOfSchema } from "./backends/json/json";

const backends = ["typescript", "typedb", "json"];

export async function generate(config: Config, db: Database): Promise<string> {
  const context = await build(config, db);
  return await formatter(context);
}

const build = async (config: Config, db: Database): Promise<BuildContext> => {
  const schema = config.schema || (await db.getDefaultSchema());
  const tableList = config.tables || (await db.getSchemaTableNames(schema));
  const enums = await db.getEnumDefinitions(schema);
  // const command = config.getCLICommand(db.getConnectionString())

  // let customTypes = new Set<string>()
  let customTypes: CustomTypes = [];
  const tables = await Promise.all(
    tableList.map((table) => db.getTableDefinition(schema, table))
  );

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

const formatter = async (context: BuildContext) => {
  const { backend } = context.config;

  if (backend === "typescript") {
    return await typescriptOfSchema(context);
  }
  if (backend === "json") {
    return await jsonOfSchema(context);
  }
  if (backend === "typedb") {
    return await typedbOfSchema(context);
  }

  throw `Invalid backend: ${backend} must be one of: ${backends.join(", ")}`;
};

export { Config, ConfigValues, CommandOptions, backends };
