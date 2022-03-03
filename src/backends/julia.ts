import { flatMap, get, groupBy, size } from 'lodash'

import { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import { BuildContext } from '../compiler'
import { castTypeDBCoreferences } from '../coreference'
import { banner, lines, padLines } from '../formatters'
import { pragma, translateType } from '../typemaps/julia-typemap'
import { BackendContext, header } from './base'

//------------------------------------------------------------------------------

const normalizeName = (name: string): string => {
  return name
  // return isReservedWord(name) ? `${name}_` : name;
}

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

const Attribute = {
  comment: (_context: BuildContext, _column: ColumnDefinition): string => {
    return ''
  },
  name: ({ config }: BuildContext, { name }: ColumnDefinition): string => {
    return normalizeName(config.formatAttributeName(name))
  },
  type: (context: BuildContext, column: ColumnDefinition): string => {
    return translateType(context, column)
  },
}

const Entity = {
  comment: (_context: BuildContext, _table: TableDefinition): string => {
    return ''
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalizeName(config.formatEntityName(name))
  },
}

const Relation = {
  comment: (
    _context: BuildContext,
    {
      primaryTable,
      primaryColumn,
      foreignTable,
      foreignColumn,
      constraint,
    }: ForeignKey,
  ): string => {
    return lines([
      constraint && `# Constraint: ${constraint}`,
      `# Relation: ${primaryTable}.${primaryColumn} => ${foreignTable}.${foreignColumn}`,
    ])
  },
  name: ({ config }: BuildContext, { primaryColumn }: ForeignKey): string => {
    // TODO: improve global suffix handling
    const relation = primaryColumn.replace(/_id$/, '').replace(/_?I[Dd]$/, '')
    return normalizeName(config.formatRelationName(relation))
  },
  type: (context: BuildContext, foreignKey: ForeignKey): string => {
    const column = { name: foreignKey.foreignTable, columns: [] }
    const name = Entity.name(context, column)
    return `Nullable{${name}}`
  },
}

//------------------------------------------------------------------------------

const castField =
  (context: BuildContext) =>
  (column: ColumnDefinition): string => {
    const name = Attribute.name(context, column)
    const type = Attribute.type(context, column)
    const comment = Attribute.comment(context, column)

    const line = `${name}::${type}`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const castEntity = (context: BuildContext) => {
  const relationsMap = groupBy(context.foreignKeys, 'primaryTable')

  return (record: TableDefinition) => {
    const name = Entity.name(context, record)
    const comment = Entity.comment(context, record)

    const foreignKeys = get(relationsMap, record.name, [])

    const fields = record.columns.map(castField(context)).sort()
    const relations = foreignKeys.map(castRelation(context)).sort()

    return lines([
      comment,
      `mutable struct ${name} {`,
      padLines('iid:DbId', '  '),
      padLines(lines(fields), '  '),
      padLines(lines(relations), '  '),
      '}',
    ])
  }
}

//------------------------------------------------------------------------------

const castRelation = (context: BuildContext) => (record: ForeignKey) => {
  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `${name}::${type}`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const juliaOfSchema = async (context: BuildContext) => {
  const tables = context.tables
  const foreignKeys = context.foreignKeys.flat()
  const entities = flatMap(tables, castEntity(context))
  // const relations = flatMap(foreignKeys, castRelation(context));

  const backend: BackendContext = {
    backend: 'julia',
    comment: '#',
    indent: '  ',
    coreferences: castTypeDBCoreferences(context),
  }

  return lines([
    header(context, backend),
    pragma(context),
    // coreferenceBanner(context, backend),
    banner(backend.comment, `Entities (${size(tables)})`),
    banner(backend.comment, `Relations (${size(foreignKeys)})`),
    lines(entities, '\n\n'),
  ])
}
