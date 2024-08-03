import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items/items";
import Board from "../Board";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntityFromConfig } from "../Entity";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   DROP_VELOCITY = 400
}

export interface SpearProjectileComponentParams {}

export class SpearProjectileComponent implements SpearProjectileComponentParams {}

export const SpearProjectileComponentArray = new ComponentArray<SpearProjectileComponent>(ServerComponentType.spearProjectile, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_spearProjectileComponent: SpearProjectileComponent, spear: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spear);

   if (physicsComponent.velocity.lengthSquared() <= Vars.DROP_VELOCITY * Vars.DROP_VELOCITY) {
      const transformComponent = TransformComponentArray.getComponent(spear);

      const config = createItemEntityConfig();
      config[ServerComponentType.transform].position.x = transformComponent.position.x;
      config[ServerComponentType.transform].position.y = transformComponent.position.y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.item].itemType = ItemType.spear;
      config[ServerComponentType.item].amount = 1;
      createEntityFromConfig(config);
      
      Board.destroyEntity(spear);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}