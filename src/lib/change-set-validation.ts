import { z } from 'zod';

export const campaignChangesSchema = z.object({
  budget: z.number().min(1, 'Budget must be at least $1').optional(),
  state: z.enum(['enabled', 'paused']).optional(),
  tosModifier: z.number().min(0).max(900, 'Placement modifier must be 0-900%').int().optional(),
  rosModifier: z.number().min(0).max(900, 'Placement modifier must be 0-900%').int().optional(),
  pdpModifier: z.number().min(0).max(900, 'Placement modifier must be 0-900%').int().optional(),
}).refine(data => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0, {
  message: 'At least one change is required',
});

export const keywordChangesSchema = z.object({
  bid: z.number().min(0.02, 'Bid must be at least $0.02').optional(),
  state: z.enum(['enabled', 'paused']).optional(),
}).refine(data => Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined).length > 0, {
  message: 'At least one change is required',
});

export interface ValidationError {
  itemIndex: number;
  entityName: string;
  field: string;
  message: string;
}

export function validateChangeSetItems(items: Array<{
  entityType: string;
  entityName: string;
  changes: Record<string, unknown>;
}>): ValidationError[] {
  const errors: ValidationError[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const schema = item.entityType === 'CAMPAIGN' ? campaignChangesSchema : keywordChangesSchema;
    const result = schema.safeParse(item.changes);

    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push({
          itemIndex: i,
          entityName: item.entityName,
          field: issue.path.join('.') || 'changes',
          message: issue.message,
        });
      }
    }
  }

  return errors;
}
