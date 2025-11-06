import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { ItemType } from "../../../shared/src/items/items";
import { assert, Point, polarVec2, randAngle, randFloat, randSign } from "../../../shared/src/utils";
import { createPricklyPearFragmentProjectileConfig } from "../entities/desert/prickly-pear-fragment-projectile";
import { createItemEntityConfig } from "../entities/item-entity";
import { addHitboxAngularVelocity, addHitboxVelocity } from "../hitboxes";
import { createEntity, destroyEntity, getEntityLayer } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";

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

      const x = hitbox.box.position.x + offsetX;
      const y = hitbox.box.position.y + offsetY;
      const projectileConfig = createPricklyPearFragmentProjectileConfig(new Point(x, y), randAngle(), parentCactus);

      const projectileTransformComponent = projectileConfig.components[ServerComponentType.transform]!;
      
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
   const angleFromCactusToPear = cactusHitbox.box.position.angleTo(hitbox.box.position);
   
   const x = hitbox.box.position.x + 8 * Math.sin(angleFromCactusToPear);
   const y = hitbox.box.position.y + 8 * Math.cos(angleFromCactusToPear);
   
   const itemConfig = createItemEntityConfig(new Point(x, y), hitbox.box.angle, ItemType.pricklyPear, 1, null);

   const itemTransformComponent = itemConfig.components[ServerComponentType.transform]!;
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