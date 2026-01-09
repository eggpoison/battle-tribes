import { HitboxFlag } from "battletribes-shared/boxes/boxes";
import { GuardianAttackType, ServerComponentType } from "battletribes-shared/components";
import { Entity, DamageSource } from "battletribes-shared/entities";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { getAngleDiff, lerp, Point, polarVec2, randInt, TileIndex, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition } from "../ai-shared";
import { registerDirtyEntity } from "../server/player-clients";
import { AIHelperComponentArray, AIType } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { GuardianSpikyBallComponentArray } from "./GuardianSpikyBallComponent";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { TransformComponentArray } from "./TransformComponent";
import { applyKnockback, Hitbox } from "../hitboxes";

const enum Vars {
   VISION_RANGE = 250,
   LIMB_ORBIT_SPEED = UtilVars.PI * 0.8,

   DEFAULT_GEM_ACTIVATION = 0.25,
   ANGERED_GEM_ACTIVATION = 0.55,
   ACTIVATION_MOVE_SPEED = 0.2,

   MIN_ATTACK_COOLDOWN_TICKS = (2 * Settings.TICK_RATE) | 0,
   MAX_ATTACK_COOLDOWN_TICKS = (3 * Settings.TICK_RATE) | 0
}

export const enum GuardianVars {
   LIMB_ORBIT_RADIUS = 68,
}

export class GuardianComponent {
   public readonly homeTiles: ReadonlyArray<TileIndex>;
   public limbHitboxes = new Array<Hitbox>();

   public lastTargetX = -1;
   public lastTargetY = -1;
   
   public limbNormalDirection = 0;
   public limbsAreOrbiting = false;
   public limbMoveProgress = 0;

   public rubyGemActivation = Vars.DEFAULT_GEM_ACTIVATION;
   public emeraldGemActivation = Vars.DEFAULT_GEM_ACTIVATION;
   public amethystGemActivation = Vars.DEFAULT_GEM_ACTIVATION;

   public limbRubyGemActivation = 0;
   public limbEmeraldGemActivation = 0;
   public limbAmethystGemActivation = 0;

   public ticksUntilNextAttack = randInt(Vars.MIN_ATTACK_COOLDOWN_TICKS, Vars.MAX_ATTACK_COOLDOWN_TICKS);
   public queuedAttackType = GuardianAttackType.none;

   public stopSpecialAttack(guardian: Entity): void {
      this.queuedAttackType = GuardianAttackType.none;
      this.ticksUntilNextAttack = randInt(Vars.MIN_ATTACK_COOLDOWN_TICKS, Vars.MAX_ATTACK_COOLDOWN_TICKS);
      this.setLimbGemActivations(guardian, 0, 0, 0);

      // @Hack
      const transformComponent = TransformComponentArray.getComponent(guardian);
      const guardianHitbox = transformComponent.hitboxes[0];
      this.limbNormalDirection = guardianHitbox.box.angle;

      const aiHelperComponent = AIHelperComponentArray.getComponent(guardian);
      aiHelperComponent.currentAIType = null;
   }

   public setLimbGemActivations(guardian: Entity, rubyActivation: number, emeraldActivation: number, amethystActivation: number): void {
      if (rubyActivation !== this.limbRubyGemActivation || emeraldActivation !== this.limbEmeraldGemActivation || amethystActivation !== this.limbAmethystGemActivation) {
         registerDirtyEntity(guardian);
      }
      
      this.limbRubyGemActivation = rubyActivation;
      this.limbEmeraldGemActivation = emeraldActivation;
      this.limbAmethystGemActivation = amethystActivation;
   }

   constructor(homeTiles: ReadonlyArray<TileIndex>) {
      this.homeTiles = homeTiles;
   }
}

export const GuardianComponentArray = new ComponentArray<GuardianComponent>(ServerComponentType.guardian, true, getDataLength, addDataToPacket);
GuardianComponentArray.onJoin = onJoin;
GuardianComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
GuardianComponentArray.onHitboxCollision = onHitboxCollision;

export function getGuardianLimbOrbitRadius(): number {
   return GuardianVars.LIMB_ORBIT_RADIUS;
}

function onJoin(guardian: Entity): void {
   const guardianComponent = GuardianComponentArray.getComponent(guardian);
   const transformComponent = TransformComponentArray.getComponent(guardian);
   for (let i = 0; i < transformComponent.hitboxes.length; i++) {
      const hitbox = transformComponent.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.GUARDIAN_LIMB_HITBOX)) {
         guardianComponent.limbHitboxes.push(hitbox);
      }
   }
}

