import { get, keyBy, groupBy, isEmpty } from "lodash";
import {
  TableComment,
  ColumnComment,
  ColumnDefinition,
  TableDefinition,
  TableDefinitionMap,
} from "./adapters/types";

const mergeColumnComment = (
  column: ColumnDefinition,
  columnComment: ColumnComment | undefined
): ColumnDefinition => {
  const comment = get(columnComment, "comment");
  return isEmpty(comment) ? column : { ...column, comment };
};

const mergeTableComment = (
  table: TableDefinition,
  tableComment: TableComment | undefined
): TableDefinition => {
  const comment = get(tableComment, "comment");
  return isEmpty(comment) ? table : { ...table, comment };
};

const mergeTableColumnComments = (
  table: TableDefinition,
  columnComments: ColumnComment[]
): TableDefinition => {
  const commentMap = keyBy(columnComments, "column");
  const columns = Object.values(table.columns).map((column) =>
    mergeColumnComment(column, get(commentMap, column.name))
  );
  return { ...table, columns: keyBy(columns, "name") };
};

export const mergeTableComments = (
  table: TableDefinition,
  tableComment: TableComment | undefined,
  columnComments: ColumnComment[]
): TableDefinition => {
  return mergeTableColumnComments(
    mergeTableComment(table, tableComment),
    columnComments
  );
};

export const mergeTableMeta = (
  tableDefinitions: TableDefinition[],
  tableComments: TableComment[],
  columnComments: ColumnComment[]
): TableDefinitionMap => {
  const tableCommentsMap = keyBy(tableComments, "table");
  const columnCommentsMap = groupBy(columnComments, "table");

  const tables = tableDefinitions.map((table) =>
    mergeTableComments(
      table,
      get(tableCommentsMap, table.name),
      get(columnCommentsMap, table.name, [])
    )
  );
  return keyBy(tables, "name");
};
