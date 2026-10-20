// ============================================================
// Helthvibe — Extended Health Math Library
// Pure functions, runs 100% client-side for privacy.
// All formulas grounded in peer-reviewed clinical literature.
// ============================================================

// ============================================================
// BMI re-export (canonical home is bmi.ts; exposed here for
// single-import convenience across calculators)
// ============================================================

export {
  calculateBMI,
  getCategory,
  getCategoryList,
  BMI_CATEGORIES,
  BMI_CATEGORIES_ASIAN,
  type BMICategory,
  type BMIInput,
  type BMIResult,
  type UnitSystem,
} from '@lib/bmi';

// ============================================================
// Unit conversions
// ============================================================

/** Convert centimeters to inches (exact: 1 in = 2.54 cm). */
export function cmToIn(cm: number): number {
  return cm / 2.54;
}

/** Convert inches to centimeters. */
export function inToCm(inches: number): number {
  return inches * 2.54;
}

/** Convert kilograms to pounds (1 kg = 2.20462 lb). */
export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

/** Convert pounds to kilograms (1 lb = 0.45359237 kg). */
export function lbToKg(lb: number): number {
  return lb * 0.45359237;
}

/** Convert feet + inches to centimeters. */
export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54;
}

/** Convert centimeters to feet + inches. */
export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches - feet * 12);
  return { feet, inches };
}

/** Round a number to 1 decimal place. */
export function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Round a number to 2 decimal places. */
export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// 1. Body Fat % — Deurenberg formula (1991)
// ============================================================
//
// Deurenberg P, Weststrate JA, Seidell JC.
// "Body mass index as a measure of body fatness: age- and sex-specific
//  prediction formulas." Br J Nutr. 1991;65(2):105-114.
//
// BF% = (1.20 × BMI) + (0.23 × age) − (10.8 × sex) − 5.4
//   where sex: male = 1, female = 0
//
// Standard error of estimate ≈ 4%, so individual readings can
// deviate by ±4 percentage points from true DEXA-measured BF%.
// Use for population estimates and tracking trends, not diagnosis.

export type Sex = 'male' | 'female';

export interface BodyFatInput {
  bmi: number;
  age: number;       // years
  sex: Sex;
}

export function calculateBodyFatDeurenberg({ bmi, age, sex }: BodyFatInput): number {
  const sexValue = sex === 'male' ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * age - 10.8 * sexValue - 5.4;
  return r1(bf);
}

// ACE healthy body-fat % bands by sex
export interface BFCategory {
  id: 'essential' | 'athletes' | 'fitness' | 'average' | 'elevated';
  label: string;
  min: number;
  max: number;
  description: string;
}

export const BF_CATEGORIES_MALE: BFCategory[] = [
  { id: 'essential',  label: 'Essential fat',  min: 0,  max: 5,  description: 'Below this is incompatible with health.' },
  { id: 'athletes',  label: 'Athletes',       min: 5,  max: 14, description: 'Typical for competitive endurance/strength athletes.' },
  { id: 'fitness',   label: 'Fitness',        min: 14, max: 18, description: 'Lean and visibly muscular.' },
  { id: 'average',   label: 'Average',        min: 18, max: 25, description: 'Within the general-population healthy range.' },
  { id: 'elevated',  label: 'Elevated',       min: 25, max: 100, description: 'Above the recommended range for men.' },
];

export const BF_CATEGORIES_FEMALE: BFCategory[] = [
  { id: 'essential',  label: 'Essential fat',  min: 0,  max: 13, description: 'Below this can disrupt hormonal function.' },
  { id: 'athletes',   label: 'Athletes',       min: 13, max: 21, description: 'Typical for competitive athletes.' },
  { id: 'fitness',    label: 'Fitness',        min: 21, max: 25, description: 'Lean with visible muscle definition.' },
  { id: 'average',    label: 'Average',        min: 25, max: 32, description: 'Within the general-population healthy range.' },
  { id: 'elevated',   label: 'Elevated',       min: 32, max: 100, description: 'Above the recommended range for women.' },
];

