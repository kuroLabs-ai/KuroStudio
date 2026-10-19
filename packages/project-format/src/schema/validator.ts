import { InvariantViolationError, ValidationError } from '@kuro/shared';
import { Clip, Project, Track } from '../types/project';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateProjectInvariants(project: Project): ValidationResult {
  const errors: string[] = [];

  if (!project.id || typeof project.id !== 'string') {
    errors.push('Project must have a non-empty string ID.');
  }

  if (project.schemaVersion < 1) {
    errors.push(`Invalid schemaVersion: ${project.schemaVersion}. Must be >= 1.`);
  }

  if (project.width <= 0 || project.height <= 0) {
    errors.push(`Invalid dimensions: ${project.width}x${project.height}. Must be positive integers.`);
  }

  if (project.timelineTimebase <= 0) {
    errors.push(`Invalid timelineTimebase: ${project.timelineTimebase}. Must be a positive integer.`);
  }

  const trackIds = new Set<string>();
  const clipIds = new Set<string>();

  for (const track of project.tracks) {
    if (trackIds.has(track.id)) {
      errors.push(`Duplicate track ID detected: "${track.id}".`);
    }
    trackIds.add(track.id);

    // Validate clips on this track
    let previousClipEnd = 0;
    const sortedClips = [...track.clips].sort((a, b) => a.timelineStartTicks - b.timelineStartTicks);

    for (const clip of sortedClips) {
      if (clipIds.has(clip.id)) {
        errors.push(`Duplicate clip ID detected across project: "${clip.id}".`);
      }
      clipIds.add(clip.id);

      if (clip.trackId !== track.id) {
        errors.push(`Clip "${clip.id}" has trackId "${clip.trackId}" but resides on track "${track.id}".`);
      }

      if (!Number.isInteger(clip.timelineStartTicks) || clip.timelineStartTicks < 0) {
        errors.push(`Clip "${clip.id}" timelineStartTicks must be a non-negative integer.`);
      }

      if (!Number.isInteger(clip.durationTicks) || clip.durationTicks <= 0) {
        errors.push(`Clip "${clip.id}" durationTicks must be a positive integer.`);
      }

      if (clip.sourceInTicks < 0 || clip.sourceOutTicks <= clip.sourceInTicks) {
        errors.push(`Clip "${clip.id}" has invalid source bounds: [${clip.sourceInTicks}, ${clip.sourceOutTicks}].`);
      }

      // Check for overlap on the same track
      if (clip.timelineStartTicks < previousClipEnd) {
        errors.push(
          `Clip overlap detected on track "${track.name}" (${track.id}): clip "${clip.id}" starts at ${clip.timelineStartTicks} before previous clip ends at ${previousClipEnd}.`
        );
      }
      previousClipEnd = Math.max(previousClipEnd, clip.timelineStartTicks + clip.durationTicks);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function assertProjectValid(project: Project): void {
  const result = validateProjectInvariants(project);
  if (!result.isValid) {
    throw new InvariantViolationError(`Project failed validation: ${result.errors.join('; ')}`, {
      errors: result.errors,
    });
  }
}
