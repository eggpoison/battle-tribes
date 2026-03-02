import { Settings } from "../../shared/src/settings";
import { updateBuildingLayer } from "./tribesman-ai/ai-building";
import { updateTribePlans } from "./tribesman-ai/tribesman-ai-planning";
import { getGameTicks, getTribes } from "./world";

export function updateTribes(): void {
   const tribes = getTribes();
   
   // @Cleanup: why aren't these loops combined?
   
   for (const tribe of tribes) {
      tribe.tick();
   }

   // @Speed: only check dirty tribes?
   for (let i = 0; i < tribes.length; i++) {
      const tribe = tribes[i];
      
      // If buildings have been added/removed, we need to update the building layers and re-determine the tribe's plans
      if (tribe.buildingsAreDirty) {
         for (const buildingLayer of tribe.buildingLayers) {
            updateBuildingLayer(buildingLayer);
         }

         if (tribe.isAIControlled) {
            updateTribePlans(tribe);
         }

         tribe.buildingsAreDirty = false;
      }

      if (getGameTicks() % Settings.TICK_RATE === 0) {
         // @Cleanup: Not related to tribe building
         tribe.updateAvailableResources();
      }
   }
}