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

// const mergeComments = (tables: TableDefinitionMap, tableComments: TableComments) : TableDefinitionMap {
//   tables.map(table => {
//     const comments = tableComments[table.name]
//   })
// }

export const mergeTableComments = (
  tables: TableDefinition[],
  tableComments: TableComment[],
  columnComments: ColumnComment[]
): TableDefinitionMap => {
  let tablesWithMeta = keyBy(tables, "name");
  // let comments = keyBy(
  //   tableComments.filter(({ columns }) => size(columns) > 0),
  //   "table"
  // );
  // let comments = keyBy(
  //   tableComments.filter(({ columns }) => size(columns) > 0),
  //   "table"
  // );

  // // comments.reduce((tables, {table, columns}) => {
  // //   tables[table]

  // // })

  // return { tables, comments };

  return tablesWithMeta;
};
