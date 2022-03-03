import { identity, flatMap, size, groupBy, get } from "lodash";
import { Config } from "../config";
import { banner, commentLines, padWith, pretty } from "../formatters";
import { BuildContext } from "../compiler";
import { TypeDBCoreferences, castTypeDBCoreferences } from "../coreference";
import {
  castJuliaType,
  translateType,
  isReservedWord,
} from "../typemaps/julia-typemap";
import {
  ColumnDefinition,
  ForeignKey,
  TableDefinition,
} from "../adapters/types";

//------------------------------------------------------------------------------

const padField = padWith("  ");

const normalizeName = (name: string): string => {
  return name;
  // return isReservedWord(name) ? `${name}_` : name;
};

const prefix = (config: Config): string => {
  // return config.database.toLowerCase();
  return "";
};

//------------------------------------------------------------------------------

const castHeader = ({ config }: BuildContext): string => `
################################################################################
#
# AUTO-GENERATED FILE @ ${config.timestamp} - DO NOT EDIT!
#
# This file was automatically generated by schemats v.${config.version}
# $ ${config.commandFromCLI}
#
################################################################################
`;

//------------------------------------------------------------------------------

export const pragma = (context: BuildContext): string => `
Optional{T} = Union{Nothing,T}
`;

//------------------------------------------------------------------------------

const castCoreferenceMapHeader = ({
  all,
  error,
  warning,
}: TypeDBCoreferences) => `
################################################################################
# ⛔ CRITICAL ⛔ - (${size(error)}) - TypeDB Attribute Conflicts
################################################################################
${commentLines("#", pretty(error))}
#===============================================================================
# ⚠️ WARNING ⚠️ - (${size(warning)}) - UDT Conflicts
#===============================================================================
${commentLines("#", pretty(warning))}
#-------------------------------------------------------------------------------
# ❎ INFO ❎ - (${size(all)}) - TypeDB Attribute Overlaps
#-------------------------------------------------------------------------------
${commentLines("#", pretty(all))}
################################################################################
`;

//------------------------------------------------------------------------------

const Attribute = {
  comment: (context: BuildContext, column: ColumnDefinition): string => {
    return "";
  },
  name: ({ config }: BuildContext, { name }: ColumnDefinition): string => {
    return normalizeName(config.formatAttributeName(name));
  },
  type: (context: BuildContext, column: ColumnDefinition): string => {
    // return castJuliaType(context, column);
    return translateType(context, column);
  },
};

const Entity = {
  comment: (context: BuildContext, table: TableDefinition): string => {
    return "";
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalizeName(config.formatEntityName(name));
  },
};

const Relation = {
  comment: (
    { config }: BuildContext,
    {
      primaryTable,
      primaryColumn,
      foreignTable,
      foreignColumn,
      constraint,
    }: ForeignKey
  ): string => {
    return [
      constraint ? [`# Constraint: ${constraint}`] : [],
      [
        `# Relation: ${primaryTable}.${primaryColumn} => ${foreignTable}.${foreignColumn}`,
      ],
    ]
      .flat()
      .join("\n");
  },
  name: ({ config }: BuildContext, { primaryColumn }: ForeignKey): string => {
    // TODO: improve global suffix handling
    const relation = primaryColumn.replace(/_id$/, "").replace(/_?I(d|D)$/, "");
    return normalizeName(config.formatRelationName(relation));
  },
  type: (context: BuildContext, foreignKey: ForeignKey): string => {
    const column = { name: foreignKey.foreignTable, columns: [] };
    const name = Entity.name(context, column);
    return `Optional{${name}}`;
  },
};

//------------------------------------------------------------------------------

const castField =
  (context: BuildContext) =>
  (column: ColumnDefinition): string => {
    const name = Attribute.name(context, column);
    const type = Attribute.type(context, column);
    const comment = Attribute.comment(context, column);

    const line = `${name}::${type}`;
    return [comment, line].filter(identity).join("\n");
  };

//------------------------------------------------------------------------------

const castEntity = (context: BuildContext) => {
  const relationsMap = groupBy(context.foreignKeys, "primaryTable");

  return (record: TableDefinition) => {
    const name = Entity.name(context, record);
    const comment = Entity.comment(context, record);

    const foreignKeys = get(relationsMap, record.name, []);

    const fields = record.columns.map(castField(context));
    const relations = foreignKeys.map(castRelation(context));

    return [
      comment,
      `mutable struct ${name} {`,
      ...["iid:DbId", ...fields.sort(), ...relations.sort()].map(padField),
      "}",
    ]
      .filter(identity)
      .join("\n");
  };
};

//------------------------------------------------------------------------------

const castRelation = (context: BuildContext) => (record: ForeignKey) => {
  const name = Relation.name(context, record);
  const type = Relation.type(context, record);
  const comment = Relation.comment(context, record);

  const line = `${name}::${type}`;
  return [comment, line].filter(identity).join("\n");
};

//------------------------------------------------------------------------------

export const juliaOfSchema = async (context: BuildContext) => {
  const tables = context.tables;
  const foreignKeys = context.foreignKeys.flat();
  const entities = flatMap(tables, castEntity(context));
  // const relationships = flatMap(foreignKeys, castRelation(context));
  const typeDBCoreferences = castTypeDBCoreferences(context);

  return [
    context.config.writeHeader ? [castHeader(context)] : [],
    [pragma(context)],

    // size(typeDBCoreferences.all) > 0
    //   ? [castCoreferenceMapHeader(typeDBCoreferences)]
    //   : [],
    [banner("#", `Entities (${size(tables)})`)],
    size(foreignKeys) > 0
      ? [banner("#", `Relations (${size(foreignKeys)})`)]
      : [],
    [entities.join("\n\n")],
  ]
    .flat()
    .filter(identity)
    .join("\n");
};
