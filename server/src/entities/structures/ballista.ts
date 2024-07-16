import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { AMMO_INFO_RECORD, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { TurretComponentArray } from "../../components/TurretComponent";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { AmmoBoxComponentArray } from "../../components/AmmoBoxComponent";
import { InventoryComponentArray, consumeItemTypeFromInventory, getFirstOccupiedItemSlotInInventory, getInventory } from "../../components/InventoryComponent";
import { angleIsInRange, getClockwiseAngleDistance, getMaxAngleToCircularHitbox, getMaxAngleToRectangularHitbox, getMinAngleToCircularHitbox, getMinAngleToRectangularHitbox } from "../../ai-shared";
import Board from "../../Board";
import { hitboxIsCircular } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { createBallistaHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import { InventoryName, BallistaAmmoType, BALLISTA_AMMO_TYPES, ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ComponentConfig } from "../../components";
import { createBallistaWoodenBoltConfig } from "../projectiles/ballista-wooden-bolt";
import { createBallistaRockConfig } from "../projectiles/ballista-rock";
import { createBallistaSlimeballConfig } from "../projectiles/ballista-slimeball";
import { createBallistaFrostcicleConfig } from "../projectiles/ballista-frostcicle";
import { createEmptyStructureConnectionInfo } from "webgl-test-shared/dist/structures";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.turret
   | ServerComponentType.aiHelper
   | ServerComponentType.ammoBox
   | ServerComponentType.inventory;

const VISION_RANGE = 550;
const AIM_ARC_SIZE = Math.PI / 2;

export function createBallistaConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.ballista,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: createBallistaHitboxes()
      },
      [ServerComponentType.health]: {
         maxHealth: 100
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned | StatusEffect.bleeding
      },
      [ServerComponentType.structure]: {
         connectionInfo: createEmptyStructureConnectionInfo()
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.turret]: {
         fireCooldownTicks: 0
      },
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.ammoBox]: {},
      [ServerComponentType.inventory]: {
         inventories: [
            {
               inventoryName: InventoryName.ammoBoxInventory,
               width: 3,
               height: 1,
               options: { acceptsPickedUpItems: false, isDroppedOnDeath: true },
               items: []
            }
         ]
      }
   };
}

const getAmmoType = (turret: EntityID): BallistaAmmoType | null => {
   const inventoryComponent = InventoryComponentArray.getComponent(turret);
   const ammoBoxInventory = getInventory(inventoryComponent, InventoryName.ammoBoxInventory);

   const firstOccupiedSlot = getFirstOccupiedItemSlotInInventory(ammoBoxInventory);
   if (firstOccupiedSlot === 0) {
      return null;
   }

   const item = ammoBoxInventory.itemSlots[firstOccupiedSlot]!;
   if (!BALLISTA_AMMO_TYPES.includes(item.type as BallistaAmmoType)) {
      console.warn("Item type in ammo box isn't ammo");
      return null;
   }

   return item.type as BallistaAmmoType;
}

const entityIsTargetted = (turret: EntityID, entity: EntityID): boolean => {
   if (Board.getEntityType(entity) === EntityType.itemEntity) {
      return false;
   }

   if (getEntityRelationship(turret, entity) <= EntityRelationship.friendlyBuilding) {
      return false;
   }

   const entityTransformComponent = TransformComponentArray.getComponent(entity);
   
   // Make sure the entity is within the vision range
   let hasHitboxInRange = false;
   for (let i = 0; i < entityTransformComponent.hitboxes.length; i++) {
      const hitbox = entityTransformComponent.hitboxes[i];
      if (Board.hitboxIsInRange(entityTransformComponent.position, hitbox, VISION_RANGE)) {
         hasHitboxInRange = true;
         break;
      }
   }
   if (!hasHitboxInRange) {
      return false;
   }

   const turretTransformComponent = TransformComponentArray.getComponent(turret);

   const minAngle = turretTransformComponent.rotation - AIM_ARC_SIZE / 2;
   const maxAngle = turretTransformComponent.rotation + AIM_ARC_SIZE / 2;

   // Make sure at least 1 of the entities' hitboxes is within the arc
   for (let i = 0; i < entityTransformComponent.hitboxes.length; i++) {
      let minAngleToHitbox: number;
      let maxAngleToHitbox: number;
      
      const hitbox = entityTransformComponent.hitboxes[i];
      if (hitboxIsCircular(hitbox)) {
         // Circular hitbox
         minAngleToHitbox = getMinAngleToCircularHitbox(turretTransformComponent.position.x, turretTransformComponent.position.y, hitbox);
         maxAngleToHitbox = getMaxAngleToCircularHitbox(turretTransformComponent.position.x, turretTransformComponent.position.y, hitbox);
      } else {
         // Rectangular hitbox
         minAngleToHitbox = getMinAngleToRectangularHitbox(turretTransformComponent.position.x, turretTransformComponent.position.y, hitbox);
         maxAngleToHitbox = getMaxAngleToRectangularHitbox(turretTransformComponent.position.x, turretTransformComponent.position.y, hitbox);
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

const createProjectile = (transformComponent: TransformComponent, fireDirection: number, ammoType: BallistaAmmoType): void => {
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

const fire = (ballista: EntityID, ammoType: BallistaAmmoType): void => {
   const transformComponent = TransformComponentArray.getComponent(ballista);
   const turretComponent = TurretComponentArray.getComponent(ballista);

   const ammoInfo = AMMO_INFO_RECORD[ammoType];

   const projectileCount = ammoType === ItemType.frostcicle ? 2 : 1;
   for (let i = 0; i < ammoInfo.ammoMultiplier; i++) {
      let fireDirection = turretComponent.aimDirection + transformComponent.rotation;
      fireDirection += projectileCount > 1 ? (i / (ammoInfo.ammoMultiplier - 1) - 0.5) * Math.PI * 0.5 : 0;

      createProjectile(transformComponent, fireDirection, ammoType);
   }

   // Consume ammo
   const ballistaComponent = AmmoBoxComponentArray.getComponent(ballista);
   ballistaComponent.ammoRemaining--;

   if (ballistaComponent.ammoRemaining === 0) {
      attemptAmmoLoad(ballista);
   }
}

export function tickBallista(ballista: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(ballista);
   const turretComponent = TurretComponentArray.getComponent(ballista);
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(ballista);

   // Attempt to load ammo if there is none loaded
   // @Speed: ideally shouldn't be done every tick, just when the inventory is changed (ammo is added to the inventory)
   if (ammoBoxComponent.ammoRemaining === 0) {
      attemptAmmoLoad(ballista);
   }

   if (aiHelperComponent.visibleEntities.length > 0 && ammoBoxComponent.ammoRemaining > 0) {
      const target = getTarget(ballista, aiHelperComponent.visibleEntities);
      if (target !== null) {
         // If the ballista has just acquired a target, reset the shot cooldown
         if (!turretComponent.hasTarget) {
            const ammoInfo = AMMO_INFO_RECORD[ammoBoxComponent.ammoType];
            turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
         }
         turretComponent.hasTarget = true;

         const transformComponent = TransformComponentArray.getComponent(ballista);
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
               fire(ballista, ammoBoxComponent.ammoType);
   
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