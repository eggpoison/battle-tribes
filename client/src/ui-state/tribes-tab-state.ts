import { Tribe } from "../game/tribes";

const tribes = new Array<Tribe>();

export const tribesTabState = {
   get tribes() {
      return tribes;
   },
   updateTribes(newTribes: ReadonlyArray<Tribe>): void {
      // Remove old
      for (let i = 0; i < tribes.length; i++) {
         const tribe = tribes[i];
         if (!newTribes.includes(tribe)) {
            tribes.splice(i, 1);
            i--;
         }
      }

      // Add new
      for (const tribe of newTribes) {
         if (!tribes.includes(tribe)) {
            tribes.push(tribe);
         }
      }
   }
};