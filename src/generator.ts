import { Config, Backend, ALL_BACKENDS } from "./config";
import {
  BuildContext,
  Coreferences,
  CustomTypes,
  Database,
  EnumDefinitions,
  Relationships,
  Schema,
  TableComments,
  TableDefinitions,
} from "./adapters/types";
import { keyBy, merge } from "lodash";
import { jsonOfSchema } from "./backends/json";
import { typedbOfSchema } from "./backends/typedb";
import { typescriptOfSchema } from "./backends/typescript";
import { getCoreferences } from "./coreference";
import { getRelationships } from "./relationships";




// const mergeComments = (tableDefinitions: TableDefinitions, tableComments: TableComments) : TableDefinitions {
//   tableDefinitions.map(table => {
//     const comments = tableComments[table.name]
//   })
// }


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

  const tableComments : TableComments[] = await Promise.all(
    tableNames.map((tableName) => db.getTableComments(schema, tableName))
  );

  // mergeComments(tableDefinitions, tableComments)

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
    tableComments,
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
