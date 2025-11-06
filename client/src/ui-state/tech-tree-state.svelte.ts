import { Tech, TechID } from "webgl-test-shared";
import { ExtendedTribe } from "../game/tribes";

let isVisible = $state(false);

let x = $state(0);
let y = $state(0);
let zoom = $state(1);

let hoveredTech = $state<TechID | null>(null);
let unlockedTechs = $state(new Array<Tech>());
let selectedTech = $state<Tech | null>(null);
let selectedTechStudyProgress = $state(0);

export const techTreeState = {
   get isVisible() {
      return isVisible;
   },
   setIsVisible(newIsVisible: boolean): void {
      isVisible = newIsVisible;
   },

   get x() {
      return x;
   },
   setX(newX: number): void {
      x = newX;
   },

   get y() {
      return y;
   },
   setY(newY: number): void {
      y = newY;
   },

   get zoom() {
      return zoom;
   },
   setZoom(newZoom: number): void {
      zoom = newZoom;
   },
   
   get hoveredTech() {
      return hoveredTech;
   },
   setHoveredTech(newHoveredTech: TechID | null): void {
      hoveredTech = newHoveredTech;
   },

   getUnlockedTechs() {
      return unlockedTechs;
   },
   getSelectedTech() {
      return selectedTech;
   },
   getSelectedTechStudyProgress() {
      return selectedTechStudyProgress;
   },

   updateFromTribe(tribe: Readonly<ExtendedTribe>): void {
      const newUnlockedTechs = tribe.unlockedTechs;
      
      // Remove old
      for (let i = 0; i < unlockedTechs.length; i++) {
         const tech = unlockedTechs[i];
         if (!newUnlockedTechs.includes(tech)) {
            unlockedTechs.splice(i, 1);
            i--;
         }
      }

      // Add new
      for (const tech of newUnlockedTechs) {
         if (!unlockedTechs.includes(tech)) {
            unlockedTechs.push(tech);
         }
      }

      selectedTech = tribe.selectedTech;

      if (tribe.selectedTech !== null) {
         selectedTechStudyProgress = (tribe.techTreeUnlockProgress[tribe.selectedTech.id]?.studyProgress || 0);
      }
   }
};