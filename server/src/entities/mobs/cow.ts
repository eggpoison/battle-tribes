import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { getEntityHealth, healEntity } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, runHerdAI, stopEntity } from "../../ai-shared";
import { getWanderTargetTile, shouldWander, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { chooseEscapeEntity, registerAttackingEntity, runFromAttackingEntity } from "../../ai/escape-ai";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "../../components/EscapeAIComponent";
import Board from "../../Board";
import { AIHelperComponentArray } from "../../components/AIHelperComponent";
import { FollowAIComponent, FollowAIComponentArray, continueFollowingEntity, entityWantsToFollow, startFollowingEntity, updateFollowAIComponent } from "../../components/FollowAIComponent";
import { CowComponent, CowComponentArray, eatBerry, updateCowComponent, wantsToEatBerries } from "../../components/CowComponent";
import { dropBerry } from "../resources/berry-bush";
import { PhysicsComponentArray } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { ItemComponentArray } from "../../components/ItemComponent";
import { GrassBlockerCircle } from "webgl-test-shared/dist/grass-blockers";
import { addGrassBlocker } from "../../grass-blockers";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../../components/TransformComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { getInventory, InventoryComponentArray } from "../../components/InventoryComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.wanderAI
   | ServerComponentType.escapeAI
   | ServerComponentType.followAI
   | ServerComponentType.cow;

const MAX_HEALTH = 10;
const VISION_RANGE = 256;

const MIN_GRAZE_COOLDOWN = 30 * Settings.TPS;
const MAX_GRAZE_COOLDOWN = 60 * Settings.TPS;

const MIN_FOLLOW_COOLDOWN = 15 * Settings.TPS;
const MAX_FOLLOW_COOLDOWN = 30 * Settings.TPS;
const FOLLOW_CHANCE_PER_SECOND = 0.2;

export const COW_GRAZE_TIME_TICKS = 5 * Settings.TPS;

// Herd AI constants
const TURN_RATE = 0.4;
const MIN_SEPARATION_DISTANCE = 150;
const SEPARATION_INFLUENCE = 0.7;
const ALIGNMENT_INFLUENCE = 0.5;
const COHESION_INFLUENCE = 0.3;

const TURN_SPEED = Math.PI;

export function createCowConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.cow,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new RectangularHitbox(1.2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 50, 100, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: MAX_HEALTH
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.aiHelper]: {
         visionRange: VISION_RANGE
      },
      [ServerComponentType.wanderAI]: {},
      [ServerComponentType.escapeAI]: {},
      [ServerComponentType.followAI]: {
         followCooldownTicks: randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN),
         followChancePerSecond: FOLLOW_CHANCE_PER_SECOND,
         followDistance: 60
      },
      [ServerComponentType.cow]: {
         species: randInt(0, 1),
         grazeCooldownTicks: randInt(MIN_GRAZE_COOLDOWN, MAX_GRAZE_COOLDOWN)
      }
   };
}

const graze = (cow: EntityID, cowComponent: CowComponent): void => {
   const physicsComponent = PhysicsComponentArray.getComponent(cow);
   stopEntity(physicsComponent);
   
   if (++cowComponent.grazeProgressTicks >= COW_GRAZE_TIME_TICKS) {
      const transformComponent = TransformComponentArray.getComponent(cow);
      
      // 
      // Eat grass
      // 

      for (let i = 0; i < 7; i++) {
         const blockAmount = randFloat(0.6, 0.9);
         
         const grassBlocker: GrassBlockerCircle = {
            radius: randFloat(10, 20),
            position: transformComponent.position.offset(randFloat(0, 55), 2 * Math.PI * Math.random()),
            blockAmount: blockAmount,
            maxBlockAmount: blockAmount
         };
         addGrassBlocker(grassBlocker, 0);
      }

      healEntity(cow, 3, cow);
      cowComponent.grazeCooldownTicks = randInt(MIN_GRAZE_COOLDOWN, MAX_GRAZE_COOLDOWN);
   }
}

const findHerdMembers = (cowComponent: CowComponent, visibleEntities: ReadonlyArray<EntityID>): ReadonlyArray<EntityID> => {
   const herdMembers = new Array<EntityID>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (Board.getEntityType(entity) === EntityType.cow) {
         const otherCowComponent = CowComponentArray.getComponent(entity);
         if (otherCowComponent.species === cowComponent.species) {
            herdMembers.push(entity);
         }
      }
   }
   return herdMembers;
}

const chaseAndEatBerry = (cow: EntityID, cowComponent: CowComponent, berryItemEntity: EntityID, acceleration: number): boolean => {
   if (entitiesAreColliding(cow, berryItemEntity) !== CollisionVars.NO_COLLISION) {
      eatBerry(berryItemEntity, cowComponent);
      return true;
   }

   const berryTransformComponent = TransformComponentArray.getComponent(berryItemEntity);
   moveEntityToPosition(cow, berryTransformComponent.position.x, berryTransformComponent.position.y, acceleration, TURN_SPEED);
   
   return false;
}

const entityIsHoldingBerry = (entity: EntityID): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

   for (let i = 0 ; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const useInfo = inventoryUseComponent.inventoryUseInfos[i];
      const inventory = getInventory(inventoryComponent, useInfo.usedInventoryName);
      
      const heldItem = inventory.itemSlots[useInfo.selectedItemSlot];
      if (typeof heldItem !== "undefined" && heldItem.type === ItemType.berry) {
         return true;
      }
   }

   return false;
}