const moveGemActivation = (guardianComponent: GuardianComponent, targetActivation: number): void => {
   if (guardianComponent.rubyGemActivation > targetActivation) {
      guardianComponent.rubyGemActivation -= Vars.ACTIVATION_MOVE_SPEED * Settings.DT_S;
      if (guardianComponent.rubyGemActivation < targetActivation) {
         guardianComponent.rubyGemActivation = targetActivation;
      }
   } else if (guardianComponent.rubyGemActivation < targetActivation) {
      guardianComponent.rubyGemActivation += Vars.ACTIVATION_MOVE_SPEED * Settings.DT_S;
      if (guardianComponent.rubyGemActivation > targetActivation) {
         guardianComponent.rubyGemActivation = targetActivation;
      }
   }
   if (guardianComponent.emeraldGemActivation > targetActivation) {
      guardianComponent.emeraldGemActivation -= Vars.ACTIVATION_MOVE_SPEED * Settings.DT_S;
      if (guardianComponent.emeraldGemActivation < targetActivation) {
         guardianComponent.emeraldGemActivation = targetActivation;
      }
   } else if (guardianComponent.emeraldGemActivation < targetActivation) {
      guardianComponent.emeraldGemActivation += Vars.ACTIVATION_MOVE_SPEED * Settings.DT_S;
      if (guardianComponent.emeraldGemActivation > targetActivation) {
         guardianComponent.emeraldGemActivation = targetActivation;
      }
   }
   if (guardianComponent.amethystGemActivation > targetActivation) {
      guardianComponent.amethystGemActivation -= Vars.ACTIVATION_MOVE_SPEED * Settings.DT_S;
      if (guardianComponent.amethystGemActivation < targetActivation) {
         guardianComponent.amethystGemActivation = targetActivation;
      }
   } else if (guardianComponent.amethystGemActivation < targetActivation) {
      guardianComponent.amethystGemActivation += Vars.ACTIVATION_MOVE_SPEED * Settings.DT_S;
      if (guardianComponent.amethystGemActivation > targetActivation) {
         guardianComponent.amethystGemActivation = targetActivation;
      }
   }
}

const updateOrbitingGuardianLimbs = (guardian: Entity, guardianComponent: GuardianComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(guardian);
   const guardianHitbox = transformComponent.hitboxes[0];
   for (let i = 0; i < guardianComponent.limbHitboxes.length; i++) {
      const hitbox = guardianComponent.limbHitboxes[i];
      const box = hitbox.box;

      // @Hack
      const direction = guardianComponent.limbNormalDirection + (i === 0 ? Math.PI * 0.5 : Math.PI * -0.5) - guardianHitbox.box.angle;
      box.offset.x = GuardianVars.LIMB_ORBIT_RADIUS * Math.sin(direction);
      box.offset.y = GuardianVars.LIMB_ORBIT_RADIUS * Math.cos(direction);
      // @Hack
      box.relativeAngle = -guardianHitbox.box.relativeAngle;
   }
   
   transformComponent.isDirty = true;
}

const limbsAreInStagingPosition = (guardian: Entity, guardianComponent: GuardianComponent): boolean => {
   const transformComponent = TransformComponentArray.getComponent(guardian);
   const guardianHitbox = transformComponent.hitboxes[0];

   // @Hack
   const diffFromTarget1 = getAngleDiff(guardianComponent.limbNormalDirection, guardianHitbox.box.angle);
   const diffFromTarget2 = getAngleDiff(guardianComponent.limbNormalDirection + Math.PI, guardianHitbox.box.angle);
   return (diffFromTarget1 >= -0.05 && diffFromTarget1 <= 0.05) || (diffFromTarget2 >= -0.05 && diffFromTarget2 <= 0.05);
}

