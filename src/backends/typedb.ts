import { flatMap, size } from 'lodash'

import { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import { BuildContext } from '../compiler'
import { castTypeDBCoreferences } from '../coreference'
import { banner, lines, padLines } from '../formatters'
import { castTypeDBType, isReservedWord, pragma } from '../typemaps/typedb-typemap'
import { BackendContext, coreferenceBanner, header } from './base'

//------------------------------------------------------------------------------

const normalizeName = (name: string): string =>
  isReservedWord(name) ? `${name}_` : name

const prefix = (context: BuildContext) => {
  return `${context.config.database.toLowerCase()}-`
}

//------------------------------------------------------------------------------

const Attribute = {
  comment: (_context: BuildContext, _column: ColumnDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: ColumnDefinition): string => {
    return normalizeName(config.formatAttributeName(name))
  },
  type: (context: BuildContext, _record: ColumnDefinition): string => {
    return `${prefix(context)}attribute`
  },
}

const Entity = {
  comment: (_context: BuildContext, _table: TableDefinition): string => {
    return ``
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalizeName(config.formatEntityName(name))
  },
  type: (context: BuildContext, _table: TableDefinition): string => {
    return `${prefix(context)}entity`
  },
}

const Relation = {
  comment: ({ config }: BuildContext, { constraint }: ForeignKey): string => {
    return `# Source: '${config.schema}.${constraint}'`
  },
  name: (
    { config }: BuildContext,
    { primaryTable, primaryColumn, foreignTable, foreignColumn }: ForeignKey,
  ): string => {
    const tableSource = config.formatRelationName(primaryTable)
    const attributeSource = config.formatRelationName(primaryColumn)
    const tableDestination = config.formatRelationName(foreignTable)
    const attributeDestination = config.formatRelationName(foreignColumn)

    return normalizeName(
      `${tableSource}-${attributeSource}-${tableDestination}-${attributeDestination}`,
    )
  },
  type: (context: BuildContext, _foreignKey: ForeignKey): string => {
    return `${prefix(context)}relation`
  },
}

//------------------------------------------------------------------------------

const castAttribute = (context: BuildContext) => (column: ColumnDefinition) => {
  const name = Attribute.name(context, column)
  const type = Attribute.type(context, column)
  const value = castTypeDBType(context, column)
  const comment = Attribute.comment(context, column)

  const line = `${name} sub ${type}, value ${value};`
  return lines([comment, line])
}

//------------------------------------------------------------------------------

const castField =
  (context: BuildContext) =>
  (column: ColumnDefinition): string => {
    const name = Attribute.name(context, column)
    const comment = Attribute.comment(context, column)

    const line = `, owns ${name}`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const castEntity = (context: BuildContext) => (record: TableDefinition) => {
  const name = Entity.name(context, record)
  const type = Entity.type(context, record)
  const comment = Entity.comment(context, record)

  const fields = record.columns.map(castField(context))
  const attributes = record.columns.map(castAttribute(context))

  const line = `${name} sub ${type}`
  return lines([comment, line, padLines(lines(fields), '  '), ';', lines(attributes)])
}

//------------------------------------------------------------------------------

const castRelation = (context: BuildContext) => (record: ForeignKey) => {
  const { config } = context
  const { primaryTable, primaryColumn, foreignTable, foreignColumn } = record

  const name = Relation.name(context, record)
  const type = Relation.type(context, record)
  const comment = Relation.comment(context, record)

  const line = `${name} sub ${type}`
  const relations = [
    `, owns ${config.formatAttributeName(primaryColumn)}`,
    `, owns ${config.formatAttributeName(foreignColumn)}`,
    `, relates ${config.formatEntityName(primaryTable)}`,
    `, relates ${config.formatEntityName(foreignTable)}`,
  ]

  return lines([comment, line, ...padLines(lines(relations), '  '), ';'])
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const typedbOfSchema = async (context: BuildContext) => {
  const tables = context.tables
  const foreignKeys = context.foreignKeys.flat()
  const entities = flatMap(tables, castEntity(context))
  const relations = flatMap(foreignKeys, castRelation(context))

  const backend: BackendContext = {
    backend: 'typedb',
    comment: '#',
    indent: '  ',
    coreferences: castTypeDBCoreferences(context),
  }

  return lines([
    header(context, backend),
    pragma(context),
    coreferenceBanner(context, backend),
    banner(backend.comment, `Entities (${size(tables)})`),
    lines(entities, '\n\n'),
    banner(backend.comment, `Relations (${size(foreignKeys)})`),
    lines(relations, '\n\n'),
  ])
}
