export type RecognizedAction =
  | 'split'
  | 'trim'
  | 'move'
  | 'delete'
  | 'volume'
  | 'fade'
  | 'mute'
  | 'effect'
  | 'transition'
  | 'remotion'
  | 'undo'
  | 'export'
  | 'unknown';

export interface ParsedUserIntent {
  originalPrompt: string;
  detectedLanguage: 'en' | 'ar';
  primaryAction: RecognizedAction;
  keywords: string[];
}

const ARABIC_ACTION_KEYWORDS: Record<RecognizedAction, string[]> = {
  split: ['قص', 'اقطع', 'قسم', 'جزأ', 'افصل'],
  trim: ['قصر', 'شيل من الاول', 'شيل من الاخر', 'تريم'],
  move: ['حرك', 'انقل', 'وديه', 'حطه بعد'],
  delete: ['احذف', 'امسح', 'شيل', 'الغ'],
  volume: ['علي الصوت', 'وطي الصوت', 'صوت', 'مستوى الصوت'],
  fade: ['تلاشي', 'فيد', 'فيد ان', 'فيد اوت'],
  mute: ['كتم', 'ميوت', 'اكتم', 'اسكت'],
  effect: ['فلتر', 'تأثير', 'اضاءة', 'كونتراست', 'الوان'],
  transition: ['انتقال', 'ديزولف', 'تداخل', 'ترانزيشن'],
  remotion: ['عنوان', 'انترو', 'اوترو', 'تايتل', 'شريط اخبار', 'موشن'],
  undo: ['تراجع', 'ارجع في كلامك', 'الغي اللي عملته', 'اندو'],
  export: ['صدر', 'رندر', 'اخرج الفيديو', 'حفظ الفيديو'],
  unknown: [],
};

const ENGLISH_ACTION_KEYWORDS: Record<RecognizedAction, string[]> = {
  split: ['split', 'cut', 'divide', 'slice'],
  trim: ['trim', 'shorten', 'crop'],
  move: ['move', 'shift', 'reposition', 'place'],
  delete: ['delete', 'remove', 'erase'],
  volume: ['volume', 'louder', 'quieter', 'gain', 'sound'],
  fade: ['fade', 'fade in', 'fade out', 'crossfade'],
  mute: ['mute', 'silence', 'unmute'],
  effect: ['effect', 'filter', 'brightness', 'contrast', 'saturation', 'blur'],
  transition: ['transition', 'dissolve', 'cross-dissolve', 'cut'],
  remotion: ['title', 'lower third', 'intro', 'outro', 'motion graphics'],
  undo: ['undo', 'revert', 'cancel last'],
  export: ['export', 'render', 'save video'],
  unknown: [],
};

export class MultiLanguageIntentParser {
  /**
   * Detects whether text contains Arabic characters.
   */
  public detectLanguage(text: string): 'en' | 'ar' {
    const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
    return arabicRegex.test(text) ? 'ar' : 'en';
  }

  /**
   * Parses user prompt in English or Arabic into structured intent.
   */
  public parseIntent(prompt: string): ParsedUserIntent {
    const language = this.detectLanguage(prompt);
    const lower = prompt.toLowerCase().trim();
    const keywordsDict = language === 'ar' ? ARABIC_ACTION_KEYWORDS : ENGLISH_ACTION_KEYWORDS;

    let detectedAction: RecognizedAction = 'unknown';
    const matchedKeywords: string[] = [];

    for (const [action, keywords] of Object.entries(keywordsDict) as [RecognizedAction, string[]][]) {
      for (const kw of keywords) {
        if (lower.includes(kw)) {
          detectedAction = action;
          matchedKeywords.push(kw);
          break;
        }
      }
      if (detectedAction !== 'unknown') break;
    }

    return {
      originalPrompt: prompt,
      detectedLanguage: language,
      primaryAction: detectedAction,
      keywords: matchedKeywords,
    };
  }
}
