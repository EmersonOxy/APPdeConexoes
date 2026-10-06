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
