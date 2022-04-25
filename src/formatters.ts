import camelCase from 'camelcase'
import inflection from 'inflection'
import { castArray, isString } from 'lodash'
import sortJson, { VisitOptions } from 'sort-json'

import type { BackendContext } from './backends/base'

const DEFAULT_SORT_JSON_OPTIONS = {
  depth: Number.POSITIVE_INFINITY,
}

export const is_only_whitespace = (line: string) => /^\s*$/.test(line)

export const pretty = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  options: VisitOptions = DEFAULT_SORT_JSON_OPTIONS,
) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const sorted = sortJson(data, options)
  return JSON.stringify(sorted, undefined, 2)
}

export const inflect = (name: string, format: string | undefined): string => {
  if (!format) {
    return name
  }
  if (['none'].includes(format)) {
    return name
  }
  if (['camel', 'camelcase'].includes(format)) {
    return camelCase(name, { pascalCase: false })
  }
  if (['pascal'].includes(format)) {
    return camelCase(name, { pascalCase: true })
  }
  if (['snakecase', 'underscore'].includes(format)) {
    return inflection.underscore(name)
  }
  if (['lower', 'lowercase', 'downcase'].includes(format)) {
    return name.toLowerCase()
  }
  throw `Unsupported formatter: ${format}`
}

export const comment_lines = (comment: string, body: string): string => {
  return body
    .split('\n')
    .map(line => `${comment}${line}`)
    .join('\n')
}

const divider = (comment: string, token = '-', width = 80) => {
  const count = Math.floor((width - comment.length) / token.length)
  return `\n${comment}${token.repeat(count)}\n`
}

export const banner = (comment: string, label: string) => {
  const lines = label.split('\n').map(line => `${comment} ${line}`)
  return `${divider(comment)}${lines.join('\n')}${divider(comment)}`
}

export const pad_lines = (content: string | string[], padding = '  '): string =>
  (isString(content) ? content.split('\n') : content)
    .map(value => (is_only_whitespace(value) ? `${padding}` : `${padding}${value}`))
    .join('\n')

type Line = string | boolean | undefined
export type LineOrLines = Line | Line[]

export const lines = (lineOrLines: LineOrLines, delimiter = '\n'): string => {
  return castArray(lineOrLines)
    .filter(value => isString(value))
    .filter(value => !!value)
    .join(delimiter)
}

export const single_quote = (value: string): string => `"${value}"`
export const double_quote = (value: string): string => `"${value}"`

export const code_section =
  (backend: BackendContext) => (name: string, count: number, content: string[]) =>
    count > 0
      ? [banner(backend.comment, `${name} (${count})`), lines(content, '\n\n')]
      : []
