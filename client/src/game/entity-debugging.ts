import { Entity } from "../../../shared/src/entities";
import { getCameraSubject } from "./camera";
import { nerdVisionIsVisible } from "../svelte/game/dev/NerdVision";
import { getMouseTargetEntity } from "./mouse-input";
import { sendSetDebugEntityPacket } from "./networking/packet-sending";
import { playerInstance } from "./player";
import { isDev } from "./utils";
import { entityExists } from "./world";

let previousDebugEntity = 0;

export function updateDebugEntity(): void {
   if (!isDev()) {
      return;
   }

   const cameraSubject = getCameraSubject();
   
   let debugEntity: Entity;
   if (cameraSubject !== null && entityExists(cameraSubject) && cameraSubject !== playerInstance) {
      debugEntity = cameraSubject;
   } else if (nerdVisionIsVisible()) {
      const targettedEntity = getMouseTargetEntity();
      debugEntity = targettedEntity !== null ? targettedEntity : 0;
   } else {
      debugEntity = 0;
   }

   if (debugEntity !== previousDebugEntity) {
      sendSetDebugEntityPacket(debugEntity);
   }
   previousDebugEntity = debugEntity;
}