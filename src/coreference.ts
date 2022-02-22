


import { Config } from "./config";
import { flatMap, fromPairs, toPairs, uniq, sortBy, omit, size } from "lodash";
import {
  EnumDefinition,
  TableDefinition,
  ColumnDefinition,
  EnumDefinitions,
  DBTypeMap,
  TableDefinitions,
  CustomType,
  CustomTypes,
} from "./schema-interfaces";



import { TYPEDB_TYPEMAP } from "./backends/typedb/typemap";




const inferType = (types: DBTypeMap, udtName: string): string => types[udtName] || udtName;


export const applyConfigToCoreference = (config: Config, tableDefinitions: TableDefinitions) => {
  const overlaps = attributeOverlapGrouping(tableDefinitions);
  const userOverlaps = omit(overlaps, config.ignoreFieldCollisions);
  if (config.ignoreFieldCollisions.includes("*")) {
    return {}
  }
    return userOverlaps
}

export const findTableColumnType = (
  tableDefinitions: TableDefinitions,
  tableName: string,
  columnName: string
) => {
  const table = tableDefinitions.find(({ name }) => name === tableName);
  const column = table?.columns.find(({ name }) => name === columnName);
  return column?.udtName;
};

export const attributeGroupingPairs = (tableDefinitions: TableDefinitions) => {
  const tableColumnNames = uniq(
    flatMap(
      tableDefinitions.map(({ columns }) => columns.map(({ name }) => name))
    )
  );

  const pairs = tableColumnNames.map((columnName) => {
    const tables = tableDefinitions.filter(({ columns }) =>
      columns.map(({ name }) => name).includes(columnName)
    );
    const tableNames = tables.map(({ name }) =>
      [findTableColumnType(tableDefinitions, name, columnName), name].join("::")
    );
    return [columnName, tableNames.sort()];
  });

  return sortBy(pairs, ([key, values]) => values.length);
};

export const attributeOverlapGrouping = (
  tableDefinitions: TableDefinitions
) => {
  const groupingPairs = attributeGroupingPairs(tableDefinitions);
  return fromPairs(groupingPairs.filter(([key, values]) => values.length > 1));
};

export const invalidOverlaps = (overlaps: Record<string, string[]>) => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([key, values]) => values.length > 1)
      .filter(
        ([key, values]) =>
          uniq(values.map((value) => value.split("::")[0])).length > 1
      )
  );
};

const withTypeDBType = (value: string): string => {

  const [udtName, table] = value.split("::");
  return [inferType(TYPEDB_TYPEMAP, udtName), udtName, table].join("::");
};

export const invalidTypeDBOverlaps = (overlaps: Record<string, string[]>) => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([key, values]) => values.length > 1)
      .map(([key, values]): [string, string[]] => [
        key,
        values.map(withTypeDBType),
      ])
      .filter(
        ([key, values]) =>
          uniq(values.map((value) => value.split("::")[0])).length > 1
      )
  );
};



    // const overlaps = attributeOverlapGrouping(tableDefinitions)
    // ignoreFieldCollisions: config.ignoreFieldCollisions,
    // overlaps,
    // invalidOverlaps: invalidOverlaps(overlaps),
    // invalidTypeDBOverlaps: invalidTypeDBOverlaps(overlaps),


      // assertUniqEntities(config, tableDefinitions)
  // assertUniqAttributesAndTypes( config, overlaps)
