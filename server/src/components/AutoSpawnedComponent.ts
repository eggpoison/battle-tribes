import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { assert } from "../../../shared/src/utils";
import { addEntityToSpawnDistribution, EntitySpawnEvent, removeEntityFromSpawnDistributions } from "../entity-spawn-info";
import { ComponentArray } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";

// @Cleanup: perhaps put all the auto spawned logic in this file???

// @INCOMPLETE: Wtf is this for

export class AutoSpawnedComponent {
   public readonly spawnInfo: EntitySpawnEvent;

   constructor(spawnInfo: EntitySpawnEvent) {
      this.spawnInfo = spawnInfo;
   }
}

export const AutoSpawnedComponentArray = new ComponentArray<AutoSpawnedComponent>(ServerComponentType.autoSpawned, true, getDataLength, addDataToPacket);
AutoSpawnedComponentArray.onJoin = onJoin;
AutoSpawnedComponentArray.onRemove = onRemove;

function onJoin(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   assert(hitbox !== null);

   const autoSpawnedComponent = AutoSpawnedComponentArray.getComponent(entity);
   
   addEntityToSpawnDistribution(autoSpawnedComponent.spawnInfo.spawnDistribution, entity, hitbox.box.position.x, hitbox.box.position.y);
}

function onRemove(entity: Entity): void {
   const autoSpawnedComponent = AutoSpawnedComponentArray.getComponent(entity);
   removeEntityFromSpawnDistributions(entity, autoSpawnedComponent);
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}