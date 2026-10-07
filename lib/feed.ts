export type FeedProfile = {
  user_id: string;
  display_name: string;
  age: number;
  city: string;
  state: string;
  about: string;
  interests: string[];
  objectives: string[];
};

export type FeedResult = { profiles: FeedProfile[]; error?: string };

export type FeedFilters = { min_age: number; max_age: number; min_score?: number; interest?: string; objective?: string; complete: boolean };
export const defaultFeedFilters: FeedFilters = { min_age: 18, max_age: 50, complete: false };
