import { TribesmanTitle } from "webgl-test-shared";

export enum TabType {
   items,
   summon,
   titles,
   tribes
}

let titles = $state(new Array<TribesmanTitle>());

export const tabSelectorState = {
   get titles() {
      return titles;
   },
   setTitles(newTitles: Array<TribesmanTitle>): void {
      // @Garbage
      titles = newTitles;
   }
};