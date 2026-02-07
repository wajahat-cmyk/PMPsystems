/**
 * Syntax classifier — ports the user's Excel LET formula to TypeScript.
 * Classifies keyword text or customer search terms into syntax groups.
 */

const BAMBOO_TERMS = [
  'bamboo', 'bambu', 'bamboo sheet', 'bamboo sheets',
  'bamboo bed sheet', 'bamboo bed sheets', 'cooling',
  'cooling sheet', 'bamboo cooling sheets', 'sabanas bambu',
  'bambo', 'bmaboo', 'bambu sabanas',
];

const COOLING_TERMS = ['cooling', 'cooling sheet', 'bamboo cooling sheets'];

const SIZES = ['california king', 'queen', 'king', 'full', 'twin'] as const;

const IRRELEVANT_TERMS = [
  'blanket', 'silk', 'cotton', 'christmas', 'vegan', 'flannel',
  'gingham', 'jersey', 'linen', 'hotel', 'branch', 'ugg',
  'sateen', 'satin', 'eucalyptus', 'alaskan', 'pet', 'mattress',
  'tencel', 'cozy', 'hemp', 'wyoming', 'allswell', 'martha',
  'eczema', 'southwestern', 'virgin', '+',
];

const COMPETITOR_TERMS = [
  'bamboo bay', 'levoo', 'pure bamboo', 'shilucheng', 'bedsure',
  'bc bella coterie', 'gokotta', 'california design den',
  'hotel sheets direct', 'lb luxury bamboo market', 'cozysmile',
  'linden & lain', 'doz by sijo', 'cgk unlimited', 'andency',
  'dreamcare', 'mayfair linen', 'sweave', 'linenwalas', 'bampure',
  'cozylux', 'meishang', 'yawfold', 'hcora', 'naturefield',
  "david's home", 'easehome', 'cosy house collection', 'ella jayne',
  'lavisun', 'vipfree', 'cleva', 'caelorin', 'bare home', 'hyprest',
  'phf', 'jself', 'whitney home textile', 'accuratex', 'rosecret',
  'lane linen', 'silkwings', 'tafts', 'sleep sanctuary', 'rest',
  'cloudscape linen', 'luxclub', 'vonty', 'belle terre', 'bamtek',
  'mco', 'kickoff home', 'lyralith', 'ankwos', 'zaizaihome',
  'manyshofu', 'cozyzenith', 'jellymoni', 'utopia bedding', 'lbro2m',
  'mellanni', 'nestl', 'caromio', 'elegant comfort', 'jsd',
  'hearth & harbor', 'danjor linens', 'amyhomie', 'dealuxe',
  'cariloha', 'birch & moon', 'cozy', 'luxome', 'sleephoria',
];

const GENERIC_TERMS = [
  'sheet', 'bed sheet', 'deep pocket',
  'juegos de s sábanas y fundas de almohada',
  'colong', 'shhet', 'bedset',
];

function containsAny(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function detectSize(text: string): string {
  const lower = text.toLowerCase();
  // Check in priority order (california king before king)
  if (lower.includes('california king')) return '|California King';
  if (lower.includes('queen')) return '|Queen';
  if (lower.includes('king')) return '|King';
  if (lower.includes('full')) return '|Full';
  if (lower.includes('twin')) return '|Twin';
  return '';
}

/**
 * Classify a keyword or search term into a syntax group.
 * Follows the exact priority order from the user's Excel formula.
 */
export function classifySyntax(text: string): string {
  if (!text || text.trim() === '') return 'Irrelevant';

  // 1. Branded
  if (containsAny(text, ['decolure'])) {
    return 'Branded Keyword';
  }

  // 2. Competitor
  if (containsAny(text, COMPETITOR_TERMS)) {
    return 'Competitor Branded Keyword';
  }

  // 3. Irrelevant
  if (containsAny(text, IRRELEVANT_TERMS)) {
    return 'Irrelevant';
  }

  // 4. Cooling (checked first)
  if (containsAny(text, COOLING_TERMS)) {
    return 'Cooling' + detectSize(text);
  }

  // 5. Bamboo
  if (containsAny(text, BAMBOO_TERMS)) {
    return 'Bamboo' + detectSize(text);
  }

  // 6. Generic
  if (containsAny(text, GENERIC_TERMS)) {
    return 'Generic';
  }

  // 7. Fallback
  return 'Irrelevant';
}