function onTick(guardian: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(guardian);
   const guardianComponent = GuardianComponentArray.getComponent(guardian);
   
   const guardianAI = aiHelperComponent.getGuardianAI();
   const target = guardianAI.getTarget(guardian);
   if (target !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      
      guardianComponent.lastTargetX = targetHitbox.box.position.x;
      guardianComponent.lastTargetY = targetHitbox.box.position.y;

      // Randomly start special attacks
      if (aiHelperComponent.currentAIType === null) {
         // Randomly set to attack
         if (guardianComponent.queuedAttackType === GuardianAttackType.none) {
            guardianComponent.ticksUntilNextAttack--;
            if (guardianComponent.ticksUntilNextAttack === 0) {
               guardianComponent.queuedAttackType = randInt(1, 3);
            }
         }
         // If just passed staging position, start attack
         if (guardianComponent.queuedAttackType !== GuardianAttackType.none && limbsAreInStagingPosition(guardian, guardianComponent)) {
            switch (guardianComponent.queuedAttackType) {
               case GuardianAttackType.crystalBurst: {
                  aiHelperComponent.currentAIType = AIType.guardianCrystalBurst;
                  break;
               }
               case GuardianAttackType.crystalSlam: {
                  aiHelperComponent.currentAIType = AIType.guardianCrystalSlam;
                  break;
               }
               case GuardianAttackType.summonSpikyBalls: {
                  aiHelperComponent.currentAIType = AIType.guardianSpikyBallSummon;
                  break;
               }
            }
         }
      }
   }
         
   // Special attacks
   switch (aiHelperComponent.currentAIType) {
      case AIType.guardianCrystalSlam: {
         const crystalSlamAI = aiHelperComponent.getGuardianCrystalSlamAI();
         crystalSlamAI.run(guardian, guardianComponent.lastTargetX, guardianComponent.lastTargetY);
         return;
      }
      case AIType.guardianCrystalBurst: {
         const crystalBurstAI = aiHelperComponent.getGuardianCrystalBurstAI();
         crystalBurstAI.run(guardian, guardianComponent.lastTargetX, guardianComponent.lastTargetY);
         return;
      }
      case AIType.guardianSpikyBallSummon: {
         const spikyBallSummonAI = aiHelperComponent.getSpikyBallSummonAI();
         spikyBallSummonAI.run(guardian, guardianComponent.lastTargetX, guardianComponent.lastTargetY);
         return;
      }
   }
   
   // Chase the target
   if (target !== null) {
      moveGemActivation(guardianComponent, Vars.ANGERED_GEM_ACTIVATION);

      guardianAI.run(guardian, target);
   
      if (!guardianComponent.limbsAreOrbiting) {
         guardianComponent.limbMoveProgress = 0;   
         guardianComponent.limbsAreOrbiting = true;
      }
      
      // Move the limbs into the position to orbit
      // @Copynpaste
      if (guardianComponent.limbMoveProgress < 1) {
         guardianComponent.limbMoveProgress += 0.75 * Settings.DT_S;
         if (guardianComponent.limbMoveProgress > 1) {
            guardianComponent.limbMoveProgress = 1;
         }
         
         // If the limbs are in position for staging,
         for (let i = 0; i < guardianComponent.limbHitboxes.length; i++) {
            const hitbox = guardianComponent.limbHitboxes[i];
            const box = hitbox.box;
            
            const startOffsetX = 38 * (i === 0 ? 1 : -1);
            const startOffsetY = 16;
            
            const endOffsetX = GuardianVars.LIMB_ORBIT_RADIUS * (i === 0 ? 1 : -1);
            const endOffsetY = 0;
   
            box.offset.x = lerp(startOffsetX, endOffsetX, guardianComponent.limbMoveProgress);
            box.offset.y = lerp(startOffsetY, endOffsetY, guardianComponent.limbMoveProgress);
            // @Copynpaste
            box.relativeAngle = (i === 0 ? Math.PI * 0.5 : Math.PI * -0.5);
         }

         // @Hack
         const transformComponent = TransformComponentArray.getComponent(guardian);
         const guardianHitbox = transformComponent.hitboxes[0];
         guardianComponent.limbNormalDirection = guardianHitbox.box.angle;
   
         // @Copynpaste
         transformComponent.isDirty = true;
      } else {
         // Orbit the limbs around the guardian
         guardianComponent.limbNormalDirection += Vars.LIMB_ORBIT_SPEED * Settings.DT_S;
         updateOrbitingGuardianLimbs(guardian, guardianComponent);
      }
      return;
   }
   moveGemActivation(guardianComponent, Vars.DEFAULT_GEM_ACTIVATION);

   // Move limbs back to resting state
   if (guardianComponent.limbsAreOrbiting) {
      guardianComponent.limbNormalDirection += Vars.LIMB_ORBIT_SPEED * Settings.DT_S;

      // If just passed staging position, start staging
      if (limbsAreInStagingPosition(guardian, guardianComponent)) {
         guardianComponent.limbsAreOrbiting = false;
         guardianComponent.limbMoveProgress = 0;

         const transformComponent = TransformComponentArray.getComponent(guardian);
         const guardianHitbox = transformComponent.hitboxes[0];
         guardianComponent.limbNormalDirection = guardianHitbox.box.angle;
      }
      updateOrbitingGuardianLimbs(guardian, guardianComponent);
   } else if (!guardianComponent.limbsAreOrbiting && guardianComponent.limbMoveProgress < 1) {
      guardianComponent.limbMoveProgress += 0.75 * Settings.DT_S;
      if (guardianComponent.limbMoveProgress > 1) {
         guardianComponent.limbMoveProgress = 1;
      }
      
      // If the limbs are in position for staging, 
      for (let i = 0; i < guardianComponent.limbHitboxes.length; i++) {
         const hitbox = guardianComponent.limbHitboxes[i];
         const box = hitbox.box;

         const startOffsetX = GuardianVars.LIMB_ORBIT_RADIUS * (i === 0 ? 1 : -1);
         const startOffsetY = 0;
   
         const endOffsetX = 38 * (i === 0 ? 1 : -1);
         const endOffsetY = 16;

         box.offset.x = lerp(startOffsetX, endOffsetX, guardianComponent.limbMoveProgress);
         box.offset.y = lerp(startOffsetY, endOffsetY, guardianComponent.limbMoveProgress);
         // @Copynpaste
         box.relativeAngle = (i === 0 ? Math.PI * 0.5 : Math.PI * -0.5);
      }

      // @Copynpaste
      const transformComponent = TransformComponentArray.getComponent(guardian);
      transformComponent.isDirty = true;
   }
      
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(guardian);
   if (wanderAI.targetPosition !== null) {
      moveEntityToPosition(guardian, wanderAI.targetPosition.x, wanderAI.targetPosition.y, 200, 0.5 * Math.PI, 1);
   }
}

