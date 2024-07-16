import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, getAngleDiff } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig } from "../../Entity";
import { HealthComponentArray } from "../../components/HealthComponent";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { TurretComponent, TurretComponentArray } from "../../components/TurretComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createSlingTurretHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createSlingTurretRockConfig } from "../projectiles/sling-turret-rock";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.aiHelper
   | ServerComponentType.turret;

// @Cleanup: A lot of copy and paste from ballista.ts

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TPS;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TPS);
const VISION_RANGE = 400;

export function createSlingTurretConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slingTurret,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createSlingTurretHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 25
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.poisoned
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.turret]: {
         fireCooldownTicks: SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS
      }
   };
}

const entityIsTargetted = (turret: EntityID, entity: EntityID): boolean => {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }
   
   const relationship = getEntityRelationship(turret, entity);
   return relationship > EntityRelationship.friendlyBuilding;
}

const getTarget = (turret: EntityID, visibleEntities: ReadonlyArray<EntityID>): EntityID | null => {
   const transformComponent = TransformComponentArray.getComponent(turret);
   
   let closestValidTarget: EntityID;
   let minDist = 9999999.9;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (!entityIsTargetted(turret, entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      const dist = entityTransformComponent.position.calculateDistanceSquaredBetween(transformComponent.position);
      if (dist < minDist) {
         minDist = dist;
         closestValidTarget = entity;
      }
   }

   if (minDist < 9999999.9) {
      return closestValidTarget!;
   }
   return null;
}

const fire = (turret: EntityID, slingTurretComponent: TurretComponent): void => {
   const transformComponent = TransformComponentArray.getComponent(turret);
   
   const fireDirection = slingTurretComponent.aimDirection + transformComponent.rotation;

   const config = createSlingTurretRockConfig();
   config[ServerComponentType.transform].position.x = transformComponent.position.x;
   config[ServerComponentType.transform].position.y = transformComponent.position.y;
   config[ServerComponentType.transform].rotation = fireDirection;
   config[ServerComponentType.physics].velocityX = 550 * Math.sin(fireDirection);
   config[ServerComponentType.physics].velocityY = 550 * Math.cos(fireDirection);
   config[ServerComponentType.projectile].owner = turret;
   createEntityFromConfig(config);
}

export function tickSlingTurret(turret: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(turret);
   const slingTurretComponent = TurretComponentArray.getComponent(turret);

   if (aiHelperComponent.visibleEntities.length > 0) {
      const target = getTarget(turret, aiHelperComponent.visibleEntities);
      if (target !== null) {
         const transformComponent = TransformComponentArray.getComponent(turret);
         const targetTransformComponent = TransformComponentArray.getComponent(turret);
         
         const targetDirection = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

         const turretAimDirection = slingTurretComponent.aimDirection + transformComponent.rotation;

         // Turn to face the target
         const angleDiff = getAngleDiff(turretAimDirection, targetDirection);
         if (angleDiff < 0) {
            slingTurretComponent.aimDirection -= Math.PI * Settings.I_TPS;
         } else {
            slingTurretComponent.aimDirection += Math.PI * Settings.I_TPS;
         }

         if (slingTurretComponent.fireCooldownTicks > 0) {
            slingTurretComponent.fireCooldownTicks--;
         }

         const newAngleDiff = getAngleDiff(slingTurretComponent.aimDirection + transformComponent.rotation, targetDirection);
         if (Math.abs(newAngleDiff) > Math.abs(angleDiff) || Math.sign(newAngleDiff) !== Math.sign(angleDiff)) {
            slingTurretComponent.aimDirection = targetDirection - transformComponent.rotation;
            if (slingTurretComponent.fireCooldownTicks === 0) {
               fire(turret, slingTurretComponent);
               slingTurretComponent.fireCooldownTicks = SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS;
            }
         }
         return;
      }
   }

   if (slingTurretComponent.fireCooldownTicks < SLING_TURRET_SHOT_COOLDOWN_TICKS) {
      slingTurretComponent.fireCooldownTicks = SLING_TURRET_SHOT_COOLDOWN_TICKS;
   }
}