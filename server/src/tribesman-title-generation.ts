import { TribesmanTitle, TitleGenerationInfo } from "webgl-test-shared/dist/titles";
import { randInt } from "webgl-test-shared/dist/utils";

// @Incomplete: no way to get packrat
export const enum TITLE_REWARD_CHANCES {
   BUILDER_REWARD_CHANCE = 0.1,
   BERRYMUNCHER_REWARD_CHANCE = 0.04,
   BLOODAXE_REWARD_CHANCE = 0.01,
   DEATHBRINGER_REWARD_CHANCE = 0.005,
   GARDENER_REWARD_CHANCE = 0.03,
   /** Chance of getting shrewd each second while researching */
   SHREWD_REWARD_CHANCE = 0.02,
   SPRINTER_REWARD_CHANCE_PER_SPEED = 0.00001,
   // @Incomplete: no way to get wellful
   WINTERSWRATH_REWARD_CHANCE = 1,
   YETISBANE_REWARD_CHANCE = 1,
}

const TITLE_NUM_DISPLAY_OPTIONS_RECORD: Record<TribesmanTitle, number> = {
   [TribesmanTitle.builder]: 2,
   [TribesmanTitle.berrymuncher]: 2,
   [TribesmanTitle.bloodaxe]: 1,
   [TribesmanTitle.deathbringer]: 3,
   [TribesmanTitle.gardener]: 3,
   [TribesmanTitle.packrat]: 2,
   [TribesmanTitle.shrewd]: 2,
   [TribesmanTitle.sprinter]: 3,
   [TribesmanTitle.wellful]: 2,
   [TribesmanTitle.winterswrath]: 3,
   [TribesmanTitle.yetisbane]: 2
};

export function generateTitle(title: TribesmanTitle): TitleGenerationInfo {
   return {
      title: title,
      displayOption: randInt(1, TITLE_NUM_DISPLAY_OPTIONS_RECORD[title])
   };
}