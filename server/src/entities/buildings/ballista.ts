import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { AMMO_INFO_RECORD, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { BallistaAmmoType, BALLISTA_AMMO_TYPES, ItemType, InventoryName } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import { AmmoBoxComponentArray, HealthComponentArray, TribeComponentArray, TurretComponentArray } from "../../components/ComponentArray";
import { EntityRelationship, TribeComponent, getEntityRelationship } from "../../components/TribeComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { TurretComponent } from "../../components/TurretComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { AmmoBoxComponent } from "../../components/AmmoBoxComponent";
import { GenericArrowInfo, createWoodenArrow } from "../projectiles/wooden-arrow";
import { InventoryComponent, InventoryComponentArray, consumeItemTypeFromInventory, createNewInventory, getFirstOccupiedItemSlotInInventory, getInventory } from "../../components/InventoryComponent";
import { angleIsInRange, getClockwiseAngleDistance, getMaxAngleToCircularHitbox, getMaxAngleToRectangularHitbox, getMinAngleToCircularHitbox, getMinAngleToRectangularHitbox } from "../../ai-shared";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import Board from "../../Board";

const VISION_RANGE = 550;
const HITBOX_SIZE = 100 - 0.05;
const AIM_ARC_SIZE = Math.PI / 2;

export function createBallistaHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 2, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createBallista(position: Point, rotation: number, tribe: Tribe): Entity {
   const ballista = new Entity(position, rotation, EntityType.ballista, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createBallistaHitboxes(position, ballista.getNextHitboxLocalID(), ballista.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      ballista.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(ballista.id, new HealthComponent(100));
   StatusEffectComponentArray.addComponent(ballista.id, new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding));
   TribeComponentArray.addComponent(ballista.id, new TribeComponent(tribe));
   TurretComponentArray.addComponent(ballista.id, new TurretComponent(0));
   AIHelperComponentArray.addComponent(ballista.id, new AIHelperComponent(VISION_RANGE));
   AmmoBoxComponentArray.addComponent(ballista.id, new AmmoBoxComponent());

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(ballista.id, inventoryComponent);
   createNewInventory(inventoryComponent, InventoryName.ammoBoxInventory, 3, 1, { acceptsPickedUpItems: false, isDroppedOnDeath: true });

   return ballista;
}

const getAmmoType = (turret: Entity): BallistaAmmoType | null => {
   const inventoryComponent = InventoryComponentArray.getComponent(turret.id);
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

const entityIsTargetted = (turret: Entity, entity: Entity): boolean => {
   if (entity.type === EntityType.itemEntity) {
      return false;
   }

   if (getEntityRelationship(turret.id, entity) <= EntityRelationship.friendlyBuilding) {
      return false;
   }

   // Make sure the entity is within the vision range
   let hasHitboxInRange = false;
   for (let i = 0; i < entity.hitboxes.length; i++) {
      const hitbox = entity.hitboxes[i];
      if (Board.hitboxIsInRange(turret.position, hitbox, VISION_RANGE)) {
         hasHitboxInRange = true;
         break;
      }
   }
   if (!hasHitboxInRange) {
      return false;
   }

   const minAngle = turret.rotation - AIM_ARC_SIZE / 2;
   const maxAngle = turret.rotation + AIM_ARC_SIZE / 2;

   // Make sure at least 1 of the entities' hitboxes is within the arc
   for (let i = 0; i < entity.hitboxes.length; i++) {
      let minAngleToHitbox: number;
      let maxAngleToHitbox: number;
      
      const hitbox = entity.hitboxes[i];
      if (hitbox.hasOwnProperty("radius")) {
         // Circular hitbox
         minAngleToHitbox = getMinAngleToCircularHitbox(turret.position.x, turret.position.y, hitbox as CircularHitbox);
         maxAngleToHitbox = getMaxAngleToCircularHitbox(turret.position.x, turret.position.y, hitbox as CircularHitbox);
      } else {
         // Rectangular hitbox
         minAngleToHitbox = getMinAngleToRectangularHitbox(turret.position.x, turret.position.y, hitbox as RectangularHitbox);
         maxAngleToHitbox = getMaxAngleToRectangularHitbox(turret.position.x, turret.position.y, hitbox as RectangularHitbox);
      }

      if (angleIsInRange(minAngleToHitbox, minAngle, maxAngle) || angleIsInRange(maxAngleToHitbox, minAngle, maxAngle)) {
         return true;
      }
   }

   return false;
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

const attemptAmmoLoad = (ballista: Entity): void => {
   const ballistaComponent = AmmoBoxComponentArray.getComponent(ballista.id);
   
   const ammoType = getAmmoType(ballista);
   if (ammoType !== null) {
      // Load the ammo
      ballistaComponent.ammoType = ammoType;
      ballistaComponent.ammoRemaining = AMMO_INFO_RECORD[ammoType].ammoMultiplier;

      const inventoryComponent = InventoryComponentArray.getComponent(ballista.id);
      consumeItemTypeFromInventory(inventoryComponent, InventoryName.ammoBoxInventory, ammoType, 1);
   }
}

const fire = (ballista: Entity, ammoType: BallistaAmmoType): void => {
   const turretComponent = TurretComponentArray.getComponent(ballista.id);

   const ammoInfo = AMMO_INFO_RECORD[ammoType];
   
   const arrowInfo: GenericArrowInfo = {
      type: ammoInfo.type,
      damage: ammoInfo.damage,
      knockback: ammoInfo.knockback,
      hitboxWidth: ammoInfo.hitboxWidth,
      hitboxHeight: ammoInfo.hitboxHeight,
      ignoreFriendlyBuildings: true,
      statusEffect: ammoInfo.statusEffect
   };

   // @Incomplete: Spawn slightly offset from the turret's position
   if (ammoType === ItemType.frostcicle) {
      // Frostcicles shoot twin bolts
      for (let i = 0; i < 2; i++) {
         const fireDirection = turretComponent.aimDirection + ballista.rotation + (i === 0 ? 1 : -1) * 0.02;
         
         const arrowCreationInfo = createWoodenArrow(ballista.position.copy(), fireDirection, ballista.id, arrowInfo);

         // @Cleanup: copy and paste
         const physicsComponent = arrowCreationInfo.components[ServerComponentType.physics];
         physicsComponent.velocity.x = ammoInfo.projectileSpeed * Math.sin(fireDirection);
         physicsComponent.velocity.y = ammoInfo.projectileSpeed * Math.cos(fireDirection);
      }
   } else {
      const fireDirection = turretComponent.aimDirection + ballista.rotation;
      
      const rotation = ammoType === ItemType.rock || ammoType === ItemType.slimeball ? 2 * Math.PI * Math.random() : fireDirection;
      
      const arrowCreationInfo = createWoodenArrow(ballista.position.copy(), rotation, ballista.id, arrowInfo);

      // @Cleanup: copy and paste
      const physicsComponent = arrowCreationInfo.components[ServerComponentType.physics];
      physicsComponent.velocity.x = ammoInfo.projectileSpeed * Math.sin(fireDirection);
      physicsComponent.velocity.y = ammoInfo.projectileSpeed * Math.cos(fireDirection);
   }

   // Consume ammo
   const ballistaComponent = AmmoBoxComponentArray.getComponent(ballista.id);
   ballistaComponent.ammoRemaining--;

   if (ballistaComponent.ammoRemaining === 0) {
      attemptAmmoLoad(ballista);
   }
}

export function tickBallista(ballista: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(ballista.id);
   const turretComponent = TurretComponentArray.getComponent(ballista.id);
   const ballistaComponent = AmmoBoxComponentArray.getComponent(ballista.id);

   // Attempt to load ammo if there is none loaded
   // @Speed: ideally shouldn't be done every tick, just when the inventory is changed (ammo is added to the inventory)
   if (ballistaComponent.ammoRemaining === 0) {
      attemptAmmoLoad(ballista);
   }

   if (aiHelperComponent.visibleEntities.length > 0 && ballistaComponent.ammoRemaining > 0) {
      const target = getTarget(ballista, aiHelperComponent.visibleEntities);
      if (target !== null) {
         // If the ballista has just acquired a target, reset the shot cooldown
         if (!turretComponent.hasTarget) {
            const ammoInfo = AMMO_INFO_RECORD[ballistaComponent.ammoType];
            turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
         }
         turretComponent.hasTarget = true;

         const targetDirection = ballista.position.calculateAngleBetween(target.position);

         const turretAimDirection = turretComponent.aimDirection + ballista.rotation;

         // Turn to face the target
         const clockwiseDist = getClockwiseAngleDistance(turretAimDirection, targetDirection);
         if (clockwiseDist >= Math.PI) {
            // Turn counterclockwise
            turretComponent.aimDirection -= Math.PI / 3 * Settings.I_TPS;
            // @Incomplete: Will this sometimes cause snapping?
            if (turretComponent.aimDirection + ballista.rotation < targetDirection) {
               turretComponent.aimDirection = targetDirection - ballista.rotation;
            }
         } else {
            // Turn clockwise
            turretComponent.aimDirection += Math.PI / 3 * Settings.I_TPS;
            if (turretComponent.aimDirection + ballista.rotation > targetDirection) {
               turretComponent.aimDirection = targetDirection - ballista.rotation;
            }
         }
         if (turretComponent.fireCooldownTicks > 0) {
            turretComponent.fireCooldownTicks--;
         } else {
            let angleDiff = targetDirection - (turretComponent.aimDirection + ballista.rotation);
            while (angleDiff >= Math.PI) {
               angleDiff -= 2 * Math.PI;
            }
            if (Math.abs(angleDiff) < 0.01) {
               fire(ballista, ballistaComponent.ammoType);
   
               // Reset firing cooldown
               const ammoInfo = AMMO_INFO_RECORD[ballistaComponent.ammoType];
               turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks + ammoInfo.reloadTimeTicks;
            }
         }
         return;
      }
   }

   turretComponent.hasTarget = false;
   if (ballistaComponent.ammoType === null) {
      turretComponent.fireCooldownTicks = 0;
   } else {
      const ammoInfo = AMMO_INFO_RECORD[ballistaComponent.ammoType];
      if (turretComponent.fireCooldownTicks <= ammoInfo.shotCooldownTicks) {
         turretComponent.fireCooldownTicks = ammoInfo.shotCooldownTicks;
      } else {
         // Continue reloading even when there are no targets
         turretComponent.fireCooldownTicks--;
      }
   }
}