const getFollowTarget = (followAIComponent: FollowAIComponent, visibleEntities: ReadonlyArray<EntityID>): EntityID | null => {
   const wantsToFollow = entityWantsToFollow(followAIComponent);
   
   let currentTargetIsHoldingBerry = false;
   let target: EntityID | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      if (!InventoryUseComponentArray.hasComponent(entity)) {
         continue;
      }

      const isHoldingBerry = entityIsHoldingBerry(entity);
      if (target === null && wantsToFollow && !isHoldingBerry) {
         target = entity;
      } else if (!currentTargetIsHoldingBerry && isHoldingBerry) {
         target = entity;
         currentTargetIsHoldingBerry = true;
      }
   }

   return target;
}

export function tickCow(cow: EntityID): void {
   const cowComponent = CowComponentArray.getComponent(cow);
   updateCowComponent(cow, cowComponent);

   const transformComponent = TransformComponentArray.getComponent(cow);
   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(cow);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntityIDs.length > 0) {
      const escapeEntity = chooseEscapeEntity(cow, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(cow, escapeEntity, 300, TURN_SPEED);
         return;
      }
   }

   // Graze dirt to recover health
   if (cowComponent.grazeCooldownTicks === 0 && transformComponent.tile.type === TileType.grass) {
      graze(cow, cowComponent);
      return;
   } else {
      cowComponent.grazeProgressTicks = 0;
   }

   // Eat berries
   if (wantsToEatBerries(cowComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const itemEntity = aiHelperComponent.visibleEntities[i];
         if (Board.getEntityType(itemEntity) === EntityType.itemEntity) {
            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (itemComponent.itemType === ItemType.berry) {
               const wasEaten = chaseAndEatBerry(cow, cowComponent, itemEntity, 200);
               if (wasEaten) {
                  healEntity(cow, 3, cow);
                  break;
               }
               return;
            }
         }
      }
   }

   // Shake berries off berry bushes
   if (getEntityHealth(cow) < MAX_HEALTH) {
      // Attempt to find a berry bush
      if (!Board.hasEntity(cowComponent.targetBushID)) {
         let target: EntityID | null = null;
         let minDistance = Number.MAX_SAFE_INTEGER;
         for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
            const berryBush = aiHelperComponent.visibleEntities[i];
            if (Board.getEntityType(berryBush) !== EntityType.berryBush) {
               continue;
            }
   
            // Don't shake bushes without berries
            const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
            if (berryBushComponent.numBerries === 0) {
               continue;
            }

            const berryBushTransformComponent = TransformComponentArray.getComponent(berryBush);
            const distance = transformComponent.position.calculateDistanceBetween(berryBushTransformComponent.position);
            if (distance < minDistance) {
               minDistance = distance;
               target = berryBush;
            }
         }
   
         if (target !== null) {
            cowComponent.targetBushID = target;
         }
      }

      if (Board.hasEntity(cowComponent.targetBushID)) {
         const targetTransformComponent = TransformComponentArray.getComponent(cowComponent.targetBushID);

         moveEntityToPosition(cow, targetTransformComponent.position.x, targetTransformComponent.position.y, 200, TURN_SPEED);
   
         // If the target entity is directly in front of the cow, start eatin it
         const testPositionX = transformComponent.position.x + 60 * Math.sin(transformComponent.rotation);
         const testPositionY = transformComponent.position.y + 60 * Math.cos(transformComponent.rotation);
         if (Board.positionIsInBoard(testPositionX, testPositionY)) {
            // @Hack? The only place which uses this weird function
            const testEntities = Board.getEntitiesAtPosition(testPositionX, testPositionY);
            if (testEntities.indexOf(cowComponent.targetBushID) !== -1) {
               cowComponent.bushShakeTimer++;
               if (cowComponent.bushShakeTimer >= 1.5 * Settings.TPS) {
                  dropBerry(cowComponent.targetBushID, 1);
                  cowComponent.bushShakeTimer = 0;
                  cowComponent.targetBushID = 0;
               }
            } else {
               cowComponent.bushShakeTimer = 0;
            }
         } else {
            cowComponent.bushShakeTimer = 0;
         }
   
         return;
      }
   }

   // Follow AI
   const followAIComponent = FollowAIComponentArray.getComponent(cow);
   updateFollowAIComponent(cow, aiHelperComponent.visibleEntities, 7)
   
   if (Board.hasEntity(followAIComponent.followTargetID)) {
      continueFollowingEntity(cow, followAIComponent.followTargetID, 200, TURN_SPEED);
      return;
   } else {
      const followTarget = getFollowTarget(followAIComponent, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         startFollowingEntity(cow, followTarget, 200, TURN_SPEED, randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN));
         return;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(cow);
   
   // Herd AI
   // @Incomplete: Steer the herd away from non-grasslands biomes
   const herdMembers = findHerdMembers(cowComponent, aiHelperComponent.visibleEntities);
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(cow, herdMembers, VISION_RANGE, TURN_RATE, MIN_SEPARATION_DISTANCE, SEPARATION_INFLUENCE, ALIGNMENT_INFLUENCE, COHESION_INFLUENCE);

      physicsComponent.acceleration.x = 200 * Math.sin(transformComponent.rotation);
      physicsComponent.acceleration.y = 200 * Math.cos(transformComponent.rotation);
      return;
   }

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(cow);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(cow, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.6)) {
      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(cow, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.grasslands));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      wander(cow, x, y, 200, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

export function onCowHurt(cow: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onCowDeath(cow: EntityID): void {
   createItemsOverEntity(cow, ItemType.raw_beef, randInt(2, 3), 40);
   createItemsOverEntity(cow, ItemType.leather, randInt(1, 2), 40);
}