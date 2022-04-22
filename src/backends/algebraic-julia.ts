import inflection from 'inflection'
import { flatMap, size } from 'lodash'

import type { ColumnDefinition, ForeignKey, TableDefinition } from '../adapters/types'
import type { BuildContext } from '../compiler'
import { cast_typedb_coreferences } from '../coreference'
import { banner, lines, pad_lines } from '../formatters'
import { cast_julia_type } from '../typemaps/julia-typemap'
import type { BackendContext } from './base'
import { header } from './base'

//------------------------------------------------------------------------------

const imports = (_context: BuildContext): string => `
using AlgebraicRelations.DB
using SQLite
`

const normalize_name = (name: string): string => {
  return name
  // return is_reserved_word(name) ? `${name}_` : name;
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
    return normalize_name(config.formatAttributeName(name))
  },
  type: (context: BuildContext, column: ColumnDefinition): string => {
    // return translate_type(context, column)
    return cast_julia_type(context, column)
  },
}

const Entity = {
  comment: (_context: BuildContext, { name }: TableDefinition): string => {
    return `# Table: ${name}`
  },
  name: ({ config }: BuildContext, { name }: TableDefinition): string => {
    name = inflection.singularize(name)
    return normalize_name(config.formatEntityName(name))
  },
}

const Relation = {
  comment: (
    _context: BuildContext,
    {
      primary_table,
      primary_column,
      foreign_table,
      foreign_column,
      constraint,
    }: ForeignKey,
  ): string => {
    return lines([
      constraint && `# Constraint: ${constraint}`,
      `# Relation: ${primary_table}.${primary_column} => ${foreign_table}.${foreign_column}`,
    ])
  },
  name: ({ config }: BuildContext, { primary_column }: ForeignKey): string => {
    // TODO: improve global suffix handling
    const relation = primary_column.replace(/_id$/, '').replace(/_?I[Dd]$/, '')
    return normalize_name(config.formatRelationName(relation))
  },
  type: (context: BuildContext, foreign_key: ForeignKey): string => {
    const column = { name: foreign_key.foreign_table, columns: [] }
    const name = Entity.name(context, column)
    return `Nullable{${name}}`
  },
  relation: (context: BuildContext, foreign_key: ForeignKey): string => {
    const column = { name: foreign_key.foreign_table, columns: [] }
    const name = Entity.name(context, column)
    return `Nullable{${name}}`
  },
}

//------------------------------------------------------------------------------

const cast_attribute =
  (context: BuildContext, record: TableDefinition) =>
  (column: ColumnDefinition): string => {
    const ob = Entity.name(context, record)
    const name = Attribute.name(context, column)
    const type = Attribute.type(context, column)
    const comment = Attribute.comment(context, column)

    const line = `${ob}_${name}::Attr(${ob}, ${type})`
    return lines([comment, line])
  }

//------------------------------------------------------------------------------

const cast_ob = (context: BuildContext) => {
  // const relations_map = groupBy(context.foreign_keys, 'primary_table')

  return (record: TableDefinition) => {
    const name = Entity.name(context, record)
    const comment = Entity.comment(context, record)

    const fields = record.columns.map(cast_attribute(context, record)).sort()

    return lines([comment, `${name}::Ob`, lines(fields)])
  }
}

//------------------------------------------------------------------------------

const cast_relation = (context: BuildContext) => (record: ForeignKey) => {
  const ob = Relation.name(context, record)
  // const name = Relation.name(context, record)
  // const relation = Relation.relation(context, record)
  const comment = Relation.comment(context, record)
  const ob1 = record.primary_table
  const ob2 = record.foreign_table

  return lines([
    comment,
    `${ob}::Ob`,
    // line,
    `${ob}_${ob1}::Hom(${ob}, ${ob2})`,
    `${ob}_${ob2}::Hom(${ob}, ${ob1})`,

    // primary, foreign
  ])
}

// const cast_ob_and_types = (context: BuildContext) => {
//   const relations_map = groupBy(context.foreign_keys, 'primary_table')

//   return (record: TableDefinition) => {
//     const name = Entity.name(context, record)
//     const comment = Entity.comment(context, record)

//     const foreign_keys = get(relations_map, record.name, [])

//     const fields = record.columns.map(cast_attribute(context)).sort()
//     const relations = foreign_keys.map(cast_relation(context)).sort()

//     return lines([
//       comment,
//       `mutable struct ${name} {`,
//       pad_lines('iid:DbId', '  '),
//       pad_lines(lines(fields), '  '),
//       pad_lines(lines(relations), '  '),
//       '}',
//     ])
//   }
// }

// const cast_data_table = () => {
//   return `
//   employee::Ob
//   emp_data::Attr(employee, Int)

//   name::Ob
//   name_data::Attr(name, String)

//   salary::Ob
//   sal_data::Attr(salary, Real)
//   `
// }

// const cast_relation_table = () => {
//   return `
//   manager::Ob
//   emplm::Hom(manager, employee)
//   manag::Hom(manager, employee)

//   full_name::Ob
//   empln::Hom(full_name, employee)
//   namen::Hom(full_name, name)

//   income::Ob
//   empli::Hom(income, employee)
//   sali::Hom(income, salary)
//   `
// }

// const cast_presentation = (context: BuildContext) => (record: ForeignKey) => {
//   const schema = 'AACTSchema'

//   const tables = tables.map(cast_data_table)
//   const relations = tables.map(cast_data_table)

//   return `
// using AlgebraicRelations.DB
// using SQLite

// @present ${schema} <: TheorySQL begin
//   # Data tables
//   ${tables}

//   # Relation tables
//   ${relations}
//   end;
//   `
// }

//------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/require-await
export const render_algebraic_julia = async (context: BuildContext) => {
  const tables = context.tables
  const foreign_keys = context.foreign_keys.flat()

  const obs = flatMap(tables, cast_ob(context))
  const relations = flatMap(foreign_keys, cast_relation(context))

  const backend: BackendContext = {
    backend: 'julia',
    comment: '#',
    indent: '  ',
    coreferences: cast_typedb_coreferences(context),
  }

  return lines([
    header(context, backend),
    // pragma(context),
    imports(context),

    // coreference_banner(context, backend),
    banner(backend.comment, `Entities (${size(tables)})`),
    banner(backend.comment, `Relations (${size(foreign_keys)})`),

    '@present ${schema} <: TheorySQL begin',
    '  # Data tables',
    lines(
      obs.map(value => pad_lines(value, '  ')),
      '\n\n',
    ),
    '\n',
    '  # Relations',
    lines(
      relations.map(value => pad_lines(value, '  ')),
      '\n\n',
    ),
    'end;',
  ])
}
