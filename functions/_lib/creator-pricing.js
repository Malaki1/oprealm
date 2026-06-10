export const MEMBERSHIP_TIERS = {
  explorer: { label: "Explorer Membership", amountCents: 999, credits: 100 },
  creator: { label: "Creator Membership", amountCents: 2499, credits: 250 },
  pro: { label: "Elite Creator Membership", amountCents: 4999, credits: 500 },
};

export const CREDIT_BUNDLES = {
  mini_boost: { label: "Mini Boost", amountCents: 1000, credits: 100 },
  creator_boost: { label: "Creator Boost", amountCents: 2500, credits: 250 },
  pro_boost: { label: "Pro Boost", amountCents: 5000, credits: 500 },
};

export const CREATOR_CREDIT_COSTS = {
  characterImage: 18,
  worldImage: 20,
  storyDraft: 6,
  storyPlan: 5,
  sceneImage: 24,
  sceneVideoStandard8s: 325,
  storyBranch: 24,
  gameCover: 24,
  referenceBoard: 24,
  robloxWallpaper: 8,
  storyReaderPerThousandCharacters: 5,
  movieNarrationPerThousandCharacters: 10,
  movieMusicPerTenSeconds: 3,
};

export function storyReaderCredits(characterCount) {
  return Math.max(10, Math.ceil(Math.max(1, Number(characterCount) || 0) / 1000) * CREATOR_CREDIT_COSTS.storyReaderPerThousandCharacters);
}

export function movieNarrationCredits(characterCount) {
  return Math.max(10, Math.ceil(Math.max(1, Number(characterCount) || 0) / 1000) * CREATOR_CREDIT_COSTS.movieNarrationPerThousandCharacters);
}

export function movieMusicCredits(seconds) {
  return Math.max(3, Math.ceil(Math.max(1, Number(seconds) || 0) / 10) * CREATOR_CREDIT_COSTS.movieMusicPerTenSeconds);
}
