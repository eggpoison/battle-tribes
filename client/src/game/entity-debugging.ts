import { Entity } from "webgl-test-shared";
import { entitySelectionState } from "../ui-state/entity-selection-state";
import { getCameraSubject } from "./camera";
import { sendSetDebugEntityPacket } from "./networking/packet-sending/packet-sending";
import { playerInstance } from "./player";
import { isDev } from "./utils";
import { entityExists } from "./world";
import { nerdVision } from "../ui-state/nerd-vision-funcs";
import { getHoveredEntity } from "./entity-selection";

let previousDebugEntity = 0;

export function updateDebugEntity(): void {
   if (!isDev()) {
      return;
   }

   const cameraSubject = getCameraSubject();
   
   let debugEntity: Entity;
   if (cameraSubject !== null && entityExists(cameraSubject) && cameraSubject !== playerInstance) {
      debugEntity = cameraSubject;
   } else if (nerdVision.isVisible()) {
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