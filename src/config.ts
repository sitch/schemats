import { version } from "../package.json";
import { inflect } from "./formatters";
import { relpath } from "./utils";

export const ALL_BACKENDS = ["typescript", "json", "typedb"] as const;
export type Backends = typeof ALL_BACKENDS;
// export type Backend = "typescript" | "json" | "typedb";
export type Backend = string;

export interface ConfigValues {
  output?: string | undefined;
  outputPath: string | undefined;
  typedbEntityTemplate: string;
  typedbRelationTemplate: string;
  typedbAttributeTemplate: string;
  backend: string;
  schema: string;
  database: string;
  connection: string;
  tables: string[];
  enums?: boolean;
  ignoreFieldCollisions: string[];

  writeHeader?: boolean;
  typesFile?: boolean;
  throwOnMissingType?: boolean;

  enumFormatter?: string;
  tableFormatter?: string;
  columnFormatter?: string;
}

export type CommandOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | "output"
    | "schema"
    | "tables"
    | "backend"
    | "database"
    | "connection"
    | "ignoreFieldCollisions"
    | "typedbEntityTemplate"
    | "typedbRelationTemplate"
    | "typedbAttributeTemplate"
  >;

export type ConfigOptions = Partial<ConfigValues> &
  Pick<
    ConfigValues,
    | "output"
    | "schema"
    | "tables"
    | "backend"
    | "database"
    | "connection"
    | "ignoreFieldCollisions"
    | "typedbEntityTemplate"
    | "typedbRelationTemplate"
    | "typedbAttributeTemplate"
  >;

// const applyDefaults = (
//   config: CommandOptions,
//   argv: string[]
// ): ConfigOptions => ({
//   // ignoreFieldCollisions: [],
//   writeHeader: true,
//   throwOnMissingType: true,
//   enums: false,
//   ...config,
//   ignoreFieldCollisions: (config.ignoreFieldCollisions || []).filter(
//     (x) => !!x
//   ),
//   outputPath: config.output ? relpath(config.output) : config.output,
// });

export class Config {
  public readonly config: ConfigOptions;
  public readonly timestamp: string;

  constructor(
    private readonly argv: string[],
    public readonly connection: string,
    config: CommandOptions
  ) {
    this.timestamp = new Date().toUTCString();
    this.argv = argv;
    this.config = {
      // ignoreFieldCollisions: [],
      writeHeader: true,
      throwOnMissingType: true,
      enums: false,
      ...config,
      ignoreFieldCollisions: (config.ignoreFieldCollisions || []).filter(
        (x) => !!x
      ),
      outputPath: config.output ? relpath(config.output) : config.output,
    };
  }

  public get commandFromCLI() {
    return ["ts-node", "schemats", ...this.argv.slice(2)].join(" ");
  }

  public get version() {
    return version;
  }

  public get ignoreFieldCollisions(): string[] {
    return this.config.ignoreFieldCollisions;
    // return (this.config.ignoreFieldCollisions || []).filter((x) => !!x);
  }

  public get outputPath() {
    return this.config.outputPath;
  }

  public get database() {
    return this.config.database;
  }

  public get backend() {
    return this.config.backend;
  }

  public get enums() {
    return this.config.enums;
  }

  public get tables() {
    return this.config.tables;
  }

  public get schema() {
    return this.config.schema;
  }

  public get writeHeader() {
    return this.config.writeHeader;
  }

  public get typesFile() {
    return this.config.typesFile;
  }

  public get throwOnMissingType() {
    return this.config.throwOnMissingType;
  }

  public formatEnumName(name: string) {
    return inflect(name, this.config.enumFormatter);
  }

  public formatTableName(name: string) {
    return inflect(name, this.config.tableFormatter);
  }

  public formatColumnName(name: string) {
    return inflect(name, this.config.columnFormatter);
  }

  public formatRelationName(name: string) {
    console.warn(name)

    return inflect(name, this.config.columnFormatter);
  }

  // public getCLICommand(dbConnection: string): string {
  //   const commands = ["schemats", "generate", dbConnection];
  //   // if (this.config.camelCase) {
  //   //     commands.push('-C')
  //   // }
  //   if (this.config.tables?.length > 0) {
  //     commands.push("-t", this.config.tables.join(" "));
  //   }
  //   if (this.config.schema) {
  //     commands.push(`-s ${this.config.schema}`);
  //   }
  //   return commands.join(" ");
  // }
}
