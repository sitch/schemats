/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { groupBy, trimEnd, trimStart } from 'lodash'

import type { ColumnDefinition, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { Config } from '../config'
import { build_coreferences } from '../coreference'
import type {
  Neo4jReflection,
  Neo4jReflectionEdge,
  Neo4jReflectionNameSymbol,
  Neo4jReflectionNode,
  Neo4jReflectionProperty,
} from '../lang/neo4j'
import type { RelationshipEdge, RelationshipEdgeName } from '../relationships'

const TYPEMAP: Record<string, string> = {
  String: 'string',
  Long: 'long',
  LocalDateTime: 'DateTime',
  StringArray: 'string',
}

const cast_node_name = (typeId: Neo4jReflectionNameSymbol): string =>
  trimEnd(trimStart(typeId, ':`'), '`')

const cast_edge_name = (type: string): RelationshipEdgeName => type

function cast_udt_name([type, ...types]: string[]) {
  if (types.length > 0) {
    console.warn([type, ...types])
  }
  return TYPEMAP[type]!
}

function cast_property({
  name,
  types,
  mandatory,
}: Neo4jReflectionProperty): ColumnDefinition {
  return {
    name,
    udt_name: cast_udt_name(types),
    is_nullable: !mandatory,
    has_default: false,
    default_value: undefined,
    is_array: types[0] === 'StringArray',
  }
}

function cast_table({
  typeId,
  properties,
}: // relationships,
// labels,
Neo4jReflectionNode) {
  return {
    name: cast_node_name(typeId),
    columns: properties.map(property => cast_property(property)),
  }
}

function cast_edge_list(table_map: Record<string, TableDefinition[]>) {
  return ({ type, paths, properties }: Neo4jReflectionEdge) => {
    return paths.map(
      ({ fromTypeId, toTypeId }): RelationshipEdge => ({
        name: cast_edge_name(type),
        domain: table_map[cast_node_name(fromTypeId)]![0]!,
        codomain: table_map[cast_node_name(toTypeId)]![0]!,
        properties: properties.map(property => cast_property(property)),
      }),
    )
  }
}
//##############################################################################

export function build_context(
  config: Config,
  { nodes, relationships }: Neo4jReflection,
): BuildContext {
  const tables = Object.values(nodes).map(node => cast_table(node))
  const table_map = groupBy(tables, 'name')
  const edges = Object.values(relationships).flatMap(cast_edge_list(table_map))

  return {
    schema: config.schema,
    config,
    user_imports: [],
    primary_keys: [],
    foreign_keys: [],
    table_comments: [],
    column_comments: [],
    enums: [],
    relationships: [],
    tables,
    edges,
    nodes: tables,
    coreferences: build_coreferences(config, tables),
  }
}

//##############################################################################
