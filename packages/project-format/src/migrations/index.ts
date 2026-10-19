import { ProjectCorruptionError } from '@kuro/shared';
import { CURRENT_PROJECT_SCHEMA_VERSION, Project } from '../types/project';

export type MigrationFunction = (project: unknown) => unknown;

const MIGRATIONS: Record<number, MigrationFunction> = {
  // Schema migrations from version N to N+1 will be added here sequentially
};

/**
 * Safely migrates raw project manifest JSON to the current schema version.
 */
export function migrateProject(rawProject: unknown): Project {
  if (typeof rawProject !== 'object' || rawProject === null) {
    throw new ProjectCorruptionError('Invalid project file: manifest must be a JSON object.');
  }

  const manifest = rawProject as { schemaVersion?: number };
  let currentVersion = manifest.schemaVersion;

  if (typeof currentVersion !== 'number') {
    throw new ProjectCorruptionError('Invalid project file: missing schemaVersion field.');
  }

  if (currentVersion > CURRENT_PROJECT_SCHEMA_VERSION) {
    throw new ProjectCorruptionError(
      `Project file is from a newer version of KuroStudio (schema version ${currentVersion}, current is ${CURRENT_PROJECT_SCHEMA_VERSION}). Please update KuroStudio to open this project.`
    );
  }

  let migratedData: unknown = rawProject;
  while (currentVersion < CURRENT_PROJECT_SCHEMA_VERSION) {
    const migration = MIGRATIONS[currentVersion];
    if (!migration) {
      throw new ProjectCorruptionError(
        `No migration path found from schema version ${currentVersion} to ${currentVersion + 1}.`
      );
    }
    migratedData = migration(migratedData);
    currentVersion += 1;
  }

  return migratedData as Project;
}
