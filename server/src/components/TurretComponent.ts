import { Bytes } from "../../../shared/dist/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { SLING_TURRET_RELOAD_TIME_TICKS, SLING_TURRET_SHOT_COOLDOWN_TICKS } from "../entities/structures/sling-turret.js";
import { AmmoBoxComponentArray } from "./AmmoBoxComponent.js";
import { getMinAngleToCircularBox, getMaxAngleToCircularBox, getMinAngleToRectangularBox, getMaxAngleToRectangularBox, angleIsInRange, getClockwiseAngleDistance, entityIsInLineOfSight } from "../ai-shared.js";
import { EntityConfig, getConfigTransformComponent } from "../components.js";
import { createBallistaFrostcicleConfig } from "../entities/projectiles/ballista-frostcicle.js";
import { createBallistaRockConfig } from "../entities/projectiles/ballista-rock.js";
import { createBallistaSlimeballConfig } from "../entities/projectiles/ballista-slimeball.js";
import { createBallistaWoodenBoltConfig } from "../entities/projectiles/ballista-wooden-bolt.js";
import { AIHelperComponentArray } from "./AIHelperComponent.js";
import { TransformComponentArray, TransformComponent } from "./TransformComponent.js";
import { getEntityRelationship, EntityRelationship, TribeComponentArray } from "./TribeComponent.js";
import { createEntity, getEntityLayer, getEntityType } from "../world.js";
import { registerDirtyEntity } from "../server/player-clients.js";
import { createSlingTurretRockConfig } from "../entities/projectiles/sling-turret-rock.js";
import { HealthComponentArray } from "./HealthComponent.js";
import { addHitboxVelocity } from "../hitboxes.js";
import { boxIsCircular } from "../../../shared/dist/boxes.js";
import { ServerComponentType, TurretEntityType, TurretAmmoType, AMMO_INFO_RECORD } from "../../../shared/dist/components.js";
import { EntityType, Entity } from "../../../shared/dist/entities.js";
import { ItemType } from "../../../shared/dist/items/items.js";
import { Packet } from "../../../shared/dist/packets.js";
import { Settings } from "../../../shared/dist/settings.js";
import { UtilVar, calculateDistanceSquared, randAngle, polarVec2, angle } from "../../../shared/dist/utils.js";

export class TurretComponent {
   public aimDirection = 0;
   public fireCooldownTicks: number;
   public hasTarget = false;

   constructor(fireCooldownTicks: number) {
      this.fireCooldownTicks = fireCooldownTicks;
   }
}

export const TurretComponentArray = new ComponentArray<TurretComponent>(ServerComponentType.turret, true, getDataLength, addDataToPacket);
TurretComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

const getAimArcSize = (turretEntityType: TurretEntityType): number => {
   switch (turretEntityType) {
      case EntityType.slingTurret: return 2 * UtilVar.PI;
      case EntityType.ballista: return UtilVar.PI * 0.5;
      default: {
         throw new Error();
      }
   }
}

const entityIsTargetted = (turret: Entity, entity: Entity): boolean => {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }

   if (getEntityRelationship(turret, entity) <= EntityRelationship.friendlyBuilding) {
      return false;
   }
   
   const turretTransformComponent = TransformComponentArray.getComponent(turret);
   const turretHitbox = turretTransformComponent.hitboxes[0];

   // @Hack: pathfinding group ID
   if (!entityIsInLineOfSight(turretHitbox.box.posX, turretHitbox.box.posY, entity, turret)) {
      return false;
   }

   const turretEntityType = getEntityType(turret) as TurretEntityType;
   const aimArcSize = getAimArcSize(turretEntityType);
   
   const minAngle = turretHitbox.box.angle - aimArcSize / 2;
   const maxAngle = turretHitbox.box.angle + aimArcSize / 2;

   // Make sure at least 1 of the entities' hitboxes is within the arc
   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < entityTransformComponent.hitboxes.length; i++) {
      let minAngleToHitbox: number;
      let maxAngleToHitbox: number;

      const hitbox = entityTransformComponent.hitboxes[i];
      const box = hitbox.box;
      if (boxIsCircular(box)) {
         // Circular hitbox
         minAngleToHitbox = getMinAngleToCircularBox(turretHitbox.box.posX, turretHitbox.box.posY, box);
         maxAngleToHitbox = getMaxAngleToCircularBox(turretHitbox.box.posX, turretHitbox.box.posY, box);
      } else {
         // Rectangular hitbox
         minAngleToHitbox = getMinAngleToRectangularBox(turretHitbox.box.posX, turretHitbox.box.posY, box);
         maxAngleToHitbox = getMaxAngleToRectangularBox(turretHitbox.box.posX, turretHitbox.box.posY, box);
      }

      if (angleIsInRange(minAngleToHitbox, minAngle, maxAngle) || angleIsInRange(maxAngleToHitbox, minAngle, maxAngle)) {
         return true;
      }
   }

   return false;
}

