import { Entity } from "webgl-test-shared";
import { entityInteractionState } from "../ui-state/entity-interaction-state.svelte";
import { nerdVisionState } from "../ui-state/nerd-vision-state.svelte";
import { getCameraSubject } from "./camera";
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
   } else if (nerdVisionState.isVisible) {
      const hoveredEntity = entityInteractionState.hoveredEntity;
      debugEntity = hoveredEntity !== null ? hoveredEntity : 0;
   } else {
      debugEntity = 0;
   }

   if (debugEntity !== previousDebugEntity) {
      sendSetDebugEntityPacket(debugEntity);
   }
   previousDebugEntity = debugEntity;
}