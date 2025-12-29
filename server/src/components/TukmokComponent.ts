import { HitboxFlag } from "../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { EntityTickEvent, EntityTickEventType } from "../../../shared/src/entity-events";
import { ItemType } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { customTickIntervalHasPassed, getAbsAngleDiff, Point, polarVec2, randAngle, randInt, secondsToTicks } from "../../../shared/src/utils";
import { getDistanceFromPointToHitbox, willStopAtDesiredDistance } from "../ai-shared";
import { entitiesAreColliding, CollisionVars } from "../collision-detection";
import { createEntityConfigAttachInfo } from "../components";
import { createItemEntityConfig } from "../entities/item-entity";
import { applyAcceleration, applyForce, Hitbox } from "../hitboxes";
import { createItem } from "../items";
import { registerEntityTickEvent } from "../server/player-clients";
import { createEntity, destroyEntity, entityExists, getEntityAgeTicks, getEntityLayer, getEntityType } from "../world";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { AttackingEntitiesComponentArray } from "./AttackingEntitiesComponent";
import { ComponentArray } from "./ComponentArray";
import { addHungerEnergy, getEntityFullness } from "./EnergyStomachComponent";
import { hitEntityWithoutDamage } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { getAvailableCarrySlot, mountCarrySlot, RideableComponentArray } from "./RideableComponent";
import { getRiderTargetPosition, TamingComponentArray } from "./TamingComponent";
import { attachHitbox, detachHitbox, TransformComponent, TransformComponentArray } from "./TransformComponent";
import { TribeComponentArray } from "./TribeComponent";

const enum TrunkCombatState {
   active,
   passive
}

export class TukmokComponent {
   public treeTarget: Entity = 0;
   public currentGrabElapsedTicks = 0;
   public currentGrabDurationTicks = 0;

   public grazeCooldownTicks = 0;
   public isInGrazingMood = false;

   public target: Entity = 0;

   public trunkStateTicksElapsed = 0;
   public trunkState = TrunkCombatState.passive;

   public ticksToNextAngrySound = randInt(MIN_ANGRY_SOUND_COOLDOWN_TICKS, MAX_ANGRY_SOUND_COOLDOWN_TICKS);

   public tailFailStrength = 0;
}

const IDEAL_DIST_FROM_TREE = 120;

const MIN_TICKS_TO_GRAB_LEAF = secondsToTicks(0.5);
const MAX_TICKS_TO_GRAB_LEAF = secondsToTicks(0.85);

const GRAZE_COOLDOWN_TICKS = secondsToTicks(20);

const TRUNK_ACTIVE_STATE_DURATION = secondsToTicks(0.8);
const TRUNK_PASSIVE_STATE_DURATION = secondsToTicks(1);

const MIN_ANGRY_SOUND_COOLDOWN_TICKS = secondsToTicks(3);
const MAX_ANGRY_SOUND_COOLDOWN_TICKS = secondsToTicks(5.5);

const TAIL_FLAIL_STRENGTH_LOSS_PER_SECOND = 0.2;

export const TukmokComponentArray = new ComponentArray<TukmokComponent>(ServerComponentType.tukmok, true, getDataLength, addDataToPacket);
TukmokComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};

const getTrunk = (transformComponent: TransformComponent): Entity | null => {
   for (const hitbox of transformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.tukmokTrunk) {
            return childHitbox.entity;
         }
      }
   }

   return null;
}

const getTrunkBaseHitbox = (trunk: Entity): Hitbox => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   return trunkTransformComponent.hitboxes[0];
}

const getTrunkHeadHitbox = (trunk: Entity): Hitbox => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   return trunkTransformComponent.hitboxes[trunkTransformComponent.hitboxes.length - 1];
}

const getTrunkLeaf = (trunk: Entity): Hitbox | null => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   for (const hitbox of trunkTransformComponent.hitboxes) {
      for (const childHitbox of hitbox.children) {
         if (getEntityType(childHitbox.entity) === EntityType.itemEntity) {
            return childHitbox;
         }
      }
   }

   return null;
}

const moveTrunk = (trunk: Entity, targetPos: Point, accelerationMagnitude: number, onlyMoveHead: boolean): void => {
   const trunkTransformComponent = TransformComponentArray.getComponent(trunk);
   for (let i = 0; i < trunkTransformComponent.hitboxes.length; i++) {
      const hitbox = trunkTransformComponent.hitboxes[i];

      const isHead = i === trunkTransformComponent.hitboxes.length - 1;
      if (!onlyMoveHead || isHead) {
         const mag = accelerationMagnitude * (isHead ? 1 : 0.4);
         const acc = polarVec2(mag, hitbox.box.position.angleTo(targetPos));
         applyAcceleration(hitbox, acc);
      }
   }
}