export function getBfCategory(bf: number, sex: Sex): BFCategory {
  const cats = sex === 'male' ? BF_CATEGORIES_MALE : BF_CATEGORIES_FEMALE;
  return cats.find((c) => bf >= c.min && bf < c.max) ?? cats[cats.length - 1];
}

// ============================================================
// 2. Waist-to-Hip Ratio (WHR)
// ============================================================
//
// WHO Expert Consultation. Waist Circumference and Waist-Hip Ratio.
// Geneva: WHO, 2008.
//
// Cutoffs:
//   Men:   < 0.90 low risk | 0.90–0.99 moderate | ≥ 1.00 high
//   Women: < 0.80 low risk | 0.80–0.84 moderate | ≥ 0.85 high

export interface WHRInput {
  waistCm: number;
  hipCm: number;
  sex: Sex;
}

export function calculateWHR({ waistCm, hipCm }: WHRInput): number {
  return r2(waistCm / hipCm);
}

export interface WHRCategories {
  low: number;
  moderate: number;
  high: number;
}
export const WHR_CUTOFFS: Record<Sex, WHRCategories> = {
  male:   { low: 0.90, moderate: 0.99, high: 1.00 },
  female: { low: 0.80, moderate: 0.84, high: 0.85 },
};

export type WHRRisk = 'low' | 'moderate' | 'high';
export function getWHRRisk(ratio: number, sex: Sex): WHRRisk {
  const c = WHR_CUTOFFS[sex];
  if (ratio < c.low) return 'low';
  if (ratio <= c.moderate) return 'moderate';
  return 'high';
}

// ============================================================
// 3. Waist-to-Height Ratio (WHtR)
// ============================================================
//
// Ashwell M, Hsieh SD. "Six reasons why the waist-to-height ratio is a
// rapid and effective global indicator for health risks of obesity and
// how its use could simplify the international public health message
// on obesity." Int J Food Sci Nutr. 2005;56(5):303-307.
//
// Single cutoff across sexes and ethnicities: < 0.5 = healthy.
// 0.5–0.59 = increased risk | 0.60+ = substantially elevated risk.

export interface WHtRInput {
  waistCm: number;
  heightCm: number;
}

export function calculateWHtR({ waistCm, heightCm }: WHtRInput): number {
  return r2(waistCm / heightCm);
}

export interface WHtRCategory {
  id: 'healthy' | 'increased' | 'elevated';
  label: string;
  min: number;
  max: number;
  description: string;
}
export const WHTR_CATEGORIES: WHtRCategory[] = [
  { id: 'healthy',   label: 'Healthy',              min: 0,    max: 0.50, description: 'No elevated cardiometabolic risk.' },
  { id: 'increased', label: 'Increased risk',       min: 0.50, max: 0.60, description: 'Take action to reduce waist circumference.' },
  { id: 'elevated',  label: 'Substantially elevated', min: 0.60, max: 10,   description: 'Elevated cardiometabolic risk — talk to a clinician.' },
];

export function getWHtRCategory(ratio: number): WHtRCategory {
  return WHTR_CATEGORIES.find((c) => ratio >= c.min && ratio < c.max) ?? WHTR_CATEGORIES[WHTR_CATEGORIES.length - 1];
}

// ============================================================
// 4. BMI Prime
// ============================================================
//
// A simple dimensionless ratio: BMI divided by 25 (upper bound of
// the WHO healthy range). Useful for cross-population comparison.
//   < 0.74  severely underweight (BMI < 18.5)
//   0.74–0.99 within healthy range (BMI 18.5–24.9)
//   1.00–1.32 overweight (BMI 25–32.9)
//   ≥ 1.40 severely obese (BMI ≥ 35)

