import { Config, ENUM_DELIMITER } from "./config";
import { BuildContext } from "./generator";
import { flatMap, fromPairs, toPairs, uniq, sortBy, omit } from "lodash";
import {
  TableDefinitionMap,
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

// assertUniqEntities(config, tableDefinitions)
// assertUniqAttributesAndTypes( config, overlaps)

// const userOverlaps = applyConfigToCoreferenceMap(context);

export const buildCoreferences = (
  { ignoreFieldCollisions }: Config,
  tables: TableDefinitionMap
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
  tableDefinitions: TableDefinitionMap,
  tableName: TableName,
  columnName: ColumnName
) => {
  // const table = tableDefinitions.find(({ name }) => name === tableName);
  const table = tableDefinitions[tableName];
  const column = Object.values(table?.columns).find(
    ({ name }) => name === columnName
  );
  return column?.udtName;
};

export const attributeGroupingPairs = (
  tableDefinitions: TableDefinitionMap
) => {
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
      [findTableColumnType(tableDefinitions, name, columnName), name].join(
        ENUM_DELIMITER
      )
    );
    return [columnName, tableNames.sort()];
  });

  return sortBy(pairs, ([key, values]) => values.length);
};

export const attributeOverlapGrouping = (
  tableDefinitions: TableDefinitionMap
): CoreferenceMap => {
  const groupingPairs = attributeGroupingPairs(tableDefinitions);
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
