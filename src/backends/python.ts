import { flatMap, size } from 'lodash'

import type {
  EdgeDefinition,
  EntityDefinition,
  ForeignKeyDefinition,
  PropertyDefinition,
} from '../adapters/types'
import type { BuildContext } from '../compiler'
import { build_type_qualified_coreferences } from '../coreference'
import { postprocess_context } from '../coreference-resolution'
import { code_section, lines, pad_lines } from '../formatters'
import { is_reserved_word, renderer_context } from '../lang/python'
import { cast_python_type } from '../typemaps/python-typemap'
import type { BackendContext } from './base'
import { coreference_banner, header } from './base'

//------------------------------------------------------------------------------

export const normalize_name = (name: string): string =>
  is_reserved_word(name) ? `${name}_` : name

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

function pragma(_context: BuildContext) {
  return lines(['from dataclasses import dataclass'])
}

//------------------------------------------------------------------------------

export const PythonAttribute = {
  comment: (_context: BuildContext, _property: PropertyDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: PropertyDefinition): string => {
    return normalize_name(config.formatAttributeName(name))
  },
  type: (context: BuildContext, property: PropertyDefinition): string => {
    return cast_python_type(context, property)
  },
}

export const PythonEntity = {
  comment: (_context: BuildContext, _entity: EntityDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: EntityDefinition): string => {
    return normalize_name(config.formatEntityName(name))
  },
  // type: (context: BuildContext, _table: EntityDefinition): string => {
  //   return `${prefix(context)}entity`
  // },
}

export const PythonRelation = {
  comment: (_context: BuildContext, _relation: ForeignKeyDefinition): string => {
    return ''
  },
  name: (
    { config }: BuildContext,
    { source_table, source_column, target_table, target_column }: ForeignKeyDefinition,
  ): string => {
    const table_source = config.formatRelationName(source_table)
    const attribute_source = config.formatRelationName(source_column)
    const table_destination = config.formatRelationName(target_table)
    const attribute_destination = config.formatRelationName(target_column)

    return normalize_name(
      [table_source, attribute_source, table_destination, attribute_destination]
        .map(
          name => config.formatRelationName(name),

          // name => inflect(name, 'pascal')
        )
        .join(','),
    )
  },
  // type: (context: BuildContext, _foreign_key: ForeignKeyDefinition): string => {
  //   return `${prefix(context)}relation`
  // },
}

export const PythonEdge = {
  comment: (_context: BuildContext, _edge: EdgeDefinition): string => {
    return ''
  },
  name: (
    { config }: BuildContext,
    { name, source, target }: EdgeDefinition,
  ): string => {
    const domain_name = config.formatRelationName(source.name)
    const codomain_name = config.formatRelationName(target.name)

    return normalize_name(
      [domain_name, name, codomain_name]
        .map(
          name => config.formatRelationName(name),

          // name => inflect(name, 'pascal')
        )
        .join(','),
    )
  },
  // type: (context: BuildContext, _foreign_key: EdgeDefinition): string => {
  //   return `${prefix(context)}relation`
  // },
}

//------------------------------------------------------------------------------

function cast_default_value(column: PropertyDefinition) {
  return (
    [column.default_value]
      .filter(Boolean)
      .map(String)
      .filter(name => !name.startsWith('nextval('))
      .map(name => (name === 'false' ? 'False' : name))
      .map(name => (name === 'true' ? 'True' : name))
      .map(name => ` = ${name}`)
      .shift() || ''
  )
}

const cast_field = (context: BuildContext) => (column: PropertyDefinition) => {
  const name = PythonAttribute.name(context, column)
  const type = PythonAttribute.type(context, column)
  const comment = PythonAttribute.comment(context, column)

  const line = `${name}: ${type}${cast_default_value(column)}`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

const cast_entity =
  (context: BuildContext, _backend: BackendContext) => (record: EntityDefinition) => {
    const name = PythonEntity.name(context, record)
    const comment = PythonEntity.comment(context, record)

    return lines([
      comment,
      '@dataclass',
      `class ${name}:`,
      pad_lines(
        lines(record.columns.map(cast_field(context))),
        renderer_context.indent,
      ),
    ])
  }

//------------------------------------------------------------------------------

const cast_entity_relation =
  (context: BuildContext, _backend: BackendContext) => (record: EntityDefinition) => {
    const type = PythonEntity.name(context, record)
    const comment = PythonEntity.comment(context, record)

    return lines([
      comment,
      `${normalize_name(context.config.formatAttributeName(record.name))}: ${type}`,
    ])
  }

//------------------------------------------------------------------------------

const cast_relation =
  (context: BuildContext, _backend: BackendContext) =>
  (record: ForeignKeyDefinition) => {
    const { source_table, source_column, target_table, target_column } = record

    const name = PythonRelation.name(context, record)
    const comment = PythonRelation.comment(context, record)

    return lines([
      comment,
      '@dataclass',
      `class ${name}:`,
      pad_lines(
        lines([
          `${source_column}: ${source_table}`,
          `${target_column}: ${target_table}`,
        ]),

        renderer_context.indent,
      ),
    ])
  }

const cast_edge =
  (context: BuildContext, backend: BackendContext) => (record: EdgeDefinition) => {
    const name = PythonEdge.name(context, record)
    const comment = PythonEdge.comment(context, record)

    return lines([
      comment,
      '@dataclass',
      `class ${name}:`,
      pad_lines(
        lines(record.columns.map(cast_field(context))),
        renderer_context.indent,
      ),
      pad_lines(
        lines(
          [record.source, record.target].map(cast_entity_relation(context, backend)),
        ),
        renderer_context.indent,
      ),
    ])
  }

//------------------------------------------------------------------------------

function build_context(prev_context: BuildContext) {
  const prev_coreferences = build_type_qualified_coreferences(prev_context, 'python')
  const prev_backend: BackendContext = {
    ...renderer_context,
    coreferences: prev_coreferences,
  }
  const next_context = postprocess_context(prev_context, prev_backend)
  const next_coreferences = build_type_qualified_coreferences(next_context, 'python')
  const next_backend = { ...prev_backend, coreferences: next_coreferences }

  return { context: next_context, backend: next_backend }
}

// eslint-disable-next-line @typescript-eslint/require-await
export const render_python = async (prev_context: BuildContext) => {
  const { context, backend } = build_context(prev_context)
  const { nodes, edges, tables, foreign_keys } = context

  const node_content = flatMap(nodes, cast_entity(context, backend))
  const edge_content = flatMap(edges, cast_edge(context, backend))
  const entity_content = flatMap(tables, cast_entity(context, backend))
  const relation_content = flatMap(foreign_keys, cast_relation(context, backend))

  const section = code_section(backend)

  return lines([
    header(context, backend),
    pragma(context),
    coreference_banner(context, backend),
    ...section('Nodes', size(nodes), node_content),
    ...section('Edges', size(edges), edge_content),
    ...section('Entities', size(tables), entity_content),
    ...section('Relations', size(foreign_keys), relation_content),
  ])
}
