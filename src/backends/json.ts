import { Config } from "../config";
import { Database } from "../schema-interfaces";
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
    version: config.version,
    schema,
    enums: enumDefinitions,
    tables: tableDefinitions,
    relationships: [],
  };

  return JSON.stringify(data, null, 2);
};
