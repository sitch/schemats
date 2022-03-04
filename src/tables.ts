import { get, groupBy, isEmpty, keyBy } from 'lodash'

import {
  ColumnComment,
  ColumnDefinition,
  ForeignKey,
  PrimaryKey,
  TableComment,
  TableDefinition,
} from './adapters/types'

const merge_column_comment = (
  column: ColumnDefinition,
  column_comment: ColumnComment | undefined,
): ColumnDefinition => {
  const comment = get(column_comment, 'comment')
  return isEmpty(comment) ? column : { ...column, comment }
}

const merge_table_comment = (
  table: TableDefinition,
  table_comment: TableComment | undefined,
): TableDefinition => {
  const comment = get(table_comment, 'comment')
  return isEmpty(comment) ? table : { ...table, comment }
}

const merge_table_column_comments = (
  table: TableDefinition,
  column_comments: ColumnComment[],
): TableDefinition => {
  const comment_map = keyBy(column_comments, 'column')
  const columns = table.columns.map(column => {
    const comment = get(comment_map, column.name)
    return merge_column_comment(column, comment)
  })
  return { ...table, columns }
}

const merge_table_comments = (
  table: TableDefinition,
  table_comment: TableComment | undefined,
  column_comments: ColumnComment[],
): TableDefinition => {
  const table_with_comment = merge_table_comment(table, table_comment)
  return merge_table_column_comments(table_with_comment, column_comments)
}

const merge_table_keys = (
  tables: TableDefinition[],
  primary_keys: PrimaryKey[],
  foreign_keys: ForeignKey[],
): TableDefinition[] => {
  const primary_key_map = groupBy(primary_keys, 'table')
  const foreign_key_map = groupBy(foreign_keys, 'primary_table')

  return tables.map(table => {
    const primary_keys = get(primary_key_map, table.name, [])
    const foreign_keys = get(foreign_key_map, table.name, [])
    return { ...table, primary_keys, foreign_keys }
  })
}

export const merge_table_meta = (
  tables: TableDefinition[],
  table_comments: TableComment[],
  column_comments: ColumnComment[],
  primary_keys: PrimaryKey[],
  foreign_keys: ForeignKey[],
): TableDefinition[] => {
  const table_comments_map = keyBy(table_comments, 'table')
  const column_comments_map = groupBy(column_comments, 'table')

  const tables_with_comments = tables.map(table => {
    const comment = get(table_comments_map, table.name)
    const column_comments = get(column_comments_map, table.name, [])
    return merge_table_comments(table, comment, column_comments)
  })
  return merge_table_keys(tables_with_comments, primary_keys, foreign_keys)
}