const getTargetTree = (tukmok: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const hitbox = transformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestTree: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.tree && getEntityType(entity) !== EntityType.spruceTree) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = hitbox.box.position.distanceTo(entityHitbox.box.position);
      if (dist < minDist) {
         closestTree = entity;
         minDist = dist;
      }
   }

   return closestTree;
}

const getTargetLeafItem = (tukmok: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const hitbox = transformComponent.hitboxes[0];
   
   let minDist = Number.MAX_SAFE_INTEGER;
   let closestLeafItem: Entity | null = null;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (getEntityType(entity) !== EntityType.itemEntity) {
         continue;
      }

      const itemComponent = ItemComponentArray.getComponent(entity);
      if (itemComponent.item.type !== ItemType.leaf) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const entityHitbox = entityTransformComponent.hitboxes[0];

      const dist = hitbox.box.position.distanceTo(entityHitbox.box.position);
      if (dist < minDist) {
         closestLeafItem = entity;
         minDist = dist;
      }
   }

   return closestLeafItem;
}

const treeIsValidTarget = (tree: Entity, aiHelperComponent: AIHelperComponent): boolean => {
   return entityExists(tree) && aiHelperComponent.visibleEntities.includes(tree);
}

const getTailClub = (transformComponent: TransformComponent): Entity | null => {
   for (const hitbox of transformComponent.hitboxes) {
      for (const tether of hitbox.tethers) {
         const otherHitbox = tether.getOtherHitbox(hitbox);
         if (getEntityType(otherHitbox.entity) === EntityType.tukmokTailClub) {
            return otherHitbox.entity;
         }
      }
   }

   return null;
}

const getTailBaseHitbox = (tukmok: Entity): Hitbox => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   for (const hitbox of transformComponent.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_BIG)) {
         return hitbox;
      }
   }
   throw new Error();
}

const tailHasTargetInRange = (tukmok: Entity, aiHelperComponent: AIHelperComponent): boolean => {
   const tailBaseHitbox = getTailBaseHitbox(tukmok);

   const MIN_DIST = 200;

   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isValidCombatTarget(tukmok, entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.hitboxes[0];
      const dist = tailBaseHitbox.box.position.distanceTo(targetHitbox.box.position);
      if (dist < MIN_DIST) {
         return true;
      }
   }

   return false;
}

const isValidCombatTarget = (tukmok: Entity, entity: Entity): boolean => {
   if (!entityExists(entity)) {
      return false;
   }
   
   const attackingEntitiesComponent = AttackingEntitiesComponentArray.getComponent(tukmok);
   if (attackingEntitiesComponent.attackingEntities.has(entity)) {
      return true;
   }

   // @HACK @SPEED
   if (TribeComponentArray.hasComponent(entity)) {
      const entityTribeComponent = TribeComponentArray.getComponent(entity);
      const entityTribe = entityTribeComponent.tribe;

      for (const pair of attackingEntitiesComponent.attackingEntities) {
         const currentEntity = pair[0];
         if (TribeComponentArray.hasComponent(currentEntity)) {
            const currentEntityTribeComponent = TribeComponentArray.getComponent(currentEntity);
            const currentEntityTribe = currentEntityTribeComponent.tribe;
            if (currentEntityTribe === entityTribe) {
               return true;
            }
         }
      }
   }

   return false;
}

const getTarget = (tukmok: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const hitbox = transformComponent.hitboxes[0];
   
   let target: Entity | null = null;
   let minDist = Number.MAX_SAFE_INTEGER;
   for (const entity of aiHelperComponent.visibleEntities) {
      if (!isValidCombatTarget(tukmok, entity)) {
         continue;
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);
      const targetHitbox = entityTransformComponent.hitboxes[0];
      const dist = hitbox.box.position.distanceTo(targetHitbox.box.position);
      if (dist < minDist) {
         minDist = dist;
         target = entity;
      }
   }

   return target;
}

