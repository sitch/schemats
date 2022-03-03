import { jsonOfSchema } from "./backends/json";
import { juliaOfSchema } from "./backends/julia";
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
  TableDefinition,
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
  tables: TableDefinition[];
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

  const tableList = await Promise.all(
    tableNames.map((table) => db.getTable(schema, table))
  );
  config.log("[db] Fetched tables", tableList);

  //----------------------------------------------------------------------------
  // Compilation
  //----------------------------------------------------------------------------

  const tables = mergeTableMeta(
    tableList,
    tableComments,
    columnComments,
    primaryKeys,
    foreignKeys
  );
  validateTables(config, tables);
  config.log("[build] Transformed tables", tables);

  const userImports = getUserImports(config, tables);
  config.log("[build] Compiled userImports", userImports);

  const coreferences = buildCoreferences(config, tables);
  config.log("[build] Compiled coreferences", coreferences);

  const relationships = buildRelationships(config, tables);
  config.log("[build] Compiled relationships", relationships);

  return {
    schema,
    config,
    coreferences,
    enums: enums.sort(),
    tables: tables.sort(),
    userImports: userImports.sort(),
    foreignKeys: foreignKeys.sort(),
    primaryKeys: primaryKeys.sort(),
    relationships: relationships.sort(),
    tableComments: tableComments.sort(),
    columnComments: columnComments.sort(),
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
  if (backend === "julia") {
    return await juliaOfSchema(context);
  }
  const backends = BACKENDS.join(", ");
  throw `Invalid backend: ${backend} must be one of: ${backends}`;
};
