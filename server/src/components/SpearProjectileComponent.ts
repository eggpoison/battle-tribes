import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { ItemType } from "battletribes-shared/items/items";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntityFromConfig } from "../Entity";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";
import { destroyEntity, getEntityLayer } from "../world";

const enum Vars {
   DROP_VELOCITY = 300
}

export class SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ComponentArray<SpearProjectileComponent>(ServerComponentType.spearProjectile, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onTick(_spearProjectileComponent: SpearProjectileComponent, spear: EntityID): void {
   const physicsComponent = PhysicsComponentArray.getComponent(spear);

   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   const velocitySquared = vx * vx + vy * vy;
   
   if (velocitySquared <= Vars.DROP_VELOCITY * Vars.DROP_VELOCITY) {
      const transformComponent = TransformComponentArray.getComponent(spear);

      const config = createItemEntityConfig(ItemType.spear, 1, null);
      config.components[ServerComponentType.transform].position.x = transformComponent.position.x;
      config.components[ServerComponentType.transform].position.y = transformComponent.position.y;
      config.components[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      createEntityFromConfig(config, getEntityLayer(spear), 0);
      
      destroyEntity(spear);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}