const attackEntity = (tukmok: Entity, target: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const tukmokComponent = TukmokComponentArray.getComponent(tukmok);
   const aiHelperComponent = AIHelperComponentArray.getComponent(tukmok);
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];

   // @SQUEAM
   // aiHelperComponent.moveFunc(tukmok, targetHitbox.box.position, 380);
   aiHelperComponent.moveFunc(tukmok, targetHitbox.box.position, 260);
   aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 1);

   if (tukmokComponent.ticksToNextAngrySound === 0) {
      const tickEvent: EntityTickEvent = {
         entityID: tukmok,
         type: EntityTickEventType.tukmokAngry,
         data: 0
      };
      registerEntityTickEvent(tukmok, tickEvent);

      tukmokComponent.ticksToNextAngrySound = randInt(MIN_ANGRY_SOUND_COOLDOWN_TICKS, MAX_ANGRY_SOUND_COOLDOWN_TICKS);
   } else {
      tukmokComponent.ticksToNextAngrySound--;
   }

   const trunk = getTrunk(transformComponent);
   if (trunk !== null) {
      const tukmokHeadHitbox = transformComponent.hitboxes[1];

      // This may be a mistake, but try to keep the trunk in its natural position even while moving
      const idealPos = tukmokHeadHitbox.box.position.offset(40, tukmokHeadHitbox.box.angle);
      moveTrunk(trunk, idealPos, 500, false);

      // Trunk behaviour
      tukmokComponent.trunkStateTicksElapsed++;
      switch (tukmokComponent.trunkState) {
         case TrunkCombatState.active: {
            moveTrunk(trunk, targetHitbox.box.position, 2400, true);
            
            if (tukmokComponent.trunkStateTicksElapsed >= TRUNK_ACTIVE_STATE_DURATION) {
               tukmokComponent.trunkStateTicksElapsed = 0;
               tukmokComponent.trunkState = TrunkCombatState.passive;
            }
            break;
         }
         case TrunkCombatState.passive: {
            if (tukmokComponent.trunkStateTicksElapsed >= TRUNK_PASSIVE_STATE_DURATION) {
               tukmokComponent.trunkStateTicksElapsed = 0;
               tukmokComponent.trunkState = TrunkCombatState.active;
            }
            break;
         }
      }
   }

   // Tail flail
   const tailClub = getTailClub(transformComponent);
   if (tailClub !== null && tailHasTargetInRange(tukmok, aiHelperComponent)) {
      // Build up strength
      tukmokComponent.tailFailStrength += 0.4 * Settings.DT_S;
      // Counteract the detraction done every tick
      tukmokComponent.tailFailStrength += TAIL_FLAIL_STRENGTH_LOSS_PER_SECOND * Settings.DT_S;
      if (tukmokComponent.tailFailStrength > 1) {
         tukmokComponent.tailFailStrength = 1;
      }
      
      const flailForce = 420 * tukmokComponent.tailFailStrength;
      
      const tailClubTransformComponent = TransformComponentArray.getComponent(tailClub);
      const tailBaseHitbox = getTailBaseHitbox(tukmok);
      const tailClubHitbox = tailClubTransformComponent.hitboxes[0];

      // Flail to target
      const flailDirection = tailBaseHitbox.box.position.angleTo(tailClubHitbox.box.position) + Math.PI * 0.5;
      const forceAmount = flailForce * 0.5 * Math.sin(getEntityAgeTicks(tukmok) * Settings.DT_S * 4);
      applyForce(tailClubHitbox, polarVec2(forceAmount, flailDirection));

      for (const hitbox of transformComponent.hitboxes) {
         if (hitbox === tailBaseHitbox) {
            continue;
         }
         
         if (hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_BIG) || hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM) || hitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL)) {
            const flailDirection = tailBaseHitbox.box.position.angleTo(hitbox.box.position) + Math.PI * 0.5;
            const forceAmount = flailForce * 0.27 * Math.sin(getEntityAgeTicks(tukmok) * Settings.DT_S * 4);
            applyForce(hitbox, polarVec2(forceAmount, flailDirection));
         }
      }
   }
}

