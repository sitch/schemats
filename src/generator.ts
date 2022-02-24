import { jsonOfSchema } from "./backends/json";
import { typedbOfSchema } from "./backends/typedb";
import { typescriptOfSchema } from "./backends/typescript";
import { Coreferences, buildCoreferences } from "./coreference";
import { Relationship, buildRelationships } from "./relationships";
import { mergeTableMeta } from "./tables";
import {
  BACKENDS,
  Backend,
  Config,
  UserImport,
  getUserImports,
} from "./config";
import {
  validateCoreferences,
  validateEnums,
  validateTables,
} from "./validators";
import {
  Database,
  SchemaName,
  PrimaryKey,
  ForeignKey,
  TableComment,
  ColumnComment,
  EnumDefinition,
  TableDefinitionMap,
} from "./adapters/types";

//------------------------------------------------------------------------------

export interface BuildContext {
  schema: SchemaName;
  config: Config;
  primaryKeys: PrimaryKey[];
  foreignKeys: ForeignKey[];
  tableComments: TableComment[];
  columnComments: ColumnComment[];
  enums: EnumDefinition[];
  tables: TableDefinitionMap;
  relationships: Relationship[];
  coreferences: Coreferences;
  userImports: UserImport[];
}

//------------------------------------------------------------------------------

export async function generate(config: Config, db: Database): Promise<string> {
  const context = await compile(config, db);
  const backend = context.config.backend;
  return await render(context, backend);
}

const compile = async (config: Config, db: Database): Promise<BuildContext> => {
  //----------------------------------------------------------------------------
  // Database
  //----------------------------------------------------------------------------

  const schema = config.schema || (await db.getDefaultSchema());
  config.log("[db] Using schema", schema);

  const tableNames = config.tables || (await db.getTableNames(schema));
  config.log("[db] Fetched tableNames", tableNames);

  const enums = await db.getEnums(schema);
  validateEnums(config, enums);
  config.log("[db] Fetched enums", enums);

  const primaryKeys = await db.getPrimaryKeys(schema);
  config.log("[db] Fetched primaryKeys", primaryKeys);

  const foreignKeys = await db.getForeignKeys(schema);
  config.log("[db] Fetched foreignKeys", foreignKeys);

  const tableComments = await db.getTableComments(schema);
  config.log("[db] Fetched tableComments", tableComments);

  const columnComments = await db.getColumnComments(schema);
  config.log("[db] Fetched columnComments", columnComments);

  const tables = await Promise.all(
    tableNames.map((table) => db.getTable(schema, table))
  );
  config.log("[db] Fetched tables", tables);

  //----------------------------------------------------------------------------
  // Compilation
  //----------------------------------------------------------------------------

  const tablesWithMeta = mergeTableMeta(
    tables,
    tableComments,
    columnComments
  );
  validateTables(config, tablesWithMeta);
  config.log("[build] Transformed tablesWithMeta", tablesWithMeta);

  const userImports = getUserImports(config, tablesWithMeta);
  config.log("[build] Compiled userImports", userImports);

  const coreferences = buildCoreferences(config, tablesWithMeta);
  config.log("[build] Compiled coreferences", coreferences);

  const relationships = buildRelationships(config, tablesWithMeta, foreignKeys);
  config.log("[build] Compiled relationships", relationships);

  return {
    columnComments,
    config,
    coreferences,
    enums,
    foreignKeys,
    primaryKeys,
    relationships,
    schema,
    tableComments,
    userImports,
    tables: tablesWithMeta,
  };
};

const render = async (context: BuildContext, backend: Backend) => {
  validateCoreferences(context, backend);

  if (backend === "typescript") {
    return await typescriptOfSchema(context);
  }
  if (backend === "json") {
    return await jsonOfSchema(context);
  }
  if (backend === "typedb") {
    return await typedbOfSchema(context);
  }
  const backends = BACKENDS.join(", ");
  throw `Invalid backend: ${backend} must be one of: ${backends}`;
};
