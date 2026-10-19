import { assertProjectValid } from '../schema/validator';
import { migrateProject } from '../migrations';
import { Project } from '../types/project';

export interface ProjectSerializationOptions {
  prettyPrint?: boolean;
}

/**
 * Serializes a Project object into a canonical UTF-8 JSON string after validating invariants.
 */
export function serializeProject(project: Project, options: ProjectSerializationOptions = {}): string {
  assertProjectValid(project);
  const updatedProject: Project = {
    ...project,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(updatedProject, null, options.prettyPrint ? 2 : undefined);
}

/**
 * Deserializes a raw JSON string into a validated Project, executing migrations if required.
 */
export function deserializeProject(jsonString: string): Project {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`Failed to parse project JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  const migrated = migrateProject(parsed);
  assertProjectValid(migrated);
  return migrated;
}

export function getProjectAssetsDirectoryName(projectName: string): string {
  const sanitized = projectName.trim().replace(/[\\/:*?"<>|]/g, '_');
  return `${sanitized}.assets`;
}

export const PROJECT_ASSETS_SUBDIRECTORIES = [
  'media',
  'generated',
  'thumbnails',
  'waveforms',
  'proxies',
  'autosaves',
] as const;
