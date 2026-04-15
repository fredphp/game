import { NextResponse } from 'next/server';

interface SdPromptRequest {
  heroName: string;
  heroTitle: string;
  style?: string;
  keywords?: string[];
  additionalDesc?: string;
}

const PROMPT_TEMPLATES = {
  warrior: 'Chinese ancient warrior general {name}, {title}, imposing figure wearing heavy armor, holding a signature weapon, flowing cape, battlefield background, dramatic lighting, warring states period, epic fantasy art style, highly detailed, 8k quality, cinematic composition',
  strategist: 'Chinese ancient strategist {name}, {title}, elegant figure in flowing scholar robes, holding a jade fan or bamboo scroll, surrounded by mystical energy, mountain temple background, warring states period, mystical fantasy art, 8k quality, soft ethereal lighting',
  assassin: 'Chinese ancient assassin {name}, {title}, lean muscular figure in dark leather garb, carrying concealed weapons, shadow environment, mysterious and dangerous aura, warring states period, dark fantasy art, 8k quality',
  ruler: 'Chinese ancient emperor {name}, {title}, regal noble figure wearing golden dragon robe, divine imperial aura, warm golden light, ancient Chinese palace interior, 8k quality, majestic composition',
};

const NEGATIVE_PROMPT = 'low quality, blurry, deformed, bad anatomy, extra limbs, watermark, text, logo, signature, worst quality, jpeg artifacts';

function composePrompt(request: SdPromptRequest): { prompt: string; negativePrompt: string } {
  const { heroName, heroTitle, style, keywords, additionalDesc } = request;

  // Determine role template
  let template = PROMPT_TEMPLATES.warrior;
  if (heroTitle?.includes('谋') || heroTitle?.includes('策') || heroTitle?.includes('圣')) {
    template = PROMPT_TEMPLATES.strategist;
  } else if (heroTitle?.includes('刺')) {
    template = PROMPT_TEMPLATES.assassin;
  } else if (heroTitle?.includes('帝') || heroTitle?.includes('王')) {
    template = PROMPT_TEMPLATES.ruler;
  }

  let prompt = template
    .replace('{name}', heroName)
    .replace('{title}', heroTitle);

  // Add style
  if (style) {
    prompt += `, ${style} style`;
  }

  // Add keywords
  if (keywords && keywords.length > 0) {
    prompt += `, ${keywords.join(', ')}`;
  }

  // Add additional description
  if (additionalDesc) {
    prompt += `, ${additionalDesc}`;
  }

  return { prompt, negativePrompt: NEGATIVE_PROMPT };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, negativePrompt } = composePrompt(body);

    return NextResponse.json({
      success: true,
      prompt,
      negativePrompt,
      recommendedSize: '768x1344',
      recommendedSteps: 30,
      recommendedCfgScale: 7.5,
      sampler: 'DPM++ 2M Karras',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
