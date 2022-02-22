import { Config } from "../config";
import { Database } from "../schema-interfaces";
import { attributeOverlapGrouping, invalidOverlaps, invalidTypeDBOverlaps } from "./typedb";
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
  const overlaps = attributeOverlapGrouping(tableDefinitions)
  const data = {
    generated_on: new Date(),
    version: config.version,
    schema,
    invalidTypeDBOverlaps: invalidTypeDBOverlaps(overlaps),
    enums: enumDefinitions,
    tables: tableDefinitions,
    relationships: [],
    overlaps,
    invalidOverlaps: invalidOverlaps(overlaps),
    ignoreFieldCollisions: config.ignoreFieldCollisions,
  };

  return JSON.stringify(data, null, 2);
};
