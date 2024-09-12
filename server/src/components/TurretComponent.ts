import { AMMO_INFO_RECORD, ServerComponentType, TURRET_AMMO_TYPES, TurretAmmoType, TurretEntityType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { ComponentArray } from "./ComponentArray";
import { SLING_TURRET_RELOAD_TIME_TICKS, SLING_TURRET_SHOT_COOLDOWN_TICKS } from "../entities/structures/sling-turret";
import Board from "../Board";
import { AmmoBoxComponentArray } from "./AmmoBoxComponent";
import { Packet } from "battletribes-shared/packets";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { Settings } from "battletribes-shared/settings";
import { getMinAngleToCircularBox, getMaxAngleToCircularBox, getMinAngleToRectangularBox, getMaxAngleToRectangularBox, angleIsInRange, getClockwiseAngleDistance } from "../ai-shared";
import { ComponentConfig } from "../components";
import { createBallistaFrostcicleConfig } from "../entities/projectiles/ballista-frostcicle";
import { createBallistaRockConfig } from "../entities/projectiles/ballista-rock";
import { createBallistaSlimeballConfig } from "../entities/projectiles/ballista-slimeball";
import { createBallistaWoodenBoltConfig } from "../entities/projectiles/ballista-wooden-bolt";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { InventoryComponentArray, getInventory, getFirstOccupiedItemSlotInInventory, consumeItemTypeFromInventory } from "./InventoryComponent";
import { TransformComponentArray, TransformComponent } from "./TransformComponent";
import { getEntityRelationship, EntityRelationship } from "./TribeComponent";
import { UtilVars } from "battletribes-shared/utils";
import { boxIsCircular } from "battletribes-shared/boxes/boxes";

export interface TurretComponentParams {
   readonly fireCooldownTicks: number;
}

export class TurretComponent {
   public aimDirection = 0;
   public fireCooldownTicks: number;
   public hasTarget = false;

   constructor(params: TurretComponentParams) {
      this.fireCooldownTicks = params.fireCooldownTicks;
   }
}

export const TurretComponentArray = new ComponentArray<TurretComponent>(ServerComponentType.turret, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const getVisionRange = (turretEntityType: TurretEntityType): number => {
   switch (turretEntityType) {
      case EntityType.slingTurret: 400;
      case EntityType.ballista: 550;
      default: {
         throw new Error();
      }
   }
}

const getAimArcSize = (turretEntityType: TurretEntityType): number => {
   switch (turretEntityType) {
      case EntityType.slingTurret: 2 * UtilVars.PI;
      case EntityType.ballista: UtilVars.PI * 0.5;
      default: {
         throw new Error();
      }
   }
}

const getAmmoType = (turret: EntityID): TurretAmmoType | null => {
   const inventoryComponent = InventoryComponentArray.getComponent(turret);
   const ammoBoxInventory = getInventory(inventoryComponent, InventoryName.ammoBoxInventory);

   const firstOccupiedSlot = getFirstOccupiedItemSlotInInventory(ammoBoxInventory);
   if (firstOccupiedSlot === 0) {
      return null;
   }

   const entityType = Board.getEntityType(turret) as TurretEntityType;
   
   const item = ammoBoxInventory.itemSlots[firstOccupiedSlot]!;
   if (!TURRET_AMMO_TYPES[entityType].includes(item.type as TurretAmmoType)) {
      console.warn("Item type in ammo box isn't ammo");
      return null;
   }

   return item.type as TurretAmmoType;
}

const entityIsTargetted = (turret: EntityID, entity: EntityID): boolean => {
   if (Board.getEntityType(entity) === EntityType.itemEntity) {
      return false;
   }

   if (getEntityRelationship(turret, entity) <= EntityRelationship.friendlyBuilding) {
      return false;
   }

   const entityTransformComponent = TransformComponentArray.getComponent(entity);

   const turretEntityType = Board.getEntityType(turret) as TurretEntityType;
   const visionRange = getVisionRange(turretEntityType);
   const aimArcSize = getAimArcSize(turretEntityType);
   
   // Make sure the entity is within the vision range
   let hasHitboxInRange = false;
   for (let i = 0; i < entityTransformComponent.hitboxes.length; i++) {
      const hitbox = entityTransformComponent.hitboxes[i];
      if (Board.boxIsInRange(entityTransformComponent.position, hitbox.box, visionRange)) {
         hasHitboxInRange = true;
         break;
      }
   }
   if (!hasHitboxInRange) {
      return false;
   }

   const turretTransformComponent = TransformComponentArray.getComponent(turret);

   const minAngle = turretTransformComponent.rotation - aimArcSize / 2;
   const maxAngle = turretTransformComponent.rotation + aimArcSize / 2;

   // Make sure at least 1 of the entities' hitboxes is within the arc
   for (let i = 0; i < entityTransformComponent.hitboxes.length; i++) {
      let minAngleToHitbox: number;
      let maxAngleToHitbox: number;
      
      const hitbox = entityTransformComponent.hitboxes[i];
      const box = hitbox.box;
      if (boxIsCircular(box)) {
         // Circular hitbox
         minAngleToHitbox = getMinAngleToCircularBox(turretTransformComponent.position.x, turretTransformComponent.position.y, box);
         maxAngleToHitbox = getMaxAngleToCircularBox(turretTransformComponent.position.x, turretTransformComponent.position.y, box);
      } else {
         // Rectangular hitbox
         minAngleToHitbox = getMinAngleToRectangularBox(turretTransformComponent.position.x, turretTransformComponent.position.y, box);
         maxAngleToHitbox = getMaxAngleToRectangularBox(turretTransformComponent.position.x, turretTransformComponent.position.y, box);
      }

      if (angleIsInRange(minAngleToHitbox, minAngle, maxAngle) || angleIsInRange(maxAngleToHitbox, minAngle, maxAngle)) {
         return true;
      }
   }

   return false;
}

const getTarget = (turret: EntityID, visibleEntities: ReadonlyArray<EntityID>): EntityID | null => {
   const turretTransformComponent = TransformComponentArray.getComponent(turret);
   
   let closestValidTarget: EntityID;
   let minDist = 9999999.9;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (!entityIsTargetted(turret, entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      const dist = entityTransformComponent.position.calculateDistanceSquaredBetween(turretTransformComponent.position);
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

const attemptAmmoLoad = (ballista: EntityID): void => {
   const ballistaComponent = AmmoBoxComponentArray.getComponent(ballista);
   
   const ammoType = getAmmoType(ballista);
   if (ammoType !== null) {
      // Load the ammo
      ballistaComponent.ammoType = ammoType;
      ballistaComponent.ammoRemaining = AMMO_INFO_RECORD[ammoType].ammoMultiplier;

      const inventoryComponent = InventoryComponentArray.getComponent(ballista);
      consumeItemTypeFromInventory(inventoryComponent, InventoryName.ammoBoxInventory, ammoType, 1);
   }
}

const createProjectile = (transformComponent: TransformComponent, fireDirection: number, ammoType: TurretAmmoType): void => {
   const ammoInfo = AMMO_INFO_RECORD[ammoType];

   let config: ComponentConfig<ServerComponentType.transform | ServerComponentType.physics>;
   
   switch (ammoType) {
      case ItemType.wood: {
         config = createBallistaWoodenBoltConfig();
         break;
      }
      case ItemType.rock: {
         config = createBallistaRockConfig();
         break;
      }
      case ItemType.slimeball: {
         config = createBallistaSlimeballConfig();
         break;
      }
      case ItemType.frostcicle: {
         config = createBallistaFrostcicleConfig();
         break;
      }
   }

   const rotation = ammoType === ItemType.rock || ammoType === ItemType.slimeball ? 2 * Math.PI * Math.random() : fireDirection;

   config[ServerComponentType.transform].position.x = transformComponent.position.x;
   config[ServerComponentType.transform].position.y = transformComponent.position.y;
   config[ServerComponentType.transform].rotation = rotation;
   config[ServerComponentType.physics].velocityX = ammoInfo.projectileSpeed * Math.sin(fireDirection);
   config[ServerComponentType.physics].velocityY = ammoInfo.projectileSpeed * Math.cos(fireDirection);
}

const fire = (turret: EntityID, ammoType: TurretAmmoType): void => {
   const transformComponent = TransformComponentArray.getComponent(turret);
   const turretComponent = TurretComponentArray.getComponent(turret);

   const ammoInfo = AMMO_INFO_RECORD[ammoType];

   const projectileCount = ammoType === ItemType.frostcicle ? 2 : 1;
   for (let i = 0; i < ammoInfo.ammoMultiplier; i++) {
      let fireDirection = turretComponent.aimDirection + transformComponent.rotation;
      fireDirection += projectileCount > 1 ? (i / (ammoInfo.ammoMultiplier - 1) - 0.5) * Math.PI * 0.5 : 0;

      createProjectile(transformComponent, fireDirection, ammoType);
   }

   // Consume ammo
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(turret);
   ammoBoxComponent.ammoRemaining--;

   if (ammoBoxComponent.ammoRemaining === 0) {
      attemptAmmoLoad(turret);
   }
}

function onTick(turretComponent: TurretComponent, turret: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(turret);
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(turret);

   // Attempt to load ammo if there is none loaded
   // @Speed: ideally shouldn't be done every tick, just when the inventory is changed (ammo is added to the inventory)
   if (ammoBoxComponent.ammoRemaining === 0) {
      attemptAmmoLoad(turret);
   }

   const turretEntityType = Board.getEntityType(turret) as TurretEntityType;

   if (aiHelperComponent.visibleEntities.length > 0 && ammoBoxComponent.ammoRemaining > 0) {
      const target = getTarget(turret, aiHelperComponent.visibleEntities);
      if (target !== null) {
         // If the turret has just acquired a target, reset the shot cooldown
         if (!turretComponent.hasTarget) {
            const ammoInfo = AMMO_INFO_RECORD[ammoBoxComponent.ammoType];
            turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
         }
         turretComponent.hasTarget = true;

         const transformComponent = TransformComponentArray.getComponent(turret);
         const targetTransformComponent = TransformComponentArray.getComponent(target);
         
         const targetDirection = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

         const turretAimDirection = turretComponent.aimDirection + transformComponent.rotation;

         // Turn to face the target
         const clockwiseDist = getClockwiseAngleDistance(turretAimDirection, targetDirection);
         if (clockwiseDist >= Math.PI) {
            // Turn counterclockwise
            turretComponent.aimDirection -= Math.PI / 3 * Settings.I_TPS;
            // @Incomplete: Will this sometimes cause snapping?
            if (turretComponent.aimDirection + transformComponent.rotation < targetDirection) {
               turretComponent.aimDirection = targetDirection - transformComponent.rotation;
            }
         } else {
            // Turn clockwise
            turretComponent.aimDirection += Math.PI / 3 * Settings.I_TPS;
            if (turretComponent.aimDirection + transformComponent.rotation > targetDirection) {
               turretComponent.aimDirection = targetDirection - transformComponent.rotation;
            }
         }
         if (turretComponent.fireCooldownTicks > 0) {
            turretComponent.fireCooldownTicks--;
         } else {
            let angleDiff = targetDirection - (turretComponent.aimDirection + transformComponent.rotation);
            while (angleDiff >= Math.PI) {
               angleDiff -= 2 * Math.PI;
            }
            if (Math.abs(angleDiff) < 0.01) {
               fire(turret, ammoBoxComponent.ammoType);
   
               // Reset firing cooldown
               const ammoInfo = AMMO_INFO_RECORD[ammoBoxComponent.ammoType];
               turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks + ammoInfo.reloadTimeTicks;
            }
         }
         return;
      }
   }

   turretComponent.hasTarget = false;
   if (ammoBoxComponent.ammoType === null) {
      turretComponent.fireCooldownTicks = 0;
   } else {
      const ammoInfo = AMMO_INFO_RECORD[ammoBoxComponent.ammoType];
      if (turretComponent.fireCooldownTicks <= ammoInfo.shotCooldownTicks) {
         turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
      } else {
         // Continue reloading even when there are no targets
         turretComponent.fireCooldownTicks--;
      }
   }
}

const getShotCooldownTicks = (turret: EntityID): number => {
   const entityType = Board.getEntityType(turret);
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

const getReloadTimeTicks = (turret: EntityID): number => {
   const entityType = Board.getEntityType(turret);
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

const getChargeProgress = (turret: EntityID): number => {
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

const getReloadProgress = (turret: EntityID): number => {
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
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const turretComponent = TurretComponentArray.getComponent(entity);

   packet.addNumber(turretComponent.aimDirection);
   // @Speed: Both these functions call getComponent for turretComponent when we already get it in this function
   packet.addNumber(getChargeProgress(entity));
   packet.addNumber(getReloadProgress(entity));
}