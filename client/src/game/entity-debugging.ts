import { Entity } from "../../../shared/src/entities";
import { getCameraSubject } from "./camera";
import { sendSetDebugEntityPacket } from "./networking/packet-sending/packet-sending";
import { playerInstance } from "./player";
import { entityExists } from "./world";
import { getHoveredEntity } from "./entity-selection";
import { nerdVisionIsVisible } from "../ui/game/dev/NerdVision";

let previousDebugEntity = 0;

export function updateDebugEntity(): void {
   if (!__DEV__) {
      return;
   }

   const cameraSubject = getCameraSubject();
   
   let debugEntity: Entity;
   if (cameraSubject !== null && entityExists(cameraSubject) && cameraSubject !== playerInstance) {
      debugEntity = cameraSubject;
   } else if (nerdVisionIsVisible()) {
      const hoveredEntity = getHoveredEntity();
      debugEntity = hoveredEntity !== null ? hoveredEntity : 0;
   } else {
      debugEntity = 0;
   }

   if (debugEntity !== previousDebugEntity) {
      sendSetDebugEntityPacket(debugEntity);
   }
   previousDebugEntity = debugEntity;
}