function onTick(tukmok: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(tukmok);
   const aiHelperComponent = AIHelperComponentArray.getComponent(tukmok);
   
   const tukmokComponent = TukmokComponentArray.getComponent(tukmok);

   if (tukmokComponent.grazeCooldownTicks > 0) {
      tukmokComponent.grazeCooldownTicks--;
   }

   tukmokComponent.tailFailStrength -= TAIL_FLAIL_STRENGTH_LOSS_PER_SECOND * Settings.DT_S;
   if (tukmokComponent.tailFailStrength < 0) {
      tukmokComponent.tailFailStrength = 0;
   }

   const tamingComponent = TamingComponentArray.getComponent(tukmok);
   
   // @COPYNPASTE from cow
   // - Copying the carried entities' acceleration is actually inaccurate in some cases if the carried
   //   entity isn't exactly on the thing being accelerated.
   // When something is riding the cow, that entity controls the cow's movement
   const rideableComponent = RideableComponentArray.getComponent(tukmok);
   const rider = rideableComponent.carrySlots[0].occupiedEntity;
   if (entityExists(rider)) {
      const targetPosition = getRiderTargetPosition(rider);
      if (targetPosition !== null) {
         aiHelperComponent.moveFunc(tukmok, targetPosition, 380);
         aiHelperComponent.turnFunc(tukmok, targetPosition, Math.PI, 1);
         return;
      }
   }
   
   // @Hack @Copynpaste
   // @SCREE WELL AKSHALLY we do something special with the trunk here
   // Pick up carry target
   if (entityExists(tamingComponent.carryTarget)) {
      const carrySlot = getAvailableCarrySlot(rideableComponent);
      if (carrySlot !== null) {
         const targetTransformComponent = TransformComponentArray.getComponent(tamingComponent.carryTarget);
         const targetHitbox = targetTransformComponent.hitboxes[0];
         
         aiHelperComponent.moveFunc(tukmok, targetHitbox.box.position, 380);
         aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, Math.PI, 1);

         const trunk = getTrunk(transformComponent);
         if (trunk !== null) {
            moveTrunk(trunk, targetHitbox.box.position, 350, false);
            
            // Force carry if trunk is colliding
            if (entitiesAreColliding(trunk, tamingComponent.carryTarget) !== CollisionVars.NO_COLLISION) {
               mountCarrySlot(tamingComponent.carryTarget, carrySlot);
               tamingComponent.carryTarget = 0;
            }
         }

         return;
      }
   }

   if (entityExists(tamingComponent.attackTarget)) {
      attackEntity(tukmok, tamingComponent.attackTarget);
      return;
   }

   // Look for targets
   if (!isValidCombatTarget(tukmok, tukmokComponent.target)) {
      const target = getTarget(tukmok, aiHelperComponent);
      if (target !== null) {
         tukmokComponent.target = target;
      }
   }
   const target = tukmokComponent.target;
   if (isValidCombatTarget(tukmok, tukmokComponent.target)) {
      attackEntity(tukmok, target);
      return;
   }
   
   const trunk = getTrunk(transformComponent);
   if (trunk !== null) {
      // Grab leaves from trees if hungry
      if ((getEntityFullness(tukmok) < 0.9 || tukmokComponent.isInGrazingMood) && tukmokComponent.grazeCooldownTicks === 0) {
         tukmokComponent.isInGrazingMood = true;
         
         const tukmokBodyHitbox = transformComponent.hitboxes[0];
         const tukmokHeadHitbox = transformComponent.hitboxes[1];

         const trunkHeadHitbox = getTrunkHeadHitbox(trunk);
         const trunkLeafHitbox = getTrunkLeaf(trunk);
         if (trunkLeafHitbox !== null) {
            const baseHitbox = getTrunkBaseHitbox(trunk);

            const mouthPosition = baseHitbox.box.position.offset(20, tukmokHeadHitbox.box.angle + Math.PI);
            moveTrunk(trunk, mouthPosition, 350, true);

            const collisionResult = trunkHeadHitbox.box.getCollisionResult(tukmokHeadHitbox.box);
            if (collisionResult.isColliding) {
               const leaf = trunkLeafHitbox.entity;
               destroyEntity(leaf);
            
               const tickEvent: EntityTickEvent = {
                  entityID: leaf,
                  type: EntityTickEventType.cowEat,
                  data: 0
               };
               registerEntityTickEvent(leaf, tickEvent);

               addHungerEnergy(tukmok, 30);

               if (getEntityFullness(tukmok) >= 0.95) {
                  tukmokComponent.grazeCooldownTicks = GRAZE_COOLDOWN_TICKS;
                  tukmokComponent.isInGrazingMood = false;
               }
            }
         } else {
            const targetItemEntity = getTargetLeafItem(tukmok, aiHelperComponent);
            if (targetItemEntity !== null) {
               const targetTransformComponent = TransformComponentArray.getComponent(targetItemEntity);
               const targetHitbox = targetTransformComponent.hitboxes[0];
               
               aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 1);

               moveTrunk(trunk, targetHitbox.box.position, 550, false);

               const collisionResult = trunkHeadHitbox.box.getCollisionResult(targetHitbox.box);
               if (collisionResult.isColliding) {
                  // Grab leaf
                  attachHitbox(targetHitbox, trunkHeadHitbox, false);
               }
               return;
            }

            // 
            // Look for tree to grab leaf from
            // 
            
            // @SQUEAM
            // if (!treeIsValidTarget(tukmokComponent.treeTarget, aiHelperComponent)) {
            //    const target = getTargetTree(tukmok, aiHelperComponent);
            //    if (target !== null) {
            //       tukmokComponent.treeTarget = target;
            //    }
            // }

            const treeTarget = tukmokComponent.treeTarget;
            if (treeIsValidTarget(treeTarget, aiHelperComponent)) {
               const targetTransformComponent = TransformComponentArray.getComponent(treeTarget);
               const targetHitbox = targetTransformComponent.hitboxes[0];
            
               const dist = getDistanceFromPointToHitbox(targetHitbox.box.position, tukmokHeadHitbox);
               if (willStopAtDesiredDistance(tukmokHeadHitbox, IDEAL_DIST_FROM_TREE, dist)) {

                  // Too close, move back a bit
                  if (willStopAtDesiredDistance(tukmokHeadHitbox, IDEAL_DIST_FROM_TREE - 8, dist)) {
                     const awayFromTarget = targetHitbox.box.position.angleTo(tukmokBodyHitbox.box.position);
                     const awayPos = tukmokBodyHitbox.box.position.offset(999, awayFromTarget);
                     aiHelperComponent.moveFunc(tukmok, awayPos, 240);
                  }

                  aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 1);

                  if (trunkHeadHitbox.parent !== targetHitbox) {
                     moveTrunk(trunk, targetHitbox.box.position, 550, false);
                     
                     const trunkHeadToTree = trunkHeadHitbox.box.position.angleTo(targetHitbox.box.position);
                     // First attach to the tree
                     if (getAbsAngleDiff(trunkHeadHitbox.box.angle, trunkHeadToTree) < Math.PI * 0.5 && trunkHeadHitbox.box.getCollisionResult(targetHitbox.box).isColliding) {
                        attachHitbox(trunkHeadHitbox, targetHitbox, false);

                        tukmokComponent.currentGrabElapsedTicks = 0;
                        tukmokComponent.currentGrabDurationTicks = randInt(MIN_TICKS_TO_GRAB_LEAF, MAX_TICKS_TO_GRAB_LEAF);
                     }
                  } else {
                     tukmokComponent.currentGrabElapsedTicks++;
                     if (customTickIntervalHasPassed(tukmokComponent.currentGrabElapsedTicks, 0.2)) {
                        hitEntityWithoutDamage(treeTarget, targetHitbox, tukmok, targetHitbox.box.position.copy());
                     }

                     if (tukmokComponent.currentGrabElapsedTicks >= tukmokComponent.currentGrabDurationTicks) {
                        // Grab leaf and detach

                        const leafPosition = trunkHeadHitbox.box.position.offset(20, trunkHeadHitbox.box.angle);

                        const leafItemConfig = createItemEntityConfig(leafPosition, randAngle(), createItem(ItemType.leaf, 1, "", ""), null);
                        const leafHitbox = leafItemConfig.components[ServerComponentType.transform]!.hitboxes[0];
                        leafItemConfig.attachInfo = createEntityConfigAttachInfo(leafHitbox, trunkHeadHitbox, false);
                        createEntity(leafItemConfig, getEntityLayer(tukmok), 0);

                        detachHitbox(trunkHeadHitbox);
                     }
                  }
               } else {
                  // Not close enough to grab, move closer

                  aiHelperComponent.moveFunc(tukmok, targetHitbox.box.position, 200);
                  aiHelperComponent.turnFunc(tukmok, targetHitbox.box.position, 1 * Math.PI, 1);
               }

               return;
            }
         }
      }
   }

   // Wander AI
   // @SQUEAM
   if (1+1===1) {
      const wanderAI = aiHelperComponent.getWanderAI();
      wanderAI.update(tukmok);
      if (wanderAI.targetPosition !== null) {
         aiHelperComponent.moveFunc(tukmok, wanderAI.targetPosition, wanderAI.acceleration);
         aiHelperComponent.turnFunc(tukmok, wanderAI.targetPosition, wanderAI.turnSpeed, wanderAI.turnDamping);
      }
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}