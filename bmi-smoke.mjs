import { calculateIdealWeight, calculateBMI, getBmiRangeIdeal } from './src/lib/bmi.ts';

const heightCm = 170;
const ideal = calculateIdealWeight({ heightCm, sex: 'male', frame: 'medium' });
console.log('Ideal weight results for 170cm male, medium frame:');
ideal.forEach(r => console.log('  ' + r.formula + ': ' + r.weightKg.toFixed(1) + ' kg / ' + r.weightLb.toFixed(1) + ' lb'));

const range = getBmiRangeIdeal({ heightCm, sex: 'male', frame: 'medium' });
console.log('BMI 18.5-24.9 range: ' + range.minKg.toFixed(1) + '-' + range.maxKg.toFixed(1) + ' kg');

const bmi = calculateBMI({ heightCm, weightKg: 70 });
console.log('BMI for 170cm/70kg: ' + bmi.bmi + ' (' + bmi.category.label + ')');
console.log('Healthy weight range: ' + bmi.healthyWeightRangeKg.min + '-' + bmi.healthyWeightRangeKg.max + ' kg');
