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

export function parseFeedFilters(params: Record<string, string | string[] | undefined>): FeedFilters {
 const value=(key:string)=>typeof params[key]==="string" ? params[key] as string : undefined;
 return {min_age:Number(value('min_age')??18),max_age:Number(value('max_age')??50),complete:value('complete')==='true',
 ...(value('interest')?{interest:value('interest')} : {}),...(value('objective')?{objective:value('objective')} : {}),...(value('min_score')?{min_score:Number(value('min_score'))} : {})};
}
export function feedQuery(filters:FeedFilters){
 const query=new URLSearchParams({min_age:String(filters.min_age),max_age:String(filters.max_age)});
 if(filters.interest)query.set('interest',filters.interest);if(filters.objective)query.set('objective',filters.objective);
 if(filters.min_score)query.set('min_score',String(filters.min_score));if(filters.complete)query.set('complete','true');return query.toString();
}
