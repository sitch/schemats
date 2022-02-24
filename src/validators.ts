import { difference, size, uniqWith } from "lodash";
import { Backend, Config } from "./config";
import { BuildContext } from "./generator";
import { pretty } from "./formatters";
import { jsonEq } from "./utils";
import { EnumDefinition, TableDefinitionMap } from "./adapters/types";

const enumEq = (left: EnumDefinition, right: EnumDefinition): boolean => {
  if (
    left.table !== right.table ||
    left.column !== right.column ||
    left.name !== right.name
  ) {
    return false;
  }
  return jsonEq(left.values, right.values);
};

export const validateEnums = (
  config: Config,
  enums: EnumDefinition[]
): boolean => {
  const enumsUniq = uniqWith(enums, enumEq);
  const enumsCollision = difference(enums, enumsUniq);

  if (enumsCollision.length > 0) {
    console.error("Enum collisions found: ", pretty(enumsCollision));
    return false;
  }
  return true;
};

export const validateTables = (
  config: Config,
  tables: TableDefinitionMap
): boolean => {
  if (size(tables) <= 0) {
    console.error(`[tableNames] No tables found: ${config.schema}`);
    return false;
  }
  return true;
};

export const validateCoreferences = (
  context: BuildContext,
  backend: Backend
): boolean => {
  return true;
};
