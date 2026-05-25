import { assertBoxIsRectangular, ServerComponentType, DamageSource, Entity, EntityType, AttackEffectiveness, Packet, Settings, Point, polarVec2, angle, HitboxTag } from "battletribes-shared";
import { getOkrenClawBigArmSegmentOffset, getOkrenClawBigArmSegmentSize, getOkrenClawMediumArmSegmentOffset, getOkrenClawMediumArmSegmentSize, getOkrenClawSlashingArmSegmentOffset, getOkrenClawSlashingArmSegmentSize } from "../entities/desert/okren-claw.js";
import { Hitbox, getHitboxVelocity, applyAbsoluteKnockback, getHitboxTag } from "../hitboxes.js";
import { getEntityType } from "../world.js";
import { ComponentArray } from "./ComponentArray.js";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent.js";
import { OkrenAgeStage } from "./OkrenComponent.js";
import { TransformComponent, TransformComponentArray } from "./TransformComponent.js";

export const enum OkrenClawGrowthStage {
   ONE,
   TWO,
   THREE,
   FOUR
}

// @Incomplete: unused?
const NUM_GROWTH_STAGES = 4;

const ATTACK_DAMAGES = [2, 2, 3, 3, 4];

const TICKS_TO_GROW = 30 * Settings.TICK_RATE;

export class OkrenClawComponent {
   public readonly size: OkrenAgeStage;
   public growthStage: number;

   public growthTicks = 0;

   constructor(size: OkrenAgeStage, growthStage: number) {
      this.size = size;
      // @Temporary
      // this.growthStage = isFullyGrown ? NUM_GROWTH_STAGES - 1 : 0;
      this.growthStage = growthStage;
   }
}

export const OkrenClawComponentArray = new ComponentArray<OkrenClawComponent>(ServerComponentType.okrenClaw, true, getDataLength, addDataToPacket);
OkrenClawComponentArray.onHitboxCollision = onHitboxCollision;
OkrenClawComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getHitbox = (transformComponent: TransformComponent, tag: HitboxTag): Hitbox => {
   for (const hitbox of transformComponent.hitboxes) {
      if (getHitboxTag(hitbox) === tag) {
         return hitbox;
      }
   }
   throw new Error();
}

export function switchOkrenClawGrowthStage(okrenClaw: Entity, growthStage: OkrenClawGrowthStage): void {
   const okrenClawComponent = OkrenClawComponentArray.getComponent(okrenClaw);
   okrenClawComponent.growthStage = growthStage;
   
   const transformComponent = TransformComponentArray.getComponent(okrenClaw);

   const size = okrenClawComponent.size;

   const bigArmSegmentHitbox = getHitbox(transformComponent, HitboxTag.okrenBigArmSegment);
   const mediumArmSegmentHitbox = getHitbox(transformComponent, HitboxTag.okrenMediumArmSegment);
   const slashingArmSegmentHitbox = getHitbox(transformComponent, HitboxTag.okrenArmSegmentOfSlashingAndDestruction);
   
   const bigArmSegmentSize = getOkrenClawBigArmSegmentSize(size, growthStage);
   const bigArmSegmentOffset = getOkrenClawBigArmSegmentOffset(size, growthStage);
   
   assertBoxIsRectangular(bigArmSegmentHitbox.box);
   bigArmSegmentHitbox.box.width = bigArmSegmentSize.x;
   bigArmSegmentHitbox.box.height = bigArmSegmentSize.y;
   bigArmSegmentHitbox.box.offsetX = bigArmSegmentOffset.x;
   bigArmSegmentHitbox.box.offsetY = bigArmSegmentOffset.y;

   const mediumArmSegmentSize = getOkrenClawMediumArmSegmentSize(size, growthStage);
   const mediumArmSegmentOffset = getOkrenClawMediumArmSegmentOffset(size, growthStage);
   
   assertBoxIsRectangular(mediumArmSegmentHitbox.box);
   mediumArmSegmentHitbox.box.width = mediumArmSegmentSize.x;
   mediumArmSegmentHitbox.box.height = mediumArmSegmentSize.y;
   mediumArmSegmentHitbox.box.offsetX = mediumArmSegmentOffset.x;
   mediumArmSegmentHitbox.box.offsetY = mediumArmSegmentOffset.y;

   const slashingArmSegmentSize = getOkrenClawSlashingArmSegmentSize(size, growthStage);
   const slashingArmSegmentOffset = getOkrenClawSlashingArmSegmentOffset(size, growthStage);
   
   assertBoxIsRectangular(slashingArmSegmentHitbox.box);
   slashingArmSegmentHitbox.box.width = slashingArmSegmentSize.x;
   slashingArmSegmentHitbox.box.height = slashingArmSegmentSize.y;
   slashingArmSegmentHitbox.box.offsetX = slashingArmSegmentOffset.x;
   slashingArmSegmentHitbox.box.offsetY = slashingArmSegmentOffset.y;

   transformComponent.isDirty = true;
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, okrenClaw: Entity): void {
   const okrenClawComponent = OkrenClawComponentArray.getComponent(okrenClaw);
   packet.writeNumber(okrenClawComponent.size);
   packet.writeNumber(okrenClawComponent.growthStage);
}

function onTick(okrenClaw: Entity): void {
   const okrenClawComponent = OkrenClawComponentArray.getComponent(okrenClaw);
   
   if (okrenClawComponent.growthStage < NUM_GROWTH_STAGES - 1) {
      okrenClawComponent.growthTicks++;
      if (okrenClawComponent.growthTicks >= TICKS_TO_GROW) {
         switchOkrenClawGrowthStage(okrenClaw, okrenClawComponent.growthStage + 1);
         okrenClawComponent.growthTicks = 0;
      }
   }
}

function onHitboxCollision(affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   if (getHitboxTag(affectedHitbox) !== HitboxTag.okrenArmSegmentOfSlashingAndDestruction) {
      return;
   }

   const collidingEntity = collidingHitbox.entity;

   // @Hack: should be able to hit other okrens' tongues
   if (getEntityType(collidingEntity) === EntityType.okrenTongue) {
      return;
   }

   // @HACK so that okrens don't immediately kill the dustflea eggs they create
   if (getEntityType(collidingEntity) === EntityType.dustfleaEgg) {
      return;
   }
   
   const velocityDiff = getHitboxVelocity(affectedHitbox).distanceTo(getHitboxVelocity(collidingHitbox));
   // @Temporary @Hack as sometimes the slashers aren't moving fast enough... maybe just remove it completely but only have it work for one side? not the back of the hitbox/
   // if (velocityDiff < 100) {
   //    return;
   // }
      
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const okrenClaw = affectedHitbox.entity;

   const hash = "okren_" + okrenClaw + "_" + affectedHitbox.localID;
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, hash)) {
      return;
   }

   const okrenClawComponent = OkrenClawComponentArray.getComponent(okrenClaw);
   
   const hitDir = angle(collidingHitbox.box.posX - affectedHitbox.box.posX, collidingHitbox.box.posY - affectedHitbox.box.posY);

   damageEntity(collidingHitbox, okrenClaw, ATTACK_DAMAGES[okrenClawComponent.size], DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, hash, 0.3);
}