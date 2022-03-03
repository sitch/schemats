import { flatMap, fromPairs, keyBy, omit, sortBy, toPairs, uniq } from 'lodash'

import { ColumnName, TableDefinition, TableName, UDTName } from './adapters/types'
import { BuildContext } from './compiler'
import { Config, ENUM_DELIMITER } from './config'
import { TYPEDB_TYPEMAP, TypeDBType } from './typemaps/typedb-typemap'

//------------------------------------------------------------------------------

export type UDTTypeMap<T> = Record<UDTName, T>

//------------------------------------------------------------------------------

export type CoreferenceType = string
export type CoreferenceMap = Record<ColumnName, CoreferenceType[]>

export interface Coreferences {
  all: CoreferenceMap
  user: CoreferenceMap
}

//------------------------------------------------------------------------------

export interface TypeDBCoreferences {
  all: CoreferenceMap
  error: CoreferenceMap
  warning: CoreferenceMap
}

//------------------------------------------------------------------------------

export const buildCoreferences = (
  _config: Config,
  tables: TableDefinition[],
): Coreferences => {
  const all = attributeOverlapGrouping(tables)

  return {
    all,
    user: {},
  }
}

function inferType<T>(types: UDTTypeMap<T>, udtName: UDTName): T {
  return types[udtName]
  // return types[udtName] || udtName
}

export const applyConfigToCoreferenceMap = ({ config, tables }: BuildContext) => {
  const overlaps = attributeOverlapGrouping(tables)
  const userOverlaps = omit(overlaps, config.ignoreFieldCollisions)
  if (config.ignoreFieldCollisions.includes('*')) {
    return {}
  }
  return userOverlaps
}

export const findTableColumnType = (
  tables: TableDefinition[],
  tableName: TableName,
  columnName: ColumnName,
) => {
  const tableMap = keyBy(tables, 'name')

  const table = tableMap[tableName]
  const column = table.columns.find(({ name }) => name === columnName)
  return column?.udtName
}

export const attributeGroupingPairs = (tableList: TableDefinition[]) => {
  const tableColumnNames = uniq(
    flatMap(tableList.map(({ columns }) => columns.map(({ name }) => name))),
  )

  const pairs = tableColumnNames.map(columnName => {
    const tables = tableList.filter(({ columns }) =>
      columns.map(({ name }) => name).includes(columnName),
    )
    const tableNames = tables.map(({ name }) =>
      [findTableColumnType(tableList, name, columnName), name].join(ENUM_DELIMITER),
    )
    return [columnName, tableNames]
  })

  return sortBy(pairs, ([_key, values]) => values.length)
}

export const attributeOverlapGrouping = (tables: TableDefinition[]): CoreferenceMap => {
  const groupingPairs = attributeGroupingPairs(tables)
  return fromPairs(groupingPairs.filter(([_key, values]) => values.length > 1))
}

export const invalidOverlaps = (overlaps: CoreferenceMap) => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([_key, values]) => values.length > 1)
      .filter(
        ([_key, values]) =>
          uniq(values.map(value => value.split(ENUM_DELIMITER)[0])).length > 1,
      ),
  )
}

const withTypeDBType = (value: string): string => {
  const [udtName, table] = value.split(ENUM_DELIMITER)
  return [inferType<TypeDBType>(TYPEDB_TYPEMAP, udtName), udtName, table].join(
    ENUM_DELIMITER,
  )
}

export const invalidTypeDBOverlaps = (overlaps: CoreferenceMap): CoreferenceMap => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([_key, values]) => values.length > 1)
      .map(([key, values]): [string, string[]] => [
        key,
        values.map(value => withTypeDBType(value)),
      ])
      .filter(
        ([_key, values]) =>
          uniq(values.map(value => value.split(ENUM_DELIMITER)[0])).length > 1,
      ),
  )
}

export const castTypeDBCoreferences = ({
  coreferences: { all },
}: BuildContext): TypeDBCoreferences => {
  return {
    all,
    error: invalidTypeDBOverlaps(all),
    warning: invalidOverlaps(all),
  }
}
