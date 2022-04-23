import { promises, readFileSync, readJSONSync } from 'fs-extra'
import inflection from 'inflection'
import path from 'path'

const project_directory = () => {
  // eslint-disable-next-line unicorn/prefer-module
  return path.join(__dirname, '..')
}

const relative_to_project_directory = (filepath: string): string => {
  return path.join(project_directory(), filepath)
}
export const caller_relative_path = (filepath: string): string => {
  return path.relative(process.cwd(), filepath)
}

export const write_relative_file_async = async (content: string, filepath: string) => {
  await promises.writeFile(caller_relative_path(filepath), content, 'utf8')
}

export const read_sql = (filepath: string) => {
  return readFileSync(relative_to_project_directory(filepath)).toString('utf8')
}

export function read_json<T>(filepath: string): T {
  return readJSONSync(filepath) as T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const json_equal = (left: any, right: any): boolean => {
  const left_encoded = JSON.stringify(left)
  const right_encoded = JSON.stringify(right)
  return left_encoded == right_encoded
}

export function identifier_like(field: string) {
  const name = inflection.underscore(field)
  return name.endsWith('_id') || name.endsWith('id')
}
