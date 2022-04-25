import { flatMap, size } from 'lodash'

import type {
  ColumnDefinition,
  EnumDefinition,
  TableDefinition,
} from '../adapters/types'
import type { BuildContext } from '../compiler'
import type { UserImport } from '../config'
import { build_type_qualified_coreferences } from '../coreference'
import { banner, double_quote, lines, pad_lines } from '../formatters'
import {
  is_reserved_word,
  pragma,
  translate_type,
} from '../typemaps/typescript-typemap'
import type { BackendContext } from './base'
import { header } from './base'

//------------------------------------------------------------------------------

const normalize_name = (name: string): string =>
  is_reserved_word(name) ? `${name}_` : name

// const prefix = (context: BuildContext) => {
//   return `${context.config.database.toLowerCase()}-`
// }

//------------------------------------------------------------------------------

const Enums = {
  name: ({ config }: BuildContext, { name }: EnumDefinition): string => {
    return normalize_name(config.formatEnumName(`${name}`))
  },
  key: (_context: BuildContext, value: string): string => {
    return value
  },
  value: (_context: BuildContext, value: string): string => {
    return value
  },
}

const cast_enum_as_enum = (context: BuildContext) => (record: EnumDefinition) => {
  const type = Enums.name(context, record)
  const entries = record.values.map((value: string) => {
    const key = Enums.key(context, value)
    const type = Enums.value(context, value)
    return `'${key}' = '${type}',`
  })
  return lines([`export enum ${type} {`, lines(entries), '};'])
}

const cast_enum_as_type = (context: BuildContext) => (record: EnumDefinition) => {
  const type = Enums.name(context, record)
  const values = record.values.map(value => double_quote(value))

  return `export type ${type} = ${values.join(' | ')};`
}

const cast_enum =
  (context: BuildContext) =>
  (record: EnumDefinition): string => {
    if (context.config.enums) {
      return cast_enum_as_enum(context)(record)
    }
    return cast_enum_as_type(context)(record)
  }

//------------------------------------------------------------------------------

const Interface = {
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    return normalize_name(config.formatTableName(name))
  },
  key: ({ config }: BuildContext, { name, is_nullable }: ColumnDefinition): string => {
    return `${normalize_name(config.formatColumnName(name))}${is_nullable ? '?' : ''}`
  },
  value: (context: BuildContext, record: ColumnDefinition): string => {
    return translate_type(context, record)
  },
}

const cast_entity = (context: BuildContext) => (record: TableDefinition) => {
  const name = Interface.name(context, record)
  const fields = record.columns.map(column => {
    const key = Interface.key(context, column)
    const value = Interface.value(context, column)
    return `${key}: ${value}`
  })
  return lines([`export interface ${name} {`, pad_lines(lines(fields), '  '), '}'])
}

//------------------------------------------------------------------------------

const cast_user_imports =
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
    ({ name }) => `  ${name}: ${normalize_name(config.formatTableName(name))}`,
  )
  return `export interface Tables {\n${types.join(',\n')}\n}`
}

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_typescript = async (context: BuildContext) => {
  const enums = flatMap(context.enums, cast_enum(context))
  const custom_imports = flatMap(context.user_imports, cast_user_imports(context))
  const entities = flatMap(context.tables, cast_entity(context))

  const backend: BackendContext = {
    backend: 'typescript',
    comment: '//',
    indent: '  ',
    character_line_limit: 80,
    coreferences: build_type_qualified_coreferences(context, 'typescript'),
  }

  return lines([
    header(context, backend),
    pragma(context),
    // coreference_banner(context, backend),
    lines(custom_imports),
    banner(backend.comment, `Enums (${size(enums)})`),
    lines(enums, '\n\n'),
    banner(backend.comment, `Entities (${size(entities)})`),
    lines(entities, '\n\n'),
    banner(backend.comment, 'Exports'),
    lookup(context),
  ])
}
