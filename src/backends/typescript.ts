import { flatMap, size } from 'lodash'

import { ColumnDefinition, EnumDefinition, TableDefinition } from '../adapters/types'
import { BuildContext } from '../compiler'
import { UserImport } from '../config'
import { castTypeDBCoreferences } from '../coreference'
import { banner, doubleQuote, lines, padLines } from '../formatters'
import { isReservedWord, pragma, translateType } from '../typemaps/typescript-typemap'
import { BackendContext, header } from './base'

//------------------------------------------------------------------------------

const normalizeName = (name: string): string =>
  isReservedWord(name) ? `${name}_` : name

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

const Enums = {
  name: ({ config }: BuildContext, { name }: EnumDefinition): string => {
    return normalizeName(config.formatEnumName(`${name}`))
  },
  key: (_context: BuildContext, value: string): string => {
    return value
  },
  value: (_context: BuildContext, value: string): string => {
    return value
  },
}

const castEnumAsEnum = (context: BuildContext) => (record: EnumDefinition) => {
  const type = Enums.name(context, record)
  const entries = record.values.map((value: string) => {
    const key = Enums.key(context, value)
    const value_ = Enums.value(context, value)
    return `'${key}' = '${value_}',`
  })
  return lines([`export enum ${type} {`, lines(entries), '};'])
}

const castEnumAsType = (context: BuildContext) => (record: EnumDefinition) => {
  const type = Enums.name(context, record)
  const values = record.values.map(value => doubleQuote(value))

  return `export type ${type} = ${values.join(' | ')};`
}

const castEnum =
  (context: BuildContext) =>
  (record: EnumDefinition): string => {
    if (context.config.enums) {
      return castEnumAsEnum(context)(record)
    }
    return castEnumAsType(context)(record)
  }

//------------------------------------------------------------------------------

const Interface = {
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalizeName(config.formatTableName(name))
  },
  key: ({ config }: BuildContext, { name, isNullable }: ColumnDefinition): string => {
    return `${normalizeName(config.formatColumnName(name))}${isNullable ? '?' : ''}`
  },
  value: (context: BuildContext, record: ColumnDefinition): string => {
    return translateType(context, record)
  },
}

const castEntity = (context: BuildContext) => (record: TableDefinition) => {
  const name = Interface.name(context, record)
  const fields = record.columns.map(column => {
    const key = Interface.key(context, column)
    const value = Interface.value(context, column)
    return `${key}: ${value}`
  })
  return lines([`export interface ${name} {`, padLines(lines(fields), '  '), '}'])
}

//------------------------------------------------------------------------------

const castUserImports =
  ({ config: { typesFile } }: BuildContext) =>
  (record: UserImport): string => {
    if (!typesFile) {
      return ''
    }
    const imports = Array.from(record).sort().join(', ')

    return `import { ${imports} } from "${typesFile}"`
  }

//------------------------------------------------------------------------------

export const lookup = ({ config, tables }: BuildContext): string => {
  const types = tables.map(
    ({ name }) => `  ${name}: ${normalizeName(config.formatTableName(name))}`,
  )
  return `export interface Tables {\n${types.join(',\n')}\n}`
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const typescriptOfSchema = async (context: BuildContext) => {
  const enums = flatMap(context.enums, castEnum(context))
  const customImports = flatMap(context.userImports, castUserImports(context))
  const entities = flatMap(context.tables, castEntity(context))

  const backend: BackendContext = {
    backend: 'typescript',
    comment: '//',
    indent: '  ',
    coreferences: castTypeDBCoreferences(context),
  }

  return lines([
    header(context, backend),
    pragma(context),
    // coreferenceBanner(context, backend),
    lines(customImports),
    banner(backend.comment, `Enums (${size(enums)})`),
    lines(enums, '\n\n'),
    banner(backend.comment, `Entities (${size(entities)})`),
    lines(entities, '\n\n'),
    banner(backend.comment, 'Exports'),
    lookup(context),
  ])
}
