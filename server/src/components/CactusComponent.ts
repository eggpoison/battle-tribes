import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, DamageSource, CactusFlowerSize } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { Packet } from "battletribes-shared/packets";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Point, polarVec2, randAngle, randInt } from "../../../shared/src/utils";
import { getEntityType, destroyEntity, getEntityLayer, createEntity } from "../world";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyAbsoluteKnockback, Hitbox } from "../hitboxes";
import { Settings } from "../../../shared/src/settings";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";
import { CircularBox } from "../../../shared/src/boxes/CircularBox";
import { createPricklyPearConfig } from "../entities/desert/prickly-pear";
import { createEntityConfigAttachInfo } from "../components";

export interface CactusFlower {
   readonly parentHitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly angle: number;
   readonly flowerType: number;
   readonly size: CactusFlowerSize;
}

export class CactusComponent {
   public readonly flowers: ReadonlyArray<CactusFlower>;

   public remainingFruitGrowTicks = randInt(MIN_FRUIT_GROW_TICKS, MAX_FRUIT_GROW_TICKS);
   public readonly canHaveFruit: boolean;

   constructor(flowers: ReadonlyArray<CactusFlower>, canHaveFruit: boolean) {
      this.flowers = flowers;
      this.canHaveFruit = canHaveFruit;
   }
}

const MIN_FRUIT_GROW_TICKS = 180 * Settings.TICK_RATE;
const MAX_FRUIT_GROW_TICKS = 300 * Settings.TICK_RATE;

export const CactusComponentArray = new ComponentArray<CactusComponent>(ServerComponentType.cactus, true, getDataLength, addDataToPacket);
CactusComponentArray.onHitboxCollision = onHitboxCollision;
CactusComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const hasFruit = (transformComponent: TransformComponent): boolean => {
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.pricklyPear) {
            return true;
         }
      }
   }

   return false;
}

function onTick(cactus: Entity): void {
   // @SQUEAM no fruits for the shot
   // const cactusComponent = CactusComponentArray.getComponent(cactus);
   // if (cactusComponent.canHaveFruit) {
   //    const transformComponent = TransformComponentArray.getComponent(cactus);
   //    if (!hasFruit(transformComponent)) {
   //       if (cactusComponent.remainingFruitGrowTicks <= 0) {
   //          // @Copynpaste
            
   //          const cactusHitbox = transformComponent.hitboxes[0];
   //          const cactusRadius = (cactusHitbox.box as CircularBox).radius;
      
   //          const offset = polarVec2(cactusRadius, randAngle());
      
   //          const x = cactusHitbox.box.position.x + offset.x;
   //          const y = cactusHitbox.box.position.y + offset.y;
   //          const position = new Point(x, y);
            
   //          const fruitConfig = createPricklyPearConfig(position, offset, randAngle());

   //          const fruitTransformComponent = fruitConfig.components[ServerComponentType.transform]!;
   //          const fruitHitbox = fruitTransformComponent.hitboxes[0];
            
   //          fruitConfig.attachInfo = createEntityConfigAttachInfo(fruitHitbox, cactusHitbox, true);
   //          createEntity(fruitConfig, getEntityLayer(cactus), 0);
      
   //          cactusComponent.remainingFruitGrowTicks = randInt(MIN_FRUIT_GROW_TICKS, MAX_FRUIT_GROW_TICKS);
   //       } else {
   //          cactusComponent.remainingFruitGrowTicks--;
   //       }
   //    }
   // }
}

function getDataLength(entity: Entity): number {
   const cactusComponent = CactusComponentArray.getComponent(entity);
   return Float32Array.BYTES_PER_ELEMENT + cactusComponent.flowers.length * 6 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const cactusComponent = CactusComponentArray.getComponent(entity);

   packet.writeNumber(cactusComponent.flowers.length);
   for (let i = 0; i < cactusComponent.flowers.length; i++) {
      const flower = cactusComponent.flowers[i];
      packet.writeNumber(flower.parentHitboxLocalID);
      packet.writeNumber(flower.offsetX);
      packet.writeNumber(flower.offsetY);
      packet.writeNumber(flower.angle);
      packet.writeNumber(flower.flowerType);
      packet.writeNumber(flower.size);
   }
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
      destroyEntity(collidingEntity);
      return;
   }

   if (getEntityType(collidingEntity) === EntityType.tumbleweedDead || getEntityType(collidingEntity) === EntityType.dustflea) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "cactus")) {
      return;
   }

   const hitDir = hitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, hitbox.entity, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, "cactus", 0.3);
}