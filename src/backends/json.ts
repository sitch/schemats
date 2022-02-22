import { Config } from "../config";
import { Database } from "../schema-interfaces";
import { attributeOverlapGrouping } from "./typedb";
import {
  EnumDefinitions,
  TableDefinitions,
  CustomTypes,
} from "../schema-interfaces";

export const jsonOfSchema = async (
  config: Config,
  db: Database,
  schema: string,
  tableDefinitions: TableDefinitions,
  enumDefinitions: EnumDefinitions,
  customTypes: CustomTypes
) => {
  const data = {
    generated_on: new Date(),
    version: config.version,
    schema,
    enums: enumDefinitions,
    tables: tableDefinitions,
    relationships: [],
    overlaps: attributeOverlapGrouping(tableDefinitions),
    ignoreFieldCollisions: config.ignoreFieldCollisions,
  };

  return JSON.stringify(data, null, 2);
};
