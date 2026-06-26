import { ServerComponentType } from "../../../shared/dist/components.js";
import { CactusFlowerSize, EntityType, Entity, DamageSource } from "../../../shared/dist/entities.js";
import { AttackEffectiveness } from "../../../shared/dist/entity-damage-types.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { randInt, Point, angle, polarVec2 } from "../../../shared/dist/utils.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { getEntityType, destroyEntity, getEntityLayer, createEntity } from "../world.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { applyAbsoluteKnockback, Hitbox } from "../hitboxes.js";
import { TransformComponent, TransformComponentArray } from "./TransformComponent.js";
import { createPricklyPearConfig } from "../entities/desert/prickly-pear.js";
import { createEntityConfigAttachInfo } from "../components.js";

export interface CactusFlower {
   readonly parentHitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly angle: number;
   readonly flowerType: number;
   readonly size: CactusFlowerSize;
}

export class CactusComponent {
   public readonly flowers: readonly CactusFlower[];

   public remainingFruitGrowTicks = randInt(MIN_FRUIT_GROW_TICKS, MAX_FRUIT_GROW_TICKS);
   public readonly canHaveFruit: boolean;

   constructor(flowers: readonly CactusFlower[], canHaveFruit: boolean) {
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
   return Bytes.Float32 + cactusComponent.flowers.length * 6 * Bytes.Float32;
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

   const hitDir = angle(collidingHitbox.box.posX - hitbox.box.posX, collidingHitbox.box.posY - hitbox.box.posY);

   damageEntity(collidingHitbox, hitbox.entity, 1, DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   const knockbackX = 200 * Math.sin(hitDir);
   const knockbackY = 200 * Math.cos(hitDir);
   applyAbsoluteKnockback(collidingHitbox, knockbackX, knockbackY);
   addLocalInvulnerabilityHash(collidingEntity, "cactus", 0.3);
}