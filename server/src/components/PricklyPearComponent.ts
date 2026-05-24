import { CircularBox, ServerComponentType, Entity, ItemType, assert, Point, polarVec2, randAngle, randFloat, randSign, angle } from "battletribes-shared";
import { getConfigTransformComponent } from "../components.js";
import { createPricklyPearFragmentProjectileConfig } from "../entities/desert/prickly-pear-fragment-projectile.js";
import { createItemEntityConfig } from "../entities/item-entity.js";
import { addHitboxAngularVelocity, addHitboxVelocity } from "../hitboxes.js";
import { createItem } from "../items.js";
import { createEntity, destroyEntity, getEntityLayer } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray } from "./HealthComponent.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class PricklyPearComponent {}

export const PricklyPearComponentArray = new ComponentArray<PricklyPearComponent>(ServerComponentType.pricklyPear, true, getDataLength, addDataToPacket);
PricklyPearComponentArray.onTakeDamage = onTakeDamage;

const explode = (pricklyPear: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(pricklyPear);
   const hitbox = transformComponent.hitboxes[0];

   const layer = getEntityLayer(pricklyPear);

   assert(hitbox.parent !== null);
   const parentCactus = hitbox.parent.entity;
   
   const numProjectiles = 9;
   for (let i = 0; i < numProjectiles; i++) {
      const offsetDirection = hitbox.box.angle + 2 * Math.PI * i / numProjectiles + randFloat(-0.1, 0.1);
      const offsetMagnitude = (hitbox.box as CircularBox).radius;
      const offsetX = offsetMagnitude * Math.sin(offsetDirection);
      const offsetY = offsetMagnitude * Math.cos(offsetDirection);

      const x = hitbox.box.posX + offsetX;
      const y = hitbox.box.posY + offsetY;
      const projectileConfig = createPricklyPearFragmentProjectileConfig(x, y, randAngle(), parentCactus);

      const projectileTransformComponent = getConfigTransformComponent(projectileConfig.components);
      
      const projectileHitbox = projectileTransformComponent.hitboxes[0];
      addHitboxVelocity(projectileHitbox, polarVec2(520, offsetDirection));
      addHitboxAngularVelocity(projectileHitbox, randSign() * randFloat(2 * Math.PI, 3 * Math.PI));
      
      createEntity(projectileConfig, layer, 0);
   }
}

const drop = (pricklyPear: Entity): void => {
   destroyEntity(pricklyPear);
   
   const transformComponent = TransformComponentArray.getComponent(pricklyPear);
   const hitbox = transformComponent.hitboxes[0];

   const layer = getEntityLayer(pricklyPear);

   assert(hitbox.parent !== null);
   const parentCactus = hitbox.parent.entity;
   const cactusTransformComponent = TransformComponentArray.getComponent(parentCactus);
   const cactusHitbox = cactusTransformComponent.hitboxes[0];
   const angleFromCactusToPear = angle(hitbox.box.posX - cactusHitbox.box.posX, hitbox.box.posY - cactusHitbox.box.posY);
   
   const x = hitbox.box.posX + 8 * Math.sin(angleFromCactusToPear);
   const y = hitbox.box.posY + 8 * Math.cos(angleFromCactusToPear);
   
   const itemConfig = createItemEntityConfig(x, y, hitbox.box.angle, createItem(ItemType.pricklyPear, 1, "", ""), null);

   const itemTransformComponent = getConfigTransformComponent(itemConfig.components);
   const itemHitbox = itemTransformComponent.hitboxes[0];
   addHitboxVelocity(itemHitbox, polarVec2(150, angleFromCactusToPear));

   createEntity(itemConfig, layer, 0);
}

function onTakeDamage(pricklyPear: Entity): void {
   const healthComponent = HealthComponentArray.getComponent(pricklyPear);

   // If the hit was enough to kill the pear, explode it (!)
   if (healthComponent.health <= 0) {
      explode(pricklyPear);
   } else {
      drop(pricklyPear);
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}