function getDataLength(): number {
   return 9 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const guardianComponent = GuardianComponentArray.getComponent(entity);

   packet.writeNumber(guardianComponent.rubyGemActivation);
   packet.writeNumber(guardianComponent.emeraldGemActivation);
   packet.writeNumber(guardianComponent.amethystGemActivation);

   packet.writeNumber(guardianComponent.limbRubyGemActivation);
   packet.writeNumber(guardianComponent.limbEmeraldGemActivation);
   packet.writeNumber(guardianComponent.limbAmethystGemActivation);

   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   
   // Attack type and stage
   const attackType = aiHelperComponent.currentAIType !== null ? guardianComponent.queuedAttackType : GuardianAttackType.none;
   packet.writeNumber(attackType);

   let stageProgress: number;
   switch (guardianComponent.queuedAttackType) {
      case GuardianAttackType.crystalSlam: {
         const crystalSlamAI = aiHelperComponent.getGuardianCrystalSlamAI();
         packet.writeNumber(crystalSlamAI.stage);
         stageProgress = crystalSlamAI.stageProgress;
         break;
      }
      case GuardianAttackType.crystalBurst: {
         const crystalBurstAI = aiHelperComponent.getGuardianCrystalBurstAI();
         packet.writeNumber(crystalBurstAI.stage);
         stageProgress = crystalBurstAI.stageProgress;
         break;
      }
      case GuardianAttackType.summonSpikyBalls: {
         const spikyBallSummonAI = aiHelperComponent.getSpikyBallSummonAI();
         packet.writeNumber(spikyBallSummonAI.stage);
         stageProgress = spikyBallSummonAI.stageProgress;
         break;
      }
      default: {
         packet.padOffset(Float32Array.BYTES_PER_ELEMENT);
         stageProgress = 0;
         break;
      }
   }

   packet.writeNumber(stageProgress);
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   // Only the limbs can damage entities
   // @Temporary?
   // if (!actingHitbox.flags.includes(HitboxFlag.GUARDIAN_LIMB_HITBOX)) {
   //    return;
   // }

   const collidingEntity = collidingHitbox.entity;
   
   // Don't attack spiky balls or other guardians
   if (GuardianSpikyBallComponentArray.hasComponent(collidingEntity) || GuardianComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "guardianLimb")) {
         return;
      }

      const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);
      
      damageEntity(collidingHitbox, hitbox.entity, 2, DamageSource.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingHitbox, polarVec2(200, hitDirection));
      addLocalInvulnerabilityHash(collidingEntity, "guardianLimb", 0.3);
   }
}