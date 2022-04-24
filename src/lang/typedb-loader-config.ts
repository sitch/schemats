/* eslint-disable @typescript-eslint/naming-convention */

export type Integer = number
export type Character = string
export type RegExpString = string

//-----------------------------------------------------------------------
// Config
//-----------------------------------------------------------------------

export interface Configuration {
  globalConfig?: GlobalConfig
  attributes?: Record<string, GeneratorAttribute>
  entities?: Record<string, GeneratorEntity>
  relations?: Record<string, GeneratorRelation>
  appendAttribute?: Record<string, GeneratorAppendAttribute>
  appendAttributeOrInsertThing?: Record<string, GeneratorAppendAttributeOrInsertThing>
}

export interface GlobalConfig {
  separator?: Character
  rowsPerCommit?: Integer
  parallelisation?: Integer
  schema?: string
  orderedBeforeGenerators?: string[]
  orderedAfterGenerators?: string[]
  ignoreGenerators?: string[]
}

//-----------------------------------------------------------------------
// Generator
//-----------------------------------------------------------------------

export interface Generator {
  data: string[]
  config?: GeneratorConfig
}

export interface GeneratorConfig {
  separator?: Character
  rowsPerCommit?: Integer
}

//-----------------------------------------------------------------------

export interface GeneratorAttribute extends Generator {
  insert: DefinitionAttribute
}

export interface GeneratorEntity extends Generator {
  insert: GeneratorEntityInsert
}

export interface GeneratorRelation extends Generator {
  insert: GeneratorRelationInsert
}

export interface GeneratorEntityInsert {
  entity: string
  ownerships: DefinitionAttribute[]
}

export interface GeneratorRelationInsert {
  relation: string
  ownerships?: DefinitionAttribute[]
  players?: DefinitionPlayer[]
}

export interface GeneratorAppendAttribute extends Generator {
  match?: GeneratorAppendAttributeMatch
  insert?: GeneratorAppendAttributeInsert
}

export interface GeneratorAppendAttributeMatch {
  type: string
  ownerships: DefinitionAttribute[]
}

export interface GeneratorAppendAttributeInsert {
  ownerships: DefinitionAttribute[]
}

type GeneratorAppendAttributeOrInsertThing = GeneratorAppendAttribute

//-----------------------------------------------------------------------

export interface PreprocessorConfig {
  type: string
  parameters: PreprocessorParameters
}

export interface PreprocessorParameters {
  regexMatch?: RegExpString
  regexReplace?: RegExpString
}

//-----------------------------------------------------------------------
// Definition
//-----------------------------------------------------------------------

enum AttributeValueTypeEnum {
  STRING = 'STRING',
  LONG = 'LONG',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  DATETIME = 'DATETIME',
  INVALID = 'INVALID',
}

type AttributeValueType = keyof typeof AttributeValueTypeEnum

export interface DefinitionAttribute {
  attribute?: string
  column?: string
  conceptValueType?: AttributeValueType
  required?: boolean
  listSeparator?: string
  preprocessorConfig?: PreprocessorConfig
}

export interface DefinitionPlayer {
  role?: string
  required?: boolean
  match?: DefinitionThing
}

export interface DefinitionThing {
  type?: string
  attribute?: DefinitionAttribute
  ownerships?: DefinitionAttribute[]
  players?: DefinitionPlayer[]
}
