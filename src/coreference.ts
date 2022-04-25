import { flatMap, fromPairs, keyBy, sortBy, toPairs, uniq } from 'lodash'

import type {
  ColumnName,
  ForeignKey,
  TableDefinition,
  TableName,
  UDTName,
} from './adapters/types'
import type { BuildContext } from './compiler'
import type { Config } from './config'
import { ENUM_DELIMITER } from './config'
import type { Relationship, RelationshipEdge, RelationshipNode } from './relationships'
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

export const build_coreferences = (
  _config: Config,
  tables: TableDefinition[],
  foreign_keys: ForeignKey[],
  relationships: Relationship[],
  nodes: RelationshipNode[],
  edges: RelationshipEdge[],
): Coreferences => {
  const all = attribute_overlap_grouping(
    tables,
    foreign_keys,
    relationships,
    nodes,
    edges,
  )

  return {
    all,
    user: {},
  }
}

function inferType<T>(types: UDTTypeMap<T>, udt_name: UDTName): T {
  return types[udt_name]
  // return types[udt_name] || udt_name
}

const find_table_column_type = (
  tables: TableDefinition[],
  table_name: TableName,
  columnName: ColumnName,
) => {
  const table_map = keyBy(tables, 'name')

  const table = table_map[table_name]
  const column = table.columns.find(({ name }) => name === columnName)
  return column?.udt_name
}

const find_edge_property_type = (
  edges: RelationshipEdge[],
  table_name: TableName,
  columnName: ColumnName,
) => {
  const edge_map = keyBy(edges, 'name')

  const edge = edge_map[table_name]
  const column = edge.properties.find(({ name }) => name === columnName)
  return column?.udt_name
}

const attribute_grouping_pairs = (table_list: TableDefinition[]) => {
  const table_column_names = uniq(
    flatMap(table_list.map(({ columns }) => columns.map(({ name }) => name))),
  )

  const pairs = table_column_names.map(columnName => {
    const tables = table_list.filter(({ columns }) =>
      columns.map(({ name }) => name).includes(columnName),
    )
    const table_names = tables.map(({ name }) =>
      [find_table_column_type(table_list, name, columnName), name].join(ENUM_DELIMITER),
    )
    return [columnName, table_names]
  })

  return sortBy(pairs, ([_key, values]) => values.length)
}

const property_grouping_pairs = (edges: RelationshipEdge[]) => {
  const edge_property_names = uniq(
    flatMap(edges.map(({ properties }) => properties.map(({ name }) => name))),
  )

  const pairs = edge_property_names.map(columnName => {
    const tables = edges.filter(({ properties }) =>
      properties.map(({ name }) => name).includes(columnName),
    )
    const table_names = tables.map(({ name }) =>
      [find_edge_property_type(edges, name, columnName), name].join(ENUM_DELIMITER),
    )
    return [columnName, table_names]
  })

  return sortBy(pairs, ([_key, values]) => values.length)
}

const attribute_overlap_grouping = (
  tables: TableDefinition[],
  _foreign_keys: ForeignKey[],
  _relationships: Relationship[],
  nodes: RelationshipNode[],
  edges: RelationshipEdge[],
): CoreferenceMap => {
  const grouping_pairs = [
    ...attribute_grouping_pairs(tables),
    ...attribute_grouping_pairs(nodes),
    ...property_grouping_pairs(edges),
  ]
  return fromPairs(grouping_pairs.filter(([_key, values]) => values.length > 1))
}

const invalid_overlaps = (overlaps: CoreferenceMap) => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([_key, values]) => values.length > 1)
      .filter(
        ([_key, values]) =>
          uniq(values.map(value => value.split(ENUM_DELIMITER)[0])).length > 1,
      ),
  )
}

const with_typedb_type = (value: string): string => {
  const [udt_name, table] = value.split(ENUM_DELIMITER)
  return [inferType<TypeDBType>(TYPEDB_TYPEMAP, udt_name), udt_name, table].join(
    ENUM_DELIMITER,
  )
}

const invalid_typedb_overlaps = (overlaps: CoreferenceMap): CoreferenceMap => {
  return fromPairs(
    toPairs(overlaps)
      .filter(([_key, values]) => values.length > 1)
      .map(([key, values]): [string, string[]] => [
        key,
        values.map(value => with_typedb_type(value)),
      ])
      .filter(
        ([_key, values]) =>
          uniq(values.map(value => value.split(ENUM_DELIMITER)[0])).length > 1,
      ),
  )
}

// const apply_config_to_coreference_map = ({ config, tables }: BuildContext) => {
//   const overlaps = attribute_overlap_grouping(tables)
//   const user_overlaps = omit(overlaps, config.ignoreAttributeCollisions)
//   if (config.ignoreAttributeCollisions.includes('*')) {
//     return {}
//   }
//   return user_overlaps
// }

export const cast_typedb_coreferences = ({
  coreferences: { all },
}: BuildContext): TypeDBCoreferences => {
  return {
    all,
    error: invalid_typedb_overlaps(all),
    warning: invalid_overlaps(all),
  }
}
