export interface UGCRequestOptions {
  characterImage: {
    data: string; // base64 without prefix
    mimeType: string;
    previewUrl: string;
    name?: string;
  };
  productImage: {
    data: string; // base64 without prefix
    mimeType: string;
    previewUrl: string;
    name?: string;
  };
  platform: 'tiktok' | 'reels' | 'shorts' | 'shopee';
  language: 'id_casual' | 'id_jaksel' | 'id_formal' | 'en_casual' | 'en_genz';
  hookStyle: 'curiosity' | 'storytelling' | 'shocking_regret' | 'relatable_pov' | 'unboxing' | 'before_after' | 'problem_solver';
  productName?: string;
  productDescription?: string;
  targetAudience?: string;
  productKeyPoints?: string;
  creatorVibeNotes?: string;
  durationTarget?: '15s' | '30s' | '45s' | '60s';
}

export interface StoryboardShot {
  shotNumber: number;
  timeframe: string; // e.g. "0:00 - 0:03"
  shotType: string; // e.g. "Close-Up", "Medium Shot", "Top-down B-roll"
  visualDirection: string;
  spokenDialogue: string;
  textOverlay: string;
  sfxOrMusicTip: string;
}

export interface UGCScriptResult {
  id: string;
  timestamp: number;
  title: string;
  platform: string;
  language: string;
  hookStyle: string;
  
  // The 6 strict sections
  analisisVisual: {
    characterVibe: string;
    productCoreSellingPoints: string;
    synergyStrategy: string;
    audienceMatch: string;
  };
  hook: {
    timeframe: string; // "0-3 detik"
    visualAction: string;
    openingLine: string;
    screenText: string;
    audioTip: string;
    alternativeHooks?: string[];
  };
  problem: {
    timeframe: string;
    painPointDescription: string;
    visualAction: string;
    spokenLine: string;
    onScreenText: string;
  };
  solution: {
    timeframe: string;
    introductionAction: string;
    demonstrationSteps: {
      step: number;
      action: string;
      dialogue: string;
      brollSuggestion: string;
    }[];
    keyBenefitHighlight: string;
  };
  cta: {
    timeframe: string;
    closingAction: string;
    spokenLine: string;
    onScreenSticker: string;
    actionType: string; // e.g. "Klik Keranjang Kuning", "Link in Bio", "Comment 'MAU'"
  };
  caption: {
    hookLine: string;
    bodyText: string;
    ctaLine: string;
    hashtags: string[];
    fullCaptionReadyToPost: string;
  };

  // Extra director tools
  storyboard: StoryboardShot[];
  directorTips: string[];
  fullSpokenScript: string;
}

export interface PresetItem {
  id: string;
  name: string;
  role: 'character' | 'product';
  tag: string;
  description: string;
  imageUrl: string;
}

export interface GeneratedVideoItem {
  id: string;
  operationName: string;
  videoUrl?: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  thumbnailUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  timestamp: number;
}

export interface GeneratedImageItem {
  id: string;
  imageUrl: string;
  prompt: string;
  mode: 'create' | 'edit';
  sourceImageUrl?: string;
  aspectRatio: string;
  timestamp: number;
}
