import chalk from 'chalk'

import { version } from '../package.json'
import { TableDefinition } from './adapters/types'
import { inflect, pretty } from './formatters'
import { caller_relative_path } from './utils'

//------------------------------------------------------------------------------

export const ENUM_DELIMITER = '::'

//------------------------------------------------------------------------------

export const BACKENDS = [
  'typescript',
  'json',
  'typedb',
  'julia',
  'algebraic-julia',
  'hydra',
  'julia-genie',
  'julia-octo',
] as const
export type Backends = typeof BACKENDS
// export type Backend = "typescript" | "json" | "typedb" | "julia";
export type Backend = string

//------------------------------------------------------------------------------

export type UserImport = Set<string>

export const get_user_imports = (
  _config: Config,
  _tables: TableDefinition[] = [],
): UserImport[] => {
  return []
}

//------------------------------------------------------------------------------

export interface ConfigValues {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  logLevel: string
  output?: string | undefined
  // eslint-disable-next-line @typescript-eslint/naming-convention
  outputPath: string | undefined

  schema: string
  backend: string
  database: string
  connection: string
  enums?: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ignoreAttributeCollisions: string[]
  // eslint-disable-next-line @typescript-eslint/naming-convention
  enumFormatter?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  tableFormatter?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  columnFormatter?: string

  // NOT USED

  tables: string[]
  // eslint-disable-next-line @typescript-eslint/naming-convention
  writeHeader?: boolean
  // eslint-disable-next-line @typescript-eslint/naming-convention
  typesFile?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  throwOnMissingType?: boolean

  // eslint-disable-next-line @typescript-eslint/naming-convention
  typedbEntityTemplate: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  typedbRelationTemplate: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  typedbAttributeTemplate: string
}

export type CommandOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | 'output'
    // | "logLevel"
    | 'schema'
    | 'tables'
    | 'backend'
    | 'database'
    | 'connection'
    | 'ignoreAttributeCollisions'
    | 'typedbEntityTemplate'
    | 'typedbRelationTemplate'
    | 'typedbAttributeTemplate'
  >

export type ConfigOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | 'output'
    | 'schema'
    | 'logLevel'
    | 'tables'
    | 'backend'
    | 'database'
    | 'connection'
    | 'ignoreAttributeCollisions'
    | 'typedbEntityTemplate'
    | 'typedbRelationTemplate'
    | 'typedbAttributeTemplate'
  >

// const applyDefaults = (
//   config: CommandOptions,
//   argv: string[]
// ): ConfigOptions => ({
//   // ignoreAttributeCollisions: [],
//   writeHeader: true,
//   throwOnMissingType: true,
//   enums: false,
//   ...config,
//   ignoreAttributeCollisions: (config.ignoreAttributeCollisions || []).filter(
//     (x) => !!x
//   ),
//   outputPath: config.output ? relpath(config.output) : config.output,
// });

//------------------------------------------------------------------------------

export class Config {
  public readonly config: ConfigOptions
  public readonly timestamp: string

  constructor(
    private readonly argv: string[],
    public readonly connection: string,
    config: CommandOptions,
  ) {
    this.timestamp = this.generateTimestamp()
    this.argv = argv
    this.config = {
      logLevel: 'INFO',
      // ignoreAttributeCollisions: [],
      writeHeader: true,
      throwOnMissingType: true,
      enums: false,
      ...config,
      ignoreAttributeCollisions: config.ignoreAttributeCollisions.filter(
        value => !!value,
      ),
      outputPath: config.output ? caller_relative_path(config.output) : config.output,
      // user_imports: get_user_imports(config)
    }
  }

  public get commandFromCLI() {
    return ['ts-node', 'schemats', ...this.argv.slice(2)].join(' ')
  }

  public get version() {
    return version
  }

  public get outputPath() {
    return this.config.outputPath
  }

  public get database() {
    return this.config.database
  }

  public get backend() {
    return this.config.backend
  }

  public get enums() {
    return this.config.enums
  }

  public get tables() {
    return this.config.tables
  }

  public get schema() {
    return this.config.schema
  }

  public get writeHeader() {
    return this.config.writeHeader
  }

  public get typesFile() {
    return this.config.typesFile
  }

  public get throwOnMissingType() {
    return this.config.throwOnMissingType
  }

  public get ignoreAttributeCollisions(): string[] {
    return this.config.ignoreAttributeCollisions
  }

  public formatEnumName(name: string): string {
    return inflect(name.replace(ENUM_DELIMITER, '_'), this.config.enumFormatter)
  }

  public formatTableName(name: string): string {
    return inflect(name, this.config.tableFormatter)
  }

  public formatColumnName(name: string): string {
    return inflect(name, this.config.columnFormatter)
  }

  public formatEntityName(name: string): string {
    return inflect(name, this.config.tableFormatter)
  }

  public formatAttributeName(name: string): string {
    return inflect(name, this.config.columnFormatter)
  }

  public formatRelationName(name: string): string {
    return inflect(name, this.config.columnFormatter)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(message: string, data?: any): void {
    if (!['DEBUG'].includes(this.config.logLevel)) {
      return
    }
    if (data) {
      console.info(chalk.cyan(message), pretty(data))
    } else {
      console.info(chalk.cyan(message))
    }
  }

  private generateTimestamp(): string {
    console.warn(chalk.yellow(`⚠️  ${chalk.bold('Bypassing timestamp')}  ⚠️`))
    return '__TIMESTAMP_BYPASS__'

    // TODO: RESTORE
    // return new Date().toUTCString();
  }
}
