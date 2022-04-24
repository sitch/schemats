/* eslint-disable @typescript-eslint/naming-convention */

export type Neo4jReflectionNameSymbol = string // Example: ":`NAME`"
export interface Neo4jReflection {
  nodes: Record<Neo4jReflectionNameSymbol, Neo4jReflectionNode>
  relationships: Record<string, Neo4jReflectionEdge>
}

export interface Neo4jReflectionNode {
  properties: Neo4jReflectionProperty[]
  // relationships: Neo4jReflectionNodeEdge[]
  relationships: never[]
  typeId: Neo4jReflectionNameSymbol
  labels: string[]
}

export interface Neo4jReflectionProperty {
  name: string
  types: string[]
  mandatory: boolean
}

export interface Neo4jReflectionEdge {
  type: string
  paths: Neo4jReflectionEdgePath[]
  properties: Neo4jReflectionProperty[]
}

export interface Neo4jReflectionEdgePath {
  fromTypeId: Neo4jReflectionNameSymbol
  toTypeId: Neo4jReflectionNameSymbol
}

//i------------------------------------------------------------------------------

export type NodeIdentityMap = Map<number, string>
export type NodeLabelsMap = Record<string, Neo4jNodeLabel[]>

export interface Neo4jNodeLabel {
  label: string
  property: string
  type: string
  isIndexed: boolean
  uniqueConstraint: boolean
  existenceConstraint: boolean
}
export interface Neo4jSpecification {
  nodes: Neo4jNode[]
  relationships: Neo4indexEdge[]
}

export interface Neo4jNode {
  identity: number
  properties: Neo4jNodeProperties

  // Unused
  labels: string[]
}

export interface Neo4jNodeProperties {
  name: string
  indexes: string[]
  constraints: string[]
}

export interface Neo4indexEdge {
  identity: number
  start: number
  end: number
  type: string
  properties: Neo4indexEdgeProperties
}

export type Neo4indexEdgeProperties = Record<string, never>
