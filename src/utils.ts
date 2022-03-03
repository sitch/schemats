import { promises, readFileSync } from 'fs'
import path from 'path'

export const projectDirectory = () => {
  return path.join(__dirname, '..')
  // return path.dirname('..')
}

export const relativeToProjectDirectory = (filepath: string): string => {
  return path.join(projectDirectory(), filepath)
}
export const callerRelativePath = (filepath: string): string => {
  return path.relative(process.cwd(), filepath)
}

export const writeRelativeFileAsync = async (content: string, filepath: string) => {
  await promises.writeFile(callerRelativePath(filepath), content, 'utf8')
}

export const readSQL = (filepath: string) => {
  return readFileSync(relativeToProjectDirectory(filepath)).toString('utf8')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jsonEq = (left: any, right: any): boolean => {
  const leftEncoded = JSON.stringify(left)
  const rightEncoded = JSON.stringify(right)
  return leftEncoded == rightEncoded
}
