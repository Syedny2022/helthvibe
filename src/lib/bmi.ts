// ============================================================
// BMI calculation library
// Pure functions, runs 100% client-side for privacy.
// ============================================================

export type UnitSystem = 'metric' | 'imperial';

export interface BMICategory {
  id: 'underweight' | 'normal' | 'overweight' | 'obese';
  label: string;
  min: number;
  max: number;
  color: string;
  description: string;
}

// Standard WHO adult BMI categories
export const BMI_CATEGORIES: BMICategory[] = [
  {
    id: 'underweight',
    label: 'Underweight',
    min: 0,
    max: 18.5,
    color: '#3b82f6',
    description: 'Below the healthy range. Consider speaking with a healthcare provider.',
  },
  {
    id: 'normal',
    label: 'Healthy range',
    min: 18.5,
    max: 25,
    color: '#10b981',
    description: 'Within the standard healthy range for adults.',
  },
  {
    id: 'overweight',
    label: 'Overweight',
    min: 25,
    max: 30,
    color: '#f59e0b',
    description: 'Above the healthy range. Lifestyle changes can help.',
  },
  {
    id: 'obese',
    label: 'Obese',
    min: 30,
    max: Infinity,
    color: '#ef4444',
    description: 'Significantly above the healthy range. A clinician can offer guidance.',
  },
];

// Asian-adjusted thresholds (per WHO recommendations for Asian populations)
export const BMI_CATEGORIES_ASIAN: BMICategory[] = [
  {
    id: 'underweight',
    label: 'Underweight',
    min: 0,
    max: 18.5,
    color: '#3b82f6',
    description: 'Below the healthy range.',
  },
  {
    id: 'normal',
    label: 'Healthy range',
    min: 18.5,
    max: 23,
    color: '#10b981',
    description: 'Within the Asian-adjusted healthy range.',
  },
  {
    id: 'overweight',
    label: 'Overweight',
    min: 23,
    max: 27.5,
    color: '#f59e0b',
    description: 'Above the Asian-adjusted healthy range.',
  },
  {
    id: 'obese',
    label: 'Obese',
    min: 27.5,
    max: Infinity,
    color: '#ef4444',
    description: 'Significantly above the healthy range.',
  },
];

export function getCategory(bmi: number, asianAdjusted = false): BMICategory {
  const cats = asianAdjusted ? BMI_CATEGORIES_ASIAN : BMI_CATEGORIES;
  return cats.find((c) => bmi >= c.min && bmi < c.max) ?? cats[cats.length - 1];
}

export interface BMIInput {
  heightCm: number;  // canonical height in centimeters
  weightKg: number;  // canonical weight in kilograms
}

export interface BMIResult {
  bmi: number;
  category: BMICategory;
  healthyWeightRangeKg: { min: number; max: number };
  healthyWeightRangeLb: { min: number; max: number };
}

/**
 * Compute BMI from canonical (metric) inputs.
 * Formula: weight (kg) / height (m)^2
 */
