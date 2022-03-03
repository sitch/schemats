import { get, groupBy, isEmpty, keyBy } from 'lodash'

import {
  ColumnComment,
  ColumnDefinition,
  ForeignKey,
  PrimaryKey,
  TableComment,
  TableDefinition,
} from './adapters/types'

const mergeColumnComment = (
  column: ColumnDefinition,
  columnComment: ColumnComment | undefined,
): ColumnDefinition => {
  const comment = get(columnComment, 'comment')
  return isEmpty(comment) ? column : { ...column, comment }
}

const mergeTableComment = (
  table: TableDefinition,
  tableComment: TableComment | undefined,
): TableDefinition => {
  const comment = get(tableComment, 'comment')
  return isEmpty(comment) ? table : { ...table, comment }
}

const mergeTableColumnComments = (
  table: TableDefinition,
  columnComments: ColumnComment[],
): TableDefinition => {
  const commentMap = keyBy(columnComments, 'column')
  const columns = table.columns.map(column => {
    const comment = get(commentMap, column.name)
    return mergeColumnComment(column, comment)
  })
  return { ...table, columns }
}

export const mergeTableComments = (
  table: TableDefinition,
  tableComment: TableComment | undefined,
  columnComments: ColumnComment[],
): TableDefinition => {
  const tableWithComment = mergeTableComment(table, tableComment)
  return mergeTableColumnComments(tableWithComment, columnComments)
}

export const mergeTableKeys = (
  tables: TableDefinition[],
  primaryKeys: PrimaryKey[],
  foreignKeys: ForeignKey[],
): TableDefinition[] => {
  const primaryKeyMap = groupBy(primaryKeys, 'table')
  const foreignKeyMap = groupBy(foreignKeys, 'primaryTable')

  return tables.map(table => {
    const primaryKeys = get(primaryKeyMap, table.name, [])
    const foreignKeys = get(foreignKeyMap, table.name, [])
    return { ...table, primaryKeys, foreignKeys }
  })
}

export const mergeTableMeta = (
  tables: TableDefinition[],
  tableComments: TableComment[],
  columnComments: ColumnComment[],
  primaryKeys: PrimaryKey[],
  foreignKeys: ForeignKey[],
): TableDefinition[] => {
  const tableCommentsMap = keyBy(tableComments, 'table')
  const columnCommentsMap = groupBy(columnComments, 'table')

  const tablesWithComments = tables.map(table => {
    const comment = get(tableCommentsMap, table.name)
    const columnComments = get(columnCommentsMap, table.name, [])
    return mergeTableComments(table, comment, columnComments)
  })
  return mergeTableKeys(tablesWithComments, primaryKeys, foreignKeys)
}