export function calculateBMIPrime(bmi: number): number {
  return r2(bmi / 25);
}

export interface BMIPrimeCategory {
  id: 'severe_under' | 'under' | 'normal' | 'over' | 'obese' | 'severe_obese';
  label: string;
  min: number;
  max: number;
}
export const BMIPRIME_CATEGORIES: BMIPrimeCategory[] = [
  { id: 'severe_under',  label: 'Severely underweight', min: 0,     max: 0.74 },
  { id: 'under',         label: 'Underweight',          min: 0.74,  max: 0.85 },
  { id: 'normal',        label: 'Healthy range',        min: 0.85,  max: 1.00 },
  { id: 'over',          label: 'Overweight',           min: 1.00,  max: 1.20 },
  { id: 'obese',         label: 'Obese',                min: 1.20,  max: 1.40 },
  { id: 'severe_obese',  label: 'Severely obese',       min: 1.40,  max: 100 },
];

export function getBMIPrimeCategory(prime: number): BMIPrimeCategory {
  return BMIPRIME_CATEGORIES.find((c) => prime >= c.min && prime < c.max) ?? BMIPRIME_CATEGORIES[BMIPRIME_CATEGORIES.length - 1];
}

// ============================================================
// 5. Body Surface Area (BSA) — Mosteller
// ============================================================
//
// Mosteller RD. "Simplified calculation of body surface area." N Engl
// J Med. 1987;317(17):1098.
//   BSA (m²) = √(height_cm × weight_kg / 3600)
//
// Used for chemotherapy dosing, burn-area calculation, cardiac index.

export interface BSAInput {
  heightCm: number;
  weightKg: number;
}

export function calculateBSA({ heightCm, weightKg }: BSAInput): number {
  return r2(Math.sqrt((heightCm * weightKg) / 3600));
}

// Reference range: average adult BSA is ~1.9 m² (men ~2.0, women ~1.7)
export interface BSACategory {
  id: 'small' | 'average' | 'large';
  label: string;
  min: number;
  max: number;
}
export const BSA_REFERENCE: BSACategory[] = [
  { id: 'small',   label: 'Below average', min: 0,    max: 1.6 },
  { id: 'average', label: 'Average',       min: 1.6,  max: 2.1 },
  { id: 'large',   label: 'Above average', min: 2.1,  max: 10 },
];

export function getBSACategory(bsa: number): BSACategory {
  return BSA_REFERENCE.find((c) => bsa >= c.min && bsa < c.max) ?? BSA_REFERENCE[BSA_REFERENCE.length - 1];
}

// ============================================================
// 6. Basal Metabolic Rate (BMR) — Mifflin-St Jeor (1990)
// ============================================================
//
// Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
// "A new predictive equation for resting energy expenditure in
// healthy individuals." Am J Clin Nutr. 1990;51(2):241-247.
//
// Men:   BMR = 10×weight(kg) + 6.25×height(cm) − 5×age + 5
// Women: BMR = 10×weight(kg) + 6.25×height(cm) − 5×age − 161
//
// Accuracy ±10% vs indirect calorimetry in healthy adults — the
// most accurate of the common predictive equations for non-obese,
// non-elderly populations.

export interface BMRInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}

