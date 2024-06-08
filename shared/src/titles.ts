export enum TribesmanTitle {
   gardener,
   berrymuncher,
   sprinter,
   builder,
   packrat,
   wellful,
   yetisbane,
   shrewd,
   bloodaxe,
   deathbringer,
   winterswrath
}

export interface TitleGenerationInfo {
   readonly title: TribesmanTitle;
   readonly displayOption: number;
}

export interface TribesmanTitleInfo {
   readonly tier: number;
   readonly name: string;
}

export const TRIBESMAN_TITLE_RECORD: Record<TribesmanTitle, TribesmanTitleInfo> = {
   [TribesmanTitle.gardener]: {
      tier: 1,
      name: "Gardener"
   },
   [TribesmanTitle.berrymuncher]: {
      tier: 1,
      name: "Berry-muncher"
   },
   [TribesmanTitle.sprinter]: {
      tier: 1,
      name: "Sprinter"
   },
   [TribesmanTitle.builder]: {
      tier: 1,
      name: "Builder"
   },
   [TribesmanTitle.packrat]: {
      tier: 1,
      name: "Packrat"
   },
   [TribesmanTitle.wellful]: {
      tier: 1,
      name: "Wellful"
   },
   [TribesmanTitle.yetisbane]: {
      tier: 2,
      name: "Yetisbane"
   },
   [TribesmanTitle.shrewd]: {
      tier: 2,
      name: "Shrewd"
   },
   [TribesmanTitle.bloodaxe]: {
      tier: 2,
      name: "Bloodaxe"
   },
   [TribesmanTitle.deathbringer]: {
      tier: 3,
      name: "Deathbringer"
   },
   [TribesmanTitle.winterswrath]: {
      tier: 3,
      name: "Winterswrath"
   }
};