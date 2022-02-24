









import { keyBy } from "lodash";
import { Config } from "./config";
import { jsonEq } from "./utils";
import {
  ColumnName,
  TableComment,
  ColumnComment,
  TableDefinition,
  TableDefinitionMap,
  TableName,
  EnumDefinition,
} from "./adapters/types";





export const validateTables = (config: Config, tables: TableDefinitionMap) : void => {

}

export const validateTableNames = (
  config: Config,
  tableNames: TableName[]
): void => {
  if (tableNames.length === 0) {
    console.error(`[tableNames] Missing schema: ${config.schema}`);
  }
};

const assertValidEnum = (
  enumMap: Record<string, string[]>,
  { name, values }: EnumDefinition,
  column: ColumnName
) => {
  if (enumMap[name] && jsonEq(enumMap[name], values)) {
    throw new Error(
      `Multiple enums with the same name and contradicting types were found: ${column}: ${JSON.stringify(
        enumMap[name]
      )} and ${JSON.stringify(values)}`
    );
  }
};

export const validateEnums = (
  config: Config,
  enums: EnumDefinition[]
): void => {
  // const groups = groupBy(enums, 'name')
  // Object.values(groups).map(list => {
  //   if(list.length !== 1) {
  //   }
  // })
  // let enumMap: Record<string, string[]> = {};
  // enums.map(
  //   (record): EnumDefinition => {
  //     assertValidEnum(enumMap, record, column);
  //     enumMap[name] = values;
  //     return record;
  //   }
  // );
};
