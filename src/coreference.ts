import { Config, ENUM_DELIMITER } from "./config";
import { BuildContext } from "./compiler";
import { flatMap, fromPairs, toPairs, uniq, sortBy, omit, keyBy } from "lodash";
import {
  TableDefinition,
  ColumnName,
  TableName,
  UDTName,
} from "./adapters/types";

import { TYPEDB_TYPEMAP } from "./typemaps/typedb-typemap";

//------------------------------------------------------------------------------

export type UDTTypeMap = Record<string, string>;

//------------------------------------------------------------------------------

export type CoreferenceType = string;
export type CoreferenceMap = Record<ColumnName, CoreferenceType[]>;

export interface Coreferences {
  all: CoreferenceMap;
  user: CoreferenceMap;
}

//------------------------------------------------------------------------------

export interface TypeDBCoreferences {
  all: CoreferenceMap;
  error: CoreferenceMap;
  warning: CoreferenceMap;
}

//------------------------------------------------------------------------------

export const buildCoreferences = (
  { ignoreFieldCollisions }: Config,
  tables: TableDefinition[]
): Coreferences => {
  const all = attributeOverlapGrouping(tables);

  return {
    all,
    user: {},
  };
};

const inferType = (types: UDTTypeMap, udtName: UDTName): string =>
  types[udtName] || udtName;

export const applyConfigToCoreferenceMap = ({
  config,
  tables,
}: BuildContext) => {
  const overlaps = attributeOverlapGrouping(tables);
  const userOverlaps = omit(overlaps, config.ignoreFieldCollisions);
  if (config.ignoreFieldCollisions.includes("*")) {
    return {};
  }
  return userOverlaps;
};

export const findTableColumnType = (
  tables: TableDefinition[],
  tableName: TableName,
  columnName: ColumnName
) => {
  const tableMap = keyBy(tables, "name");

  const table = tableMap[tableName];
  const column = (table?.columns).find(({ name }) => name === columnName);
  return column?.udtName;
};

export const attributeGroupingPairs = (tableList: TableDefinition[]) => {
  const tableColumnNames = uniq(
    flatMap(tableList.map(({ columns }) => columns.map(({ name }) => name)))
  );

  const pairs = tableColumnNames.map((columnName) => {
    const tables = tableList.filter(({ columns }) =>
      columns.map(({ name }) => name).includes(columnName)
    );
    const tableNames = tables.map(({ name }) =>
      [findTableColumnType(tableList, name, columnName), name].join(
        ENUM_DELIMITER
      )
    );
    return [columnName, tableNames.sort()];
  });

  return sortBy(pairs, ([key, values]) => values.length);
};

export const attributeOverlapGrouping = (
  tables: TableDefinition[]
): CoreferenceMap => {
  const groupingPairs = attributeGroupingPairs(tables);
  return fromPairs(groupingPairs.filter(([key, values]) => values.length > 1));
};

export const invalidOverlaps = (overlaps: CoreferenceMap) => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([key, values]) => values.length > 1)
      .filter(
        ([key, values]) =>
          uniq(values.map((value) => value.split(ENUM_DELIMITER)[0])).length > 1
      )
  );
};

const withTypeDBType = (value: string): string => {
  const [udtName, table] = value.split(ENUM_DELIMITER);
  return [inferType(TYPEDB_TYPEMAP, udtName), udtName, table].join(
    ENUM_DELIMITER
  );
};

export const invalidTypeDBOverlaps = (
  overlaps: CoreferenceMap
): CoreferenceMap => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([key, values]) => values.length > 1)
      .map(([key, values]): [string, string[]] => [
        key,
        values.map(withTypeDBType),
      ])
      .filter(
        ([key, values]) =>
          uniq(values.map((value) => value.split(ENUM_DELIMITER)[0])).length > 1
      )
  );
};

export const castTypeDBCoreferences = ({
  coreferences: { all },
}: BuildContext): TypeDBCoreferences => {
  return {
    all,
    error: invalidTypeDBOverlaps(all),
    warning: invalidOverlaps(all),
  };
};
