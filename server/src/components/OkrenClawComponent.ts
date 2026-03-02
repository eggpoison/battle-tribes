import { assertBoxIsRectangular, HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Packet } from "../../../shared/src/packets";
import { Settings } from "../../../shared/src/settings";
import { Point, polarVec2 } from "../../../shared/src/utils";
import { getOkrenClawBigArmSegmentOffset, getOkrenClawBigArmSegmentSize, getOkrenClawMediumArmSegmentOffset, getOkrenClawMediumArmSegmentSize, getOkrenClawSlashingArmSegmentOffset, getOkrenClawSlashingArmSegmentSize } from "../entities/desert/okren-claw";
import { Hitbox, getHitboxVelocity, applyAbsoluteKnockback } from "../hitboxes";
import { getEntityType } from "../world";
import { ComponentArray } from "./ComponentArray";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { OkrenAgeStage } from "./OkrenComponent";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";

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

const getHitbox = (transformComponent: TransformComponent, flag: HitboxFlag): Hitbox => {
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.flags.includes(flag)) {
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

   const bigArmSegmentHitbox = getHitbox(transformComponent, HitboxFlag.OKREN_BIG_ARM_SEGMENT);
   const mediumArmSegmentHitbox = getHitbox(transformComponent, HitboxFlag.OKREN_MEDIUM_ARM_SEGMENT);
   const slashingArmSegmentHitbox = getHitbox(transformComponent, HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION);
   
   const bigArmSegmentSize = getOkrenClawBigArmSegmentSize(size, growthStage);
   const bigArmSegmentOffset = getOkrenClawBigArmSegmentOffset(size, growthStage);
   
   assertBoxIsRectangular(bigArmSegmentHitbox.box);
   bigArmSegmentHitbox.box.width = bigArmSegmentSize.x;
   bigArmSegmentHitbox.box.height = bigArmSegmentSize.y;
   bigArmSegmentHitbox.box.offset.x = bigArmSegmentOffset.x;
   bigArmSegmentHitbox.box.offset.y = bigArmSegmentOffset.y;

   const mediumArmSegmentSize = getOkrenClawMediumArmSegmentSize(size, growthStage);
   const mediumArmSegmentOffset = getOkrenClawMediumArmSegmentOffset(size, growthStage);
   
   assertBoxIsRectangular(mediumArmSegmentHitbox.box);
   mediumArmSegmentHitbox.box.width = mediumArmSegmentSize.x;
   mediumArmSegmentHitbox.box.height = mediumArmSegmentSize.y;
   mediumArmSegmentHitbox.box.offset.x = mediumArmSegmentOffset.x;
   mediumArmSegmentHitbox.box.offset.y = mediumArmSegmentOffset.y;

   const slashingArmSegmentSize = getOkrenClawSlashingArmSegmentSize(size, growthStage);
   const slashingArmSegmentOffset = getOkrenClawSlashingArmSegmentOffset(size, growthStage);
   
   assertBoxIsRectangular(slashingArmSegmentHitbox.box);
   slashingArmSegmentHitbox.box.width = slashingArmSegmentSize.x;
   slashingArmSegmentHitbox.box.height = slashingArmSegmentSize.y;
   slashingArmSegmentHitbox.box.offset.x = slashingArmSegmentOffset.x;
   slashingArmSegmentHitbox.box.offset.y = slashingArmSegmentOffset.y;

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
   if (!affectedHitbox.flags.includes(HitboxFlag.OKREN_ARM_SEGMENT_OF_SLASHING_AND_DESTRUCTION)) {
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
   
   const hitDir = affectedHitbox.box.position.angleTo(collidingHitbox.box.position);

   damageEntity(collidingHitbox, okrenClaw, ATTACK_DAMAGES[okrenClawComponent.size], DamageSource.cactus, AttackEffectiveness.effective, collisionPoint, 0);
   applyAbsoluteKnockback(collidingHitbox, polarVec2(200, hitDir));
   addLocalInvulnerabilityHash(collidingEntity, hash, 0.3);
}