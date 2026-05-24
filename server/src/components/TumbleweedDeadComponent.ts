import { Biome, ServerComponentType, Entity, EntityType, Settings, Point } from "battletribes-shared";
import { applyAccelerationFromGround, getHitboxTile, Hitbox } from "../hitboxes.js";
import { getWindVector } from "../wind.js";
import { destroyEntity, getEntityLayer, getEntityType } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";

export class TumbleweedDeadComponent {
   public isRooted = true;
   public ticksUnrooted = 0;
}

const getTumbleweedDecayChance = (tumbleweed: Entity, hitbox: Hitbox): number => {
   const layer = getEntityLayer(tumbleweed);
   const tile = getHitboxTile(hitbox);
   if (layer.getTileBiome(tile) === Biome.desert) {
      return 0.02;
   } else {
      return 0.08;
   }
}

export const TumbleweedDeadComponentArray = new ComponentArray<TumbleweedDeadComponent>(ServerComponentType.tumbleweedDead, true, getDataLength, addDataToPacket);
TumbleweedDeadComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
TumbleweedDeadComponentArray.onHitboxCollision = onHitboxCollision;

function onTick(tumbleweed: Entity): void {
   const tumbleweedDeadComponent = TumbleweedDeadComponentArray.getComponent(tumbleweed);
   // @Incomplete: never gets unrooted!
   // if (Math.random() < 0.04 * Settings.DT_S) {
   //    tumbleweedDeadComponent.isRooted = false;
   // }
   
   if (!tumbleweedDeadComponent.isRooted) {
      const transformComponent = TransformComponentArray.getComponent(tumbleweed);
      const hitbox = transformComponent.hitboxes[0];
   
      const wind = getWindVector(hitbox.box.posX, hitbox.box.posY);
      applyAccelerationFromGround(hitbox, wind);

      tumbleweedDeadComponent.ticksUnrooted++;

      const decayChance = getTumbleweedDecayChance(tumbleweed, hitbox);
      if (tumbleweedDeadComponent.ticksUnrooted >= 35 * Settings.TICK_RATE && Math.random() < decayChance * Settings.DT_S) {
         destroyEntity(tumbleweed);
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const collidingEntity = collidingHitbox.entity;
   if (getEntityType(collidingEntity) !== EntityType.tumbleweedDead) {
      return;
   }

   // @Temporary @Hack: tumbleweeds crash the server like fuck rn
   return;

   // Attach to the other tumbleweed!
   // @INCOMPLETE from rework
   // const transformComponent = TransformComponentArray.getComponent(tumbleweed);
   // if (transformComponent.rootEntity === tumbleweed) {
   //    const otherTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   //    if (transformComponent.rootEntity !== otherTransformComponent.rootEntity) {
   //       const hitbox = transformComponent.hitboxes[0];
   //       const otherHitbox = otherTransformComponent.hitboxes[0];
   //       const dist = hitbox.box.position.distanceTo(otherHitbox.box.position);
   //       // @Hack: what if i change their radius?
   //       if (dist < 70) {
   //          attachHitbox(hitbox, collidingHitbox, tumbleweed, collidingEntity, false);
   //       }
   //    }
   // }
}