import { Config } from "./config";
import { flatMap, fromPairs, toPairs, uniq, sortBy, omit, size } from "lodash";
import {
  BuildContext,
  EnumDefinition,
  TableDefinition,
  ColumnDefinition,
  EnumDefinitions,
  DBTypeMap,
  TableDefinitions,
  CustomType,
  CustomTypes,
  Coreferences,
} from "./adapters/types";

import { TYPEDB_TYPEMAP } from "./typemaps/typedb-typemap";

export const getCoreferences = (
  config: Config,
  tables: TableDefinitions
): Coreferences => {
  return {
    all: {},
    user: {},
  };
};

const inferType = (types: DBTypeMap, udtName: string): string =>
  types[udtName] || udtName;

export const applyConfigToCoreference = ({ config, tables }: BuildContext) => {
  const overlaps = attributeOverlapGrouping(tables);
  const userOverlaps = omit(overlaps, config.ignoreFieldCollisions);
  if (config.ignoreFieldCollisions.includes("*")) {
    return {};
  }
  return userOverlaps;
};

export const findTableColumnType = (
  tableDefinitions: TableDefinitions,
  tableName: string,
  columnName: string
) => {
  // const table = tableDefinitions.find(({ name }) => name === tableName);
  const table = tableDefinitions[tableName];
  const column = Object.values(table?.columns).find(
    ({ name }) => name === columnName
  );
  return column?.udtName;
};

export const attributeGroupingPairs = (tableDefinitions: TableDefinitions) => {
  const tableList = Object.values(tableDefinitions);

  const tableColumnNames = uniq(
    flatMap(
      tableList.map(({ columns }) =>
        Object.values(columns).map(({ name }) => name)
      )
    )
  );

  const pairs = tableColumnNames.map((columnName) => {
    const tables = tableList.filter(({ columns }) =>
      Object.values(columns)
        .map(({ name }) => name)
        .includes(columnName)
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