export function calculateBMI({ heightCm, weightKg }: BMIInput, asianAdjusted = false): BMIResult {
  if (heightCm <= 0 || weightKg <= 0) {
    throw new Error('Height and weight must be positive numbers.');
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  // Healthy weight range is the weight range that puts BMI between 18.5 and 24.9
  const healthyMinKg = 18.5 * heightM * heightM;
  const healthyMaxKg = 24.9 * heightM * heightM;

  return {
    bmi: Math.round(bmi * 10) / 10,
    category: getCategory(bmi, asianAdjusted),
    healthyWeightRangeKg: {
      min: Math.round(healthyMinKg * 10) / 10,
      max: Math.round(healthyMaxKg * 10) / 10,
    },
    healthyWeightRangeLb: {
      min: Math.round(healthyMinKg * 2.20462 * 10) / 10,
      max: Math.round(healthyMaxKg * 2.20462 * 10) / 10,
    },
  };
}

/**
 * Convert imperial height (feet + inches) to centimeters.
 */
export function ftInToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

/**
 * Convert centimeters to feet + inches.
 */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

/**
 * Convert pounds to kilograms.
 */
export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

/**
 * Convert kilograms to pounds.
 */
export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

/**
 * Get all BMI categories as a list, used for legend / chart display.
 */
export function getCategoryList(asianAdjusted = false): BMICategory[] {
  return asianAdjusted ? BMI_CATEGORIES_ASIAN : BMI_CATEGORIES;
}

// ============================================================
// Ideal-weight formulas
// All formulas take height in centimeters and return weight in kg.
// Each formula is widely cited; none is the single "right" answer.
// ============================================================

export type Sex = 'male' | 'female';
export type Frame = 'small' | 'medium' | 'large';

export interface IdealWeightResult {
  formula: string;
  weightKg: number;
  weightLb: number;
  description: string;
  citation: string;
}

interface IdealWeightInput {
  heightCm: number;
  sex: Sex;
  frame: Frame;
}

/**
 * Convert height in cm to total inches (rounded).
 */
function cmToIn(cm: number): number {
  return cm / 2.54;
}

/**
 * Devine formula (1974) — the most-cited clinical formula. Originally
 * developed for drug-dosing; widely used as an "ideal weight" estimate.
 * Men: 50 kg + 2.3 kg per inch over 5 ft (152.4 cm).
 * Women: 45.5 kg + 2.3 kg per inch over 5 ft.
 */
function devine({ heightCm, sex }: IdealWeightInput): number {
  const inchesOver5ft = Math.max(0, cmToIn(heightCm) - 60);
  const baseKg = sex === 'male' ? 50 : 45.5;
  const perInchKg = 2.3;
  return baseKg + perInchKg * inchesOver5ft;
}

/**
 * Robinson formula (1983) — a revision of Devine using newer data.
 * Men: 52 kg + 1.9 kg per inch over 5 ft.
 * Women: 49 kg + 1.7 kg per inch over 5 ft.
 */
function robinson({ heightCm, sex }: IdealWeightInput): number {
  const inchesOver5ft = Math.max(0, cmToIn(heightCm) - 60);
  const baseKg = sex === 'male' ? 52 : 49;
  const perInchKg = sex === 'male' ? 1.9 : 1.7;
  return baseKg + perInchKg * inchesOver5ft;
}

/**
 * Miller formula (1983) — another revision; tends to produce the
 * lowest estimates.
 * Men: 56.2 kg + 1.41 kg per inch over 5 ft.
 * Women: 53.1 kg + 1.36 kg per inch over 5 ft.
 */
function miller({ heightCm, sex }: IdealWeightInput): number {
  const inchesOver5ft = Math.max(0, cmToIn(heightCm) - 60);
  const baseKg = sex === 'male' ? 56.2 : 53.1;
  const perInchKg = sex === 'male' ? 1.41 : 1.36;
  return baseKg + perInchKg * inchesOver5ft;
}

/**
 * Hamwi formula (1964) — one of the earliest; tends to produce the
 * highest estimates.
 * Men: 48 kg + 2.7 kg per inch over 5 ft.
 * Women: 45.5 kg + 2.2 kg per inch over 5 ft.
 */
function hamwi({ heightCm, sex }: IdealWeightInput): number {
  const inchesOver5ft = Math.max(0, cmToIn(heightCm) - 60);
  const baseKg = sex === 'male' ? 48 : 45.5;
  const perInchKg = sex === 'male' ? 2.7 : 2.2;
  return baseKg + perInchKg * inchesOver5ft;
}

/**
 * Apply frame-size adjustment: small frame –10%, large +10%.
 */
function applyFrame(weightKg: number, frame: Frame): number {
  if (frame === 'small') return weightKg * 0.9;
  if (frame === 'large') return weightKg * 1.1;
  return weightKg;
}

/**
 * BMI-range ideal weight — the weight that puts your BMI in the
 * WHO healthy range (18.5–24.9).
 */
function bmiRange({ heightCm }: IdealWeightInput): { min: number; max: number } {
  const heightM = heightCm / 100;
  return {
    min: 18.5 * heightM * heightM,
    max: 24.9 * heightM * heightM,
  };
}

/**
 * Compute ideal weight using five evidence-based formulas.
 * Results are returned after frame-size adjustment (where applicable).
 */
export function calculateIdealWeight(input: IdealWeightInput): IdealWeightResult[] {
  const { frame } = input;

  const devineKg = applyFrame(devine(input), frame);
  const robinsonKg = applyFrame(robinson(input), frame);
  const millerKg = applyFrame(miller(input), frame);
  const hamwiKg = applyFrame(hamwi(input), frame);
  const bmi = bmiRange(input);

  return [
    {
      formula: 'Devine (1974)',
      weightKg: Math.round(devineKg * 10) / 10,
      weightLb: Math.round(devineKg * 2.20462 * 10) / 10,
      description: 'The most-cited clinical formula. Originally developed for drug dosing.',
      citation: 'Devine BJ. Drug Intell Clin Pharm. 1974.',
    },
    {
      formula: 'Robinson (1983)',
      weightKg: Math.round(robinsonKg * 10) / 10,
      weightLb: Math.round(robinsonKg * 2.20462 * 10) / 10,
      description: 'A revision of Devine using more recent population data.',
      citation: 'Robinson JD et al. Drug Intell Clin Pharm. 1983.',
    },
    {
      formula: 'Miller (1983)',
      weightKg: Math.round(millerKg * 10) / 10,
      weightLb: Math.round(millerKg * 2.20462 * 10) / 10,
      description: 'Another Devine revision. Tends to produce lower estimates.',
      citation: 'Miller DR et al. Drug Intell Clin Pharm. 1983.',
    },
    {
      formula: 'Hamwi (1964)',
      weightKg: Math.round(hamwiKg * 10) / 10,
      weightLb: Math.round(hamwiKg * 2.20462 * 10) / 10,
      description: 'One of the earliest formulas. Tends to produce higher estimates.',
      citation: 'Hamwi GJ. Am J Clin Nutr. 1964.',
    },
    {
      formula: 'BMI 18.5–24.9',
      weightKg: 0, // placeholder; rendered as range
      weightLb: 0,
      description: `Weight range for BMI 18.5–24.9 at this height.`,
      citation: 'World Health Organization. WHO technical report 854. 1995.',
    },
  ].map((r) => {
    if (r.formula.startsWith('BMI')) {
      const minLb = bmi.min * 2.20462;
      const maxLb = bmi.max * 2.20462;
      return {
        ...r,
        // For BMI range we expose min/max separately; consumer reads
        // bmiRangeMinKg/MaxKg via getBmiRangeIdeal below.
        weightKg: Math.round(((bmi.min + bmi.max) / 2) * 10) / 10,
        weightLb: Math.round(((minLb + maxLb) / 2) * 10) / 10,
      } as IdealWeightResult;
    }
    return r;
  });
}

/**
 * Return the BMI-range ideal weight (min and max) separately so the
 * UI can show the band rather than a midpoint.
 */
export function getBmiRangeIdeal({ heightCm }: IdealWeightInput): {
  minKg: number;
  maxKg: number;
  minLb: number;
  maxLb: number;
} {
  const r = bmiRange({ heightCm, sex: 'male', frame: 'medium' });
  return {
    minKg: Math.round(r.min * 10) / 10,
    maxKg: Math.round(r.max * 10) / 10,
    minLb: Math.round(r.min * 2.20462 * 10) / 10,
    maxLb: Math.round(r.max * 2.20462 * 10) / 10,
  };
}
