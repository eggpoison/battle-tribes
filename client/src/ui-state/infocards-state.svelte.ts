import { TribesmanTitle } from "webgl-test-shared/src/titles";

let titleOffer = $state<TribesmanTitle | null>(null);

export const infocardsState = {
   get titleOffer() {
      return titleOffer;
   },
   setTitleOffer(newTitleOffer: TribesmanTitle | null): void {
      titleOffer = newTitleOffer;
   }
};