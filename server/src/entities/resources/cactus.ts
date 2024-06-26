import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { CactusBodyFlowerData, CactusLimbData, CactusLimbFlowerData, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { randInt, lerp, randFloat, Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { CactusComponent, CactusComponentArray } from "../../components/CactusComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";

const RADIUS = 40;
/** Amount the hitbox is brought in. */
const HITBOX_PADDING = 3;
const LIMB_PADDING = 10;

const generateRandomFlowers = (): ReadonlyArray<CactusBodyFlowerData> => {
   // Generate random number of flowers from 1 to 5, weighted low
   let numFlowers = 1;
   while (Math.random() < 0.35 && numFlowers < 5) {
      numFlowers++;
   }

   const flowers = new Array<CactusBodyFlowerData>();

   for (let i = 0; i < numFlowers; i++) {
      flowers.push({
         type: randInt(0, 4),
         column: randInt(0, 7),
         height: lerp(10, RADIUS - LIMB_PADDING, Math.random()),
         size: randInt(0, 1),
         rotation: 2 * Math.PI * Math.random()
      });
   }

   return flowers;
}

const generateRandomLimbs = (): ReadonlyArray<CactusLimbData> => {
   // Low chance for 0 limbs
   // High chance for 1 limb
   // Less chance for 2 limbs
   // Less chance for 3 limbs
   let numLimbs = 0;
   while (Math.random() < 4/5 - numLimbs/5 && numLimbs < 3) {
      numLimbs++;
   }

   const limbs = new Array<CactusLimbData>();

   for (let i = 0; i < numLimbs; i++) {
      let flower: CactusLimbFlowerData | undefined;

      if (Math.random() < 0.45) {
         flower = {
            type: randInt(0, 3),
            height: randFloat(6, 10),
            direction: 2 * Math.PI * Math.random(),
            rotation: 2 * Math.PI * Math.random()
         }
      }

      limbs.push({
         direction: 2 * Math.PI * Math.random(),
         flower: flower
      });
   }

   return limbs;
}

export function createCactus(position: Point, rotation: number): Entity {
   const cactus = new Entity(position, rotation, EntityType.cactus, COLLISION_BITS.cactus, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(1, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, RADIUS - HITBOX_PADDING);
   cactus.addHitbox(hitbox);

   const flowers = generateRandomFlowers();
   const limbs = generateRandomLimbs();

   // Create hitboxes for all the cactus limbs
   for (let i = 0; i < limbs.length; i++) {
      const limb = limbs[i]
      const hitbox = new CircularHitbox(0.4, Point.fromVectorForm(37, limb.direction), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 18);
      cactus.addHitbox(hitbox);
   }

   HealthComponentArray.addComponent(cactus.id, new HealthComponent(15));
   StatusEffectComponentArray.addComponent(cactus.id, new StatusEffectComponent(0));
   CactusComponentArray.addComponent(cactus.id, new CactusComponent(flowers, limbs));
   
   return cactus;
}

export function onCactusCollision(cactus: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   if (collidingEntity.type === EntityType.itemEntity) {
      collidingEntity.destroy();
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "cactus")) {
      return;
   }

   const hitDirection = cactus.position.calculateAngleBetween(collidingEntity.position);

   damageEntity(collidingEntity, cactus, 1, PlayerCauseOfDeath.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 200, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "cactus", 0.3);
}

export function onCactusDeath(cactus: Entity): void {
   createItemsOverEntity(cactus, ItemType.cactus_spine, randInt(2, 5), 40);
}