export function calculateBMR({ weightKg, heightCm, age, sex }: BMRInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

// ============================================================
// 7. Total Daily Energy Expenditure (TDEE)
// ============================================================
//
// TDEE = BMR × Activity Factor
//
// Activity factors (Harris-Benedict / Mifflin widely cited):
//   Sedentary (desk job, no exercise):       1.2
//   Lightly active (1–3 days/wk):            1.375
//   Moderately active (3–5 days/wk):         1.55
//   Very active (6–7 days/wk):              1.725
//   Extra active (athlete + physical job):  1.9

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export const ACTIVITY_FACTORS: Record<ActivityLevel, { factor: number; label: string; description: string }> = {
  sedentary:    { factor: 1.2,    label: 'Sedentary',     description: 'Desk job, no exercise.' },
  light:        { factor: 1.375,  label: 'Lightly active', description: 'Light exercise 1–3 days/wk.' },
  moderate:     { factor: 1.55,   label: 'Moderately active', description: 'Moderate exercise 3–5 days/wk.' },
  very_active:  { factor: 1.725,  label: 'Very active',   description: 'Hard exercise 6–7 days/wk.' },
  extra_active: { factor: 1.9,    label: 'Extra active',  description: 'Very hard exercise + physical job.' },
};

export interface TDEEInput {
  bmr: number;
  activity: ActivityLevel;
}

export function calculateTDEE({ bmr, activity }: TDEEInput): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity].factor);
}

// ============================================================
// 8. Macro Split (grams of protein / carbs / fat)
// ============================================================
//
// Given a daily calorie target, split into grams by macronutrient %.
//   Protein:   4 kcal/g
//   Carbs:     4 kcal/g
//   Fat:       9 kcal/g

export type MacroStrategy =
  | 'balanced'        // 30P / 40C / 30F
  | 'high_protein'    // 35P / 35C / 30F
  | 'low_carb'        // 30P / 20C / 50F
  | 'mediterranean'   // 20P / 50C / 30F
  | 'keto'            // 25P / 5C / 70F
  | 'custom';

