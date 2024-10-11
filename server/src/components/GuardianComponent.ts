import { Hitbox, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { GuardianAttackType, ServerComponentType } from "battletribes-shared/components";
import { EntityID, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { Packet } from "battletribes-shared/packets";
import { Settings } from "battletribes-shared/settings";
import { getAngleDiff, lerp, Point, randInt, TileIndex, UtilVars } from "battletribes-shared/utils";
import { stopEntity } from "../ai-shared";
import { registerDirtyEntity } from "../server/player-clients";
import { AIHelperComponentArray, AIType } from "./AIHelperComponent";
import { ComponentArray } from "./ComponentArray";
import { GuardianSpikyBallComponentArray } from "./GuardianSpikyBallComponent";
import { HealthComponentArray, canDamageEntity, damageEntity, addLocalInvulnerabilityHash } from "./HealthComponent";
import { applyKnockback, PhysicsComponentArray } from "./PhysicsComponent";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   VISION_RANGE = 250,
   LIMB_ORBIT_SPEED = UtilVars.PI * 0.8,

   DEFAULT_GEM_ACTIVATION = 0.25,
   ANGERED_GEM_ACTIVATION = 0.55,
   ACTIVATION_MOVE_SPEED = 0.2,

   MIN_ATTACK_COOLDOWN_TICKS = (2 * Settings.TPS) | 0,
   MAX_ATTACK_COOLDOWN_TICKS = (3 * Settings.TPS) | 0
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

   public stopSpecialAttack(guardian: EntityID): void {
      this.queuedAttackType = GuardianAttackType.none;
      this.ticksUntilNextAttack = randInt(Vars.MIN_ATTACK_COOLDOWN_TICKS, Vars.MAX_ATTACK_COOLDOWN_TICKS);
      this.setLimbGemActivations(guardian, 0, 0, 0);

      // @Hack
      const transformComponent = TransformComponentArray.getComponent(guardian);
      this.limbNormalDirection = transformComponent.rotation;

      const physicsComponent = PhysicsComponentArray.getComponent(guardian);
      stopEntity(physicsComponent);

      const aiHelperComponent = AIHelperComponentArray.getComponent(guardian);
      aiHelperComponent.currentAIType = null;
   }

   public setLimbGemActivations(guardian: EntityID, rubyActivation: number, emeraldActivation: number, amethystActivation: number): void {
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

export const GuardianComponentArray = new ComponentArray<GuardianComponent>(ServerComponentType.guardian, true, {
   onJoin: onJoin,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onHitboxCollision: onHitboxCollision,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

export function getGuardianLimbOrbitRadius(): number {
   return GuardianVars.LIMB_ORBIT_RADIUS;
}

function onJoin(guardian: EntityID): void {
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
      guardianComponent.rubyGemActivation -= Vars.ACTIVATION_MOVE_SPEED * Settings.I_TPS;
      if (guardianComponent.rubyGemActivation < targetActivation) {
         guardianComponent.rubyGemActivation = targetActivation;
      }
   } else if (guardianComponent.rubyGemActivation < targetActivation) {
      guardianComponent.rubyGemActivation += Vars.ACTIVATION_MOVE_SPEED * Settings.I_TPS;
      if (guardianComponent.rubyGemActivation > targetActivation) {
         guardianComponent.rubyGemActivation = targetActivation;
      }
   }
   if (guardianComponent.emeraldGemActivation > targetActivation) {
      guardianComponent.emeraldGemActivation -= Vars.ACTIVATION_MOVE_SPEED * Settings.I_TPS;
      if (guardianComponent.emeraldGemActivation < targetActivation) {
         guardianComponent.emeraldGemActivation = targetActivation;
      }
   } else if (guardianComponent.emeraldGemActivation < targetActivation) {
      guardianComponent.emeraldGemActivation += Vars.ACTIVATION_MOVE_SPEED * Settings.I_TPS;
      if (guardianComponent.emeraldGemActivation > targetActivation) {
         guardianComponent.emeraldGemActivation = targetActivation;
      }
   }
   if (guardianComponent.amethystGemActivation > targetActivation) {
      guardianComponent.amethystGemActivation -= Vars.ACTIVATION_MOVE_SPEED * Settings.I_TPS;
      if (guardianComponent.amethystGemActivation < targetActivation) {
         guardianComponent.amethystGemActivation = targetActivation;
      }
   } else if (guardianComponent.amethystGemActivation < targetActivation) {
      guardianComponent.amethystGemActivation += Vars.ACTIVATION_MOVE_SPEED * Settings.I_TPS;
      if (guardianComponent.amethystGemActivation > targetActivation) {
         guardianComponent.amethystGemActivation = targetActivation;
      }
   }
}

const updateOrbitingGuardianLimbs = (guardian: EntityID, guardianComponent: GuardianComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(guardian);
   for (let i = 0; i < guardianComponent.limbHitboxes.length; i++) {
      const hitbox = guardianComponent.limbHitboxes[i];
      const box = hitbox.box;

      // @Hack
      const direction = guardianComponent.limbNormalDirection + (i === 0 ? Math.PI * 0.5 : Math.PI * -0.5) - transformComponent.rotation;
      box.offset.x = GuardianVars.LIMB_ORBIT_RADIUS * Math.sin(direction);
      box.offset.y = GuardianVars.LIMB_ORBIT_RADIUS * Math.cos(direction);
      // @Hack
      box.relativeRotation = -transformComponent.rotation;
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(guardian);
   physicsComponent.hitboxesAreDirty = true;
}

const limbsAreInStagingPosition = (guardian: EntityID, guardianComponent: GuardianComponent): boolean => {
   const transformComponent = TransformComponentArray.getComponent(guardian);
   // @Hack
   const diffFromTarget1 = getAngleDiff(guardianComponent.limbNormalDirection, transformComponent.rotation);
   const diffFromTarget2 = getAngleDiff(guardianComponent.limbNormalDirection + Math.PI, transformComponent.rotation);
   return (diffFromTarget1 >= -0.05 && diffFromTarget1 <= 0.05) || (diffFromTarget2 >= -0.05 && diffFromTarget2 <= 0.05);
}

function onTick(guardianComponent: GuardianComponent, guardian: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(guardian);
   
   const guardianAI = aiHelperComponent.getGuardianAI();
   const target = guardianAI.getTarget(guardian);
   if (target !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);
      guardianComponent.lastTargetX = targetTransformComponent.position.x;
      guardianComponent.lastTargetY = targetTransformComponent.position.y;

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
         guardianComponent.limbMoveProgress += 0.75 * Settings.I_TPS;
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
            box.relativeRotation = (i === 0 ? Math.PI * 0.5 : Math.PI * -0.5);
         }

         // @Hack
         const transformComponent = TransformComponentArray.getComponent(guardian);
         guardianComponent.limbNormalDirection = transformComponent.rotation;
   
         // @Copynpaste
         const physicsComponent = PhysicsComponentArray.getComponent(guardian);
         physicsComponent.hitboxesAreDirty = true;
      } else {
         // Orbit the limbs around the guardian
         guardianComponent.limbNormalDirection += Vars.LIMB_ORBIT_SPEED * Settings.I_TPS;
         updateOrbitingGuardianLimbs(guardian, guardianComponent);
      }
      return;
   }
   moveGemActivation(guardianComponent, Vars.DEFAULT_GEM_ACTIVATION);

   // Move limbs back to resting state
   if (guardianComponent.limbsAreOrbiting) {
      guardianComponent.limbNormalDirection += Vars.LIMB_ORBIT_SPEED * Settings.I_TPS;

      // If just passed staging position, start staging
      if (limbsAreInStagingPosition(guardian, guardianComponent)) {
         guardianComponent.limbsAreOrbiting = false;
         guardianComponent.limbMoveProgress = 0;

         const transformComponent = TransformComponentArray.getComponent(guardian);
         guardianComponent.limbNormalDirection = transformComponent.rotation;
      }
      updateOrbitingGuardianLimbs(guardian, guardianComponent);
   } else if (!guardianComponent.limbsAreOrbiting && guardianComponent.limbMoveProgress < 1) {
      guardianComponent.limbMoveProgress += 0.75 * Settings.I_TPS;
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
         box.relativeRotation = (i === 0 ? Math.PI * 0.5 : Math.PI * -0.5);
      }

      // @Copynpaste
      const physicsComponent = PhysicsComponentArray.getComponent(guardian);
      physicsComponent.hitboxesAreDirty = true;
   }
      
   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.run(guardian);
}

function getDataLength(): number {
   return 10 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const guardianComponent = GuardianComponentArray.getComponent(entity);

   packet.addNumber(guardianComponent.rubyGemActivation);
   packet.addNumber(guardianComponent.emeraldGemActivation);
   packet.addNumber(guardianComponent.amethystGemActivation);

   packet.addNumber(guardianComponent.limbRubyGemActivation);
   packet.addNumber(guardianComponent.limbEmeraldGemActivation);
   packet.addNumber(guardianComponent.limbAmethystGemActivation);

   const aiHelperComponent = AIHelperComponentArray.getComponent(entity);
   
   // Attack type and stage
   const attackType = aiHelperComponent.currentAIType !== null ? guardianComponent.queuedAttackType : GuardianAttackType.none;
   packet.addNumber(attackType);

   let stageProgress: number;
   switch (guardianComponent.queuedAttackType) {
      case GuardianAttackType.crystalSlam: {
         const crystalSlamAI = aiHelperComponent.getGuardianCrystalSlamAI();
         packet.addNumber(crystalSlamAI.stage);
         stageProgress = crystalSlamAI.stageProgress;
         break;
      }
      case GuardianAttackType.crystalBurst: {
         const crystalBurstAI = aiHelperComponent.getGuardianCrystalBurstAI();
         packet.addNumber(crystalBurstAI.stage);
         stageProgress = crystalBurstAI.stageProgress;
         break;
      }
      case GuardianAttackType.summonSpikyBalls: {
         const spikyBallSummonAI = aiHelperComponent.getSpikyBallSummonAI();
         packet.addNumber(spikyBallSummonAI.stage);
         stageProgress = spikyBallSummonAI.stageProgress;
         break;
      }
      default: {
         packet.padOffset(Float32Array.BYTES_PER_ELEMENT);
         stageProgress = 0;
         break;
      }
   }

   packet.addNumber(stageProgress);
}

function onHitboxCollision(guardian: EntityID, collidingEntity: EntityID, actingHitbox: Hitbox, _receivingHitbox: Hitbox, collisionPoint: Point): void {
   // Only the limbs can damage entities
   if (!actingHitbox.flags.includes(HitboxFlag.GUARDIAN_LIMB_HITBOX)) {
      return;
   }

   // Don't attack spiky balls or other guardians
   if (GuardianSpikyBallComponentArray.hasComponent(collidingEntity) || GuardianComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (!canDamageEntity(healthComponent, "guardianLimb")) {
         return;
      }

      const transformComponent = TransformComponentArray.getComponent(guardian);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, guardian, 2, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 200, hitDirection);
      addLocalInvulnerabilityHash(healthComponent, "guardianLimb", 0.3);
   }
}