import { TribesmanTitle } from "webgl-test-shared/dist/titles";

export interface ClientTitleInfo {
   readonly effects: ReadonlyArray<string>;
}

export const CLIENT_TITLE_INFO_RECORD: Record<TribesmanTitle, ClientTitleInfo> = {
   [TribesmanTitle.architect]: {
      effects: [
         "30% faster hammer swing speed",
         "Repair 25% more health each swing"
      ]
   },
   [TribesmanTitle.berrymuncher]: {
      effects: [
         "Harvest one extra berry each hit"
      ]
   },
   [TribesmanTitle.bloodaxe]: {
      effects: [
         "Hits have a 20% chance of inflicting bleeding"
      ]
   },
   [TribesmanTitle.deathbringer]: {
      effects: [
         "15% damage bonus to everything"
      ]
   },
   [TribesmanTitle.gardener]: {
      effects: [
         "Harvest one extra resource from trees, ice spikes, and berry bushes"
      ]
   },
   [TribesmanTitle.packrat]: {
      effects: [
         "2 extra hotbar item slots"
      ]
   },
   [TribesmanTitle.shrewd]: {
      effects: [
         "50% faster research speed"
      ]
   },
   [TribesmanTitle.sprinter]: {
      effects: [
         "20% faster movement speed"
      ]
   },
   [TribesmanTitle.wellful]: {
      effects: [
         // @Incomplete
         "20% faster movement speed"
      ]
   },
   [TribesmanTitle.winterswrath]: {
      effects: [
         // @Incomplete
         "20% faster movement speed"
      ]
   },
   [TribesmanTitle.yetisbane]: {
      effects: [
         // @Incomplete
         "20% faster movement speed"
      ]
   }
};