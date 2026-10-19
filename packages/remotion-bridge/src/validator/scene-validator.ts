import { ValidationError } from '@kuro/shared';
import { RemotionTemplateDefinition } from '../types/template.interface';

export function validateSceneProps(
  template: RemotionTemplateDefinition,
  props: Record<string, unknown>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of template.propSchema) {
    const val = props[field.name];
    if (val === undefined || val === null) {
      if (field.required) {
        errors.push(`Missing required template prop: "${field.name}".`);
      }
      continue;
    }

    if (field.type === 'string' || field.type === 'color') {
      if (typeof val !== 'string') {
        errors.push(`Prop "${field.name}" must be a string. Received ${typeof val}.`);
      }
    } else if (field.type === 'number') {
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        errors.push(`Prop "${field.name}" must be a finite number.`);
      }
    } else if (field.type === 'boolean') {
      if (typeof val !== 'boolean') {
        errors.push(`Prop "${field.name}" must be a boolean.`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function assertSceneValid(template: RemotionTemplateDefinition, props: Record<string, unknown>): void {
  const res = validateSceneProps(template, props);
  if (!res.isValid) {
    throw new ValidationError(`Remotion scene validation failed: ${res.errors.join('; ')}`, {
      templateId: template.id,
      errors: res.errors,
    });
  }
}