export interface MacroStrategyConfig {
  label: string;
  description: string;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export const MACRO_STRATEGIES: Record<Exclude<MacroStrategy, 'custom'>, MacroStrategyConfig> = {
  balanced:      { label: 'Balanced',         description: '30% protein · 40% carbs · 30% fat', proteinPct: 30, carbsPct: 40, fatPct: 30 },
  high_protein:  { label: 'High-protein',     description: '35% protein · 35% carbs · 30% fat', proteinPct: 35, carbsPct: 35, fatPct: 30 },
  low_carb:      { label: 'Low-carb',         description: '30% protein · 20% carbs · 50% fat', proteinPct: 30, carbsPct: 20, fatPct: 50 },
  mediterranean: { label: 'Mediterranean',    description: '20% protein · 50% carbs · 30% fat', proteinPct: 20, carbsPct: 50, fatPct: 30 },
  keto:          { label: 'Ketogenic',        description: '25% protein · 5% carbs · 70% fat',   proteinPct: 25, carbsPct: 5,  fatPct: 70 },
};

export interface MacroSplitInput {
  calories: number;
  strategy: MacroStrategy;
  customProteinPct?: number;
  customCarbsPct?: number;
  customFatPct?: number;
}

export interface MacroSplitResult {
  proteinG: number;
  carbsG: number;
  fatG: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export function calculateMacros({
  calories,
  strategy,
  customProteinPct,
  customCarbsPct,
  customFatPct,
}: MacroSplitInput): MacroSplitResult {
  let pPct: number, cPct: number, fPct: number;
  if (strategy === 'custom' && customProteinPct !== undefined && customCarbsPct !== undefined && customFatPct !== undefined) {
    pPct = customProteinPct; cPct = customCarbsPct; fPct = customFatPct;
  } else {
    const cfg = MACRO_STRATEGIES[strategy as Exclude<MacroStrategy, 'custom'>];
    pPct = cfg.proteinPct; cPct = cfg.carbsPct; fPct = cfg.fatPct;
  }
  return {
    proteinG: Math.round((calories * pPct / 100) / 4),
    carbsG:   Math.round((calories * cPct / 100) / 4),
    fatG:     Math.round((calories * fPct / 100) / 9),
    proteinPct: pPct,
    carbsPct:   cPct,
    fatPct:     fPct,
  };
}

// ============================================================
// 9. Calorie Deficit Planner
// ============================================================
//
// Given start weight, target weight, timeframe in days, and current
// daily intake, compute the required daily deficit and the resulting
// weekly weight-loss pace.
//
// 1 kg of body weight ≈ 7,700 kcal (Mifflin & St Jeor convention).

export interface CalorieDeficitInput {
  startWeightKg: number;
  targetWeightKg: number;
  days: number;
  currentDailyCalories: number;
  tdee: number;
}

export interface CalorieDeficitResult {
  toLoseKg: number;
  dailyDeficit: number;
  requiredDailyIntake: number;
  weeklyPaceKg: number;
  isSafe: boolean;
  safetyNote: string;
}

export function calculateCalorieDeficit({
  startWeightKg,
  targetWeightKg,
  days,
  currentDailyCalories,
  tdee,
}: CalorieDeficitInput): CalorieDeficitResult {
  const toLoseKg = startWeightKg - targetWeightKg;
  const totalDeficit = toLoseKg * 7700;
  const dailyDeficit = totalDeficit / days;
  const requiredDailyIntake = currentDailyCalories - dailyDeficit;
  const weeklyPaceKg = (toLoseKg / days) * 7;

  // Safety: deficit > 1000 kcal/day OR < 1200 kcal women / 1500 kcal men
  const isSafe = dailyDeficit <= 1000 && requiredDailyIntake >= 1200;
  const safetyNote = isSafe
    ? 'This deficit is within safe, sustainable ranges.'
    : '⚠️ This deficit exceeds 1,000 kcal/day or falls below minimum intake. Slower weight loss is safer and more sustainable.';

  return {
    toLoseKg: r1(toLoseKg),
    dailyDeficit: Math.round(dailyDeficit),
    requiredDailyIntake: Math.round(requiredDailyIntake),
    weeklyPaceKg: r2(weeklyPaceKg),
    isSafe,
    safetyNote,
  };
}

// ============================================================
// 10. Lean Body Mass — Boer formula (1984)
// ============================================================
//
// Boer P. "Estimated lean body mass as an index for normalization of
// body fluid volumes in man." Clin Sci. 1984;67(5):523-531.
//
// Men:   LBM = 0.407 × weight(kg) + 0.267 × height(cm) − 19.2
// Women: LBM = 0.252 × weight(kg) + 0.473 × height(cm) − 48.3

export interface LBMInput {
  weightKg: number;
  heightCm: number;
  sex: Sex;
}

export function calculateLBM({ weightKg, heightCm, sex }: LBMInput): number {
  const lbm = sex === 'male'
    ? 0.407 * weightKg + 0.267 * heightCm - 19.2
    : 0.252 * weightKg + 0.473 * heightCm - 48.3;
  return r1(lbm);
}

// ============================================================
// 11. Ponderal Index (PI)
// ============================================================
//
// Also called Rohrer's Index. weight / height³.
// Alternative to BMI with better scaling properties at height
// extremes — underweight shorter people get less extreme PI values,
// overweight taller people less too.
//
// Normal range: 11–14 kg/m³ for adults.

export function calculatePonderal(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return r2(weightKg / (heightM * heightM * heightM));
}

export interface PonderalCategory {
  id: 'underweight' | 'normal' | 'overweight';
  label: string;
  min: number;
  max: number;
  description: string;
}
export const PONDERAL_CATEGORIES: PonderalCategory[] = [
  { id: 'underweight', label: 'Underweight', min: 0,    max: 11,   description: 'Below the healthy Ponderal Index range.' },
  { id: 'normal',      label: 'Healthy range', min: 11, max: 14,  description: 'Within the typical adult Ponderal Index range.' },
  { id: 'overweight',  label: 'Above range',  min: 14, max: 1000, description: 'Above the typical adult Ponderal Index range.' },
];

export function getPonderalCategory(pi: number): PonderalCategory {
  return PONDERAL_CATEGORIES.find((c) => pi >= c.min && pi < c.max) ?? PONDERAL_CATEGORIES[PONDERAL_CATEGORIES.length - 1];
}
