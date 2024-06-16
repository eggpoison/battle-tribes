import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, GenericArrowType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, getAngleDiff } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import Tribe from "../../Tribe";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { TurretComponent, TurretComponentArray } from "../../components/TurretComponent";
import { GenericArrowInfo, createWoodenArrow } from "../projectiles/wooden-arrow";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox, CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

// @Cleanup: A lot of copy and paste from ballista.ts

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TPS;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TPS);
const VISION_RANGE = 400;

export function createSlingTurretHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new CircularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, 40 - 0.05));
   return hitboxes;
}

export function createSlingTurret(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const slingTurret = new Entity(position, rotation, EntityType.slingTurret, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createSlingTurretHitboxes(slingTurret.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      slingTurret.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(slingTurret.id, new HealthComponent(25));
   StatusEffectComponentArray.addComponent(slingTurret.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned));
   TurretComponentArray.addComponent(slingTurret.id, new TurretComponent(SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS));
   StructureComponentArray.addComponent(slingTurret.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(slingTurret.id, new TribeComponent(tribe));
   AIHelperComponentArray.addComponent(slingTurret.id, new AIHelperComponent(VISION_RANGE));
   
   return slingTurret;
}

const entityIsTargetted = (turret: Entity, entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity.id)) {
      return false;
   }
   
   const relationship = getEntityRelationship(turret.id, entity);
   return relationship > EntityRelationship.friendlyBuilding;
}

const getTarget = (turret: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   let closestValidTarget: Entity;
   let minDist = 9999999.9;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (!entityIsTargetted(turret, entity)) {
         continue;
      }

      const dist = entity.position.calculateDistanceSquaredBetween(turret.position);
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

const fire = (turret: Entity, slingTurretComponent: TurretComponent): void => {
   const arrowInfo: GenericArrowInfo = {
      type: GenericArrowType.slingRock,
      damage: 2,
      knockback: 75,
      hitboxWidth: 20,
      hitboxHeight: 20,
      ignoreFriendlyBuildings: true,
      statusEffect: null
   };
   
   const fireDirection = slingTurretComponent.aimDirection + turret.rotation;
   const arrowCreationInfo = createWoodenArrow(turret.position.copy(), fireDirection, turret.id, arrowInfo);

   // @Cleanup: copy and paste
   const physicsComponent = arrowCreationInfo.components[ServerComponentType.physics];
   physicsComponent.velocity.x = 550 * Math.sin(fireDirection);
   physicsComponent.velocity.y = 550 * Math.cos(fireDirection);
}

export function tickSlingTurret(turret: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(turret.id);
   const slingTurretComponent = TurretComponentArray.getComponent(turret.id);

   if (aiHelperComponent.visibleEntities.length > 0) {
      const target = getTarget(turret, aiHelperComponent.visibleEntities);
      if (target !== null) {
         const targetDirection = turret.position.calculateAngleBetween(target.position);

         const turretAimDirection = slingTurretComponent.aimDirection + turret.rotation;

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

         const newAngleDiff = getAngleDiff(slingTurretComponent.aimDirection + turret.rotation, targetDirection);
         if (Math.abs(newAngleDiff) > Math.abs(angleDiff) || Math.sign(newAngleDiff) !== Math.sign(angleDiff)) {
            slingTurretComponent.aimDirection = targetDirection - turret.rotation;
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