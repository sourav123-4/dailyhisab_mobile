import { GearId } from '../types/fitness';
import { getActiveGeminiApiKey } from './geminiAiService';
import { geminiGenerateContent, isAiProxyAvailable } from './aiProxy';

export class EquipmentScanUnavailableError extends Error {}

export type EquipmentScanResult = {
  /** Equipment the plan builder knows, found in the photo. */
  gear: GearId[];
  /** Everything recognised, in plain words, e.g. "Pair of 10 kg dumbbells". */
  items: string[];
  /** What the photo shows when no workout equipment was found. */
  seen?: string;
};

const GEAR_IDS: GearId[] = ['dumbbells', 'barbell', 'bench', 'pullup_bar', 'dip_station', 'cable', 'machines', 'kettlebell'];

const PROMPT = `You identify workout equipment in a photo for a fitness app.
Reply with ONLY a JSON object:
{
  "items": [{ "name": "short description, e.g. 'Pair of 5 kg dumbbells'", "category": "<one category>" }],
  "seen": "what the photo mainly shows, in a few words"
}
Categories (use exactly one per item):
- "dumbbells": dumbbells of any kind, adjustable dumbbells
- "kettlebell": kettlebells
- "barbell": barbell, EZ bar, weight plates, squat rack, Smith machine
- "bench": flat, incline or adjustable workout bench
- "pullup_bar": pull-up bar, doorway bar, chin-up station, power tower top
- "dip_station": dip bars, parallel bars, power tower dip handles
- "cable": cable machine, pulley tower, lat pulldown, cable crossover
- "machines": any other gym machine (leg press, chest press machine, calf raise machine, back extension bench, treadmill, bike)
- "other": anything else useful for training (resistance band, yoga mat, skipping rope, chair, stairs)
List each distinct piece once. If there is no workout equipment, return "items": [].`;

/** Reads which workout equipment is in a photo using Gemini Vision (personal key or the signed-in proxy). */
export async function scanEquipmentPhoto(base64Jpeg: string): Promise<EquipmentScanResult> {
  const apiKey = await getActiveGeminiApiKey();
  if (!apiKey && !isAiProxyAvailable()) {
    throw new EquipmentScanUnavailableError('Sign in (or add an AI key in Coach settings) to scan equipment.');
  }
  const data = base64Jpeg.replace(/^data:image\/\w+;base64,/, '');
  for (const model of ['gemini-2.5-flash', 'gemini-2.5-flash-lite']) {
    try {
      const res = await geminiGenerateContent(model, {
        contents: [{ parts: [{ text: PROMPT }, { inlineData: { mimeType: 'image/jpeg', data } }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
      }, apiKey);
      const text = res.ok ? res.data?.candidates?.[0]?.content?.parts?.[0]?.text : null;
      if (!text) continue;
      const parsed = JSON.parse(text);
      const items: { name: string; category: string }[] = Array.isArray(parsed.items) ? parsed.items : [];
      const gear = [...new Set(items.map(i => String(i.category)).filter((c): c is GearId => GEAR_IDS.includes(c as GearId)))];
      return {
        gear,
        items: items.map(i => String(i.name || i.category)).filter(Boolean),
        seen: parsed.seen ? String(parsed.seen) : undefined,
      };
    } catch {
      // try the next model
    }
  }
  throw new Error('Could not read this photo.');
}
