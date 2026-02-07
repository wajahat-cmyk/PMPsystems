'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PlacementSelectorProps {
  value: string;
  onValueChange: (v: string) => void;
}

const PLACEMENT_OPTIONS = [
  { value: 'ALL', label: 'All Placements' },
  { value: 'TOP_OF_SEARCH', label: 'Top of Search' },
  { value: 'REST_OF_SEARCH', label: 'Rest of Search' },
  { value: 'PRODUCT_PAGES', label: 'Product Pages' },
] as const;

export function PlacementSelector({ value, onValueChange }: PlacementSelectorProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select placement" />
      </SelectTrigger>
      <SelectContent>
        {PLACEMENT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