const getTarget = (turret: Entity, visibleEntities: readonly Entity[]): Entity | null => {
   const turretTransformComponent = TransformComponentArray.getComponent(turret);
   const turretHitbox = turretTransformComponent.hitboxes[0];
   
   let closestValidTarget: Entity;
   let minDist = 9999999.9;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (!entityIsTargetted(turret, entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      // @Hack
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = calculateDistanceSquared(entityHitbox.box.posX, entityHitbox.box.posY, turretHitbox.box.posX, turretHitbox.box.posY);
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

const createProjectile = (turret: Entity, transformComponent: TransformComponent, fireDirection: number, ammoType: TurretAmmoType): void => {
   const tribeComponent = TribeComponentArray.getComponent(turret);
   const tribe = tribeComponent.tribe;
   
   const ammoInfo = AMMO_INFO_RECORD[ammoType];

   const turretHitbox = transformComponent.hitboxes[0];
   const x = turretHitbox.box.posX;
   const y = turretHitbox.box.posY;
   const angle = ammoType === ItemType.rock || ammoType === ItemType.slimeball ? randAngle() : fireDirection;
   
   let config: EntityConfig;
   
   // @Hack
   if (getEntityType(turret) === EntityType.slingTurret) {
      config = createSlingTurretRockConfig(x, y, angle, turret);
   } else {
      switch (ammoType) {
         case ItemType.wood: {
            config = createBallistaWoodenBoltConfig(x, y, angle, tribe, turret);
            break;
         }
         case ItemType.rock: {
            config = createBallistaRockConfig(x, y, angle, tribe, turret);
            break;
         }
         case ItemType.slimeball: {
            config = createBallistaSlimeballConfig(x, y, angle, tribe, turret);
            break;
         }
         case ItemType.frostcicle: {
            config = createBallistaFrostcicleConfig(x, y, angle, tribe, turret);
            break;
         }
      }
   }

   const projectileHitbox = getConfigTransformComponent(config.components).hitboxes[0];
   addHitboxVelocity(projectileHitbox, polarVec2(ammoInfo.projectileSpeed, fireDirection));

   createEntity(config, getEntityLayer(turret), 0)
}

const fire = (turret: Entity, ammoType: TurretAmmoType): void => {
   const transformComponent = TransformComponentArray.getComponent(turret);
   const turretHitbox = transformComponent.hitboxes[0];
   
   const turretComponent = TurretComponentArray.getComponent(turret);

   const ammoInfo = AMMO_INFO_RECORD[ammoType];

   const projectileCount = ammoType === ItemType.frostcicle ? 2 : 1;
   for (let i = 0; i < ammoInfo.ammoMultiplier; i++) {
      let fireDirection = turretComponent.aimDirection + turretHitbox.box.angle;
      fireDirection += projectileCount > 1 ? (i / (ammoInfo.ammoMultiplier - 1) - 0.5) * Math.PI * 0.5 : 0;

      createProjectile(turret, transformComponent, fireDirection, ammoType);
   }

   // Consume ammo
   if (AmmoBoxComponentArray.hasComponent(turret)) {
      const ammoBoxComponent = AmmoBoxComponentArray.getComponent(turret);
      ammoBoxComponent.ammoRemaining--;
   }
}

function onTick(turret: Entity): void {
   // @SQUEAM
   if(1+1===2)return;
   
   const aiHelperComponent = AIHelperComponentArray.getComponent(turret);
   const turretComponent = TurretComponentArray.getComponent(turret);

   // @Hack
   // @Hack: the ballista rock and the sling turret rock should be different
   let ammoType: TurretAmmoType | null;
   if (AmmoBoxComponentArray.hasComponent(turret)) {
      const ammoBoxComponent = AmmoBoxComponentArray.getComponent(turret);
      if (ammoBoxComponent.ammoRemaining > 0) {
         ammoType = ammoBoxComponent.ammoType;
      } else {
         ammoType = null;
      }
   } else {
      ammoType = ItemType.rock;
   }

   if (aiHelperComponent.visibleEntities.length > 0 && ammoType !== null) {
      const target = getTarget(turret, aiHelperComponent.visibleEntities);
      if (target !== null) {
         // If the turret has just acquired a target, reset the shot cooldown
         if (!turretComponent.hasTarget) {
            const ammoInfo = AMMO_INFO_RECORD[ammoType];
            turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
         }
         turretComponent.hasTarget = true;

         const transformComponent = TransformComponentArray.getComponent(turret);
         const turretHitbox = transformComponent.hitboxes[0];
         
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         // @HACK
         const targetHitbox = targetTransformComponent.hitboxes[0];
         
         const targetDirection = angle(targetHitbox.box.posX - turretHitbox.box.posX, targetHitbox.box.posY - turretHitbox.box.posY);

         const turretAimDirection = turretComponent.aimDirection + turretHitbox.box.angle;

         // Turn to face the target
         const clockwiseDist = getClockwiseAngleDistance(turretAimDirection, targetDirection);
         if (clockwiseDist >= Math.PI) {
            // Turn counterclockwise
            turretComponent.aimDirection -= Math.PI / 3 * Settings.DT_S;
            // @Incomplete: Will this sometimes cause snapping?
            if (turretComponent.aimDirection + turretHitbox.box.angle < targetDirection) {
               turretComponent.aimDirection = targetDirection - turretHitbox.box.angle;
            }
         } else {
            // Turn clockwise
            turretComponent.aimDirection += Math.PI / 3 * Settings.DT_S;
            if (turretComponent.aimDirection + turretHitbox.box.angle > targetDirection) {
               turretComponent.aimDirection = targetDirection - turretHitbox.box.angle;
            }
         }
         registerDirtyEntity(turret);
         if (turretComponent.fireCooldownTicks > 0) {
            turretComponent.fireCooldownTicks--;
         } else {
            let angleDiff = targetDirection - (turretComponent.aimDirection + turretHitbox.box.angle);
            while (angleDiff >= Math.PI) {
               angleDiff -= 2 * Math.PI;
            }
            if (Math.abs(angleDiff) < 0.01) {
               fire(turret, ammoType);
   
               // Reset firing cooldown
               const ammoInfo = AMMO_INFO_RECORD[ammoType];
               turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks + ammoInfo.reloadTimeTicks;
            }
         }
         return;
      }
   }

   turretComponent.hasTarget = false;
   if (ammoType === null) {
      turretComponent.fireCooldownTicks = 0;
   } else {
      const ammoInfo = AMMO_INFO_RECORD[ammoType];
      if (turretComponent.fireCooldownTicks <= ammoInfo.shotCooldownTicks) {
         turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
      } else {
         // Continue reloading even when there are no targets
         turretComponent.fireCooldownTicks--;
      }
   }
}

const getShotCooldownTicks = (turret: Entity): number => {
   const entityType = getEntityType(turret);
   switch (entityType) {
      case EntityType.ballista: {
         const ballistaComponent = AmmoBoxComponentArray.getComponent(turret);
         return AMMO_INFO_RECORD[ballistaComponent.ammoType].shotCooldownTicks;
      }
      case EntityType.slingTurret: {
         return SLING_TURRET_SHOT_COOLDOWN_TICKS;
      }
   }

   // @Robustness
   throw new Error("Unknown turret type " + entityType);
}

const getReloadTimeTicks = (turret: Entity): number => {
   const entityType = getEntityType(turret);
   switch (entityType) {
      case EntityType.ballista: {
         const ballistaComponent = AmmoBoxComponentArray.getComponent(turret);
         return AMMO_INFO_RECORD[ballistaComponent.ammoType].reloadTimeTicks;
      }
      case EntityType.slingTurret: {
         return SLING_TURRET_RELOAD_TIME_TICKS;
      }
   }

   // @Robustness
   throw new Error("Unknown turret type " + entityType);
}

const getChargeProgress = (turret: Entity): number => {
   // @Incomplete?
   // const ballistaComponent = BallistaComponentArray.getComponent(ballista.id);
   // if (ballistaComponent.ammoRemaining === 0) {
   //    return 0;
   // }

   const shotCooldownTicks = getShotCooldownTicks(turret);
   const turretComponent = TurretComponentArray.getComponent(turret);
   
   if (turretComponent.fireCooldownTicks > shotCooldownTicks) {
      return 0;
   }

   return 1 - turretComponent.fireCooldownTicks / shotCooldownTicks;
}

const getReloadProgress = (turret: Entity): number => {
   // @Incomplete?
   // const ballistaComponent = BallistaComponentArray.getComponent(ballista.id);
   // if (ballistaComponent.ammoRemaining === 0) {
   //    return 0;
   // }

   const shotCooldownTicks = getShotCooldownTicks(turret);
   const turretComponent = TurretComponentArray.getComponent(turret);

   // If the shot is charging, the turret has already reloaded
   if (turretComponent.fireCooldownTicks < shotCooldownTicks) {
      return 0;
   }
   
   const reloadTimeTicks = getReloadTimeTicks(turret);
   return 1 - (turretComponent.fireCooldownTicks - shotCooldownTicks) / reloadTimeTicks;
}

function getDataLength(): number {
   return 3 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const turretComponent = TurretComponentArray.getComponent(entity);

   packet.writeNumber(turretComponent.aimDirection);
   // @Speed: Both these functions call getComponent for turretComponent when we already get it in this function
   packet.writeNumber(getChargeProgress(entity));
   packet.writeNumber(getReloadProgress(entity));
}