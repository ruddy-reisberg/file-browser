/**
 * Core types for the file-browser domain. This module must stay
 * framework-free: no React/UI imports, no network, no storage.
 */

/** A flat entry collected from a picked directory, before tree building. */
export interface FileEntry {
  /** Path segments relative to the picked root, e.g. ["src", "lib", "a.ts"]. */
  path: string[]
  file: File
}

export type NodeKind = 'file' | 'dir'

export interface TreeNode {
  name: string
  kind: NodeKind
  /** Slash-joined path relative to the picked root; stable identity for UI state. */
  path: string
  /** Present for kind === 'file'. */
  file?: File
  /** Present for kind === 'dir'; sorted dirs-first, then alphabetical. */
  children?: TreeNode[]
}

export interface FileMetadata {
  name: string
  sizeBytes: number
  sizeLabel: string
  kindLabel: string
  lastModifiedLabel: string
  lastModifiedMs: number
  mimeType: string
}

export interface ImageDimensions {
  width: number
  height: number
}

export interface ExifData {
  make?: string
  model?: string
  orientation?: number
  dateTaken?: string
  exposureTime?: string
  fNumber?: string
  iso?: number
  focalLength?: string
}
