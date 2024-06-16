import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { CowSpecies, EntityType } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, getEntityHealth, healEntity } from "../../components/HealthComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { WanderAIComponent, WanderAIComponentArray } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, runHerdAI, stopEntity } from "../../ai-shared";
import { getWanderTargetTile, shouldWander, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { chooseEscapeEntity, registerAttackingEntity, runFromAttackingEntity } from "../../ai/escape-ai";
import { EscapeAIComponent, EscapeAIComponentArray, updateEscapeAIComponent } from "../../components/EscapeAIComponent";
import Board from "../../Board";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { FollowAIComponent, FollowAIComponentArray, continueFollowingEntity, entityWantsToFollow, startFollowingEntity, updateFollowAIComponent } from "../../components/FollowAIComponent";
import { CowComponent, CowComponentArray, eatBerry, updateCowComponent, wantsToEatBerries } from "../../components/CowComponent";
import { dropBerry } from "../resources/berry-bush";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { ItemComponentArray } from "../../components/ItemComponent";
import { GrassBlockerCircle } from "webgl-test-shared/dist/grass-blockers";
import { addGrassBlocker } from "../../grass-blockers";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

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

export function createCow(position: Point, rotation: number): Entity {
   const species: CowSpecies = randInt(0, 1);
   
   const cow = new Entity(position, rotation, EntityType.cow, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new RectangularHitbox(1.2, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, cow.getNextHitboxLocalID(), 0, 50, 100, 0);
   cow.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(cow.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(cow.id, new HealthComponent(MAX_HEALTH));
   StatusEffectComponentArray.addComponent(cow.id, new StatusEffectComponent(0));
   AIHelperComponentArray.addComponent(cow.id, new AIHelperComponent(VISION_RANGE));
   WanderAIComponentArray.addComponent(cow.id, new WanderAIComponent());
   EscapeAIComponentArray.addComponent(cow.id, new EscapeAIComponent());
   FollowAIComponentArray.addComponent(cow.id, new FollowAIComponent(randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN), FOLLOW_CHANCE_PER_SECOND, 60));
   CowComponentArray.addComponent(cow.id, new CowComponent(species, randInt(MIN_GRAZE_COOLDOWN, MAX_GRAZE_COOLDOWN)));

   return cow;
}

const graze = (cow: Entity, cowComponent: CowComponent): void => {
   const physicsComponent = PhysicsComponentArray.getComponent(cow.id);
   stopEntity(physicsComponent);
   
   if (++cowComponent.grazeProgressTicks >= COW_GRAZE_TIME_TICKS) {
      // 
      // Eat grass
      // 

      for (let i = 0; i < 7; i++) {
         const blockAmount = randFloat(0.6, 0.9);
         
         const grassBlocker: GrassBlockerCircle = {
            radius: randFloat(10, 20),
            position: cow.position.offset(randFloat(0, 55), 2 * Math.PI * Math.random()),
            blockAmount: blockAmount,
            maxBlockAmount: blockAmount
         };
         addGrassBlocker(grassBlocker, 0);
      }
      // const previousTile = cow.tile;
      // const newTileInfo: TileInfo = {
      //    type: TileType.dirt,
      //    biome: previousTile.biome,
      //    isWall: false
      // };
      // Board.replaceTile(previousTile.x, previousTile.y, newTileInfo.type, newTileInfo.biome, newTileInfo.isWall, 0);

      healEntity(cow, 3, cow.id);
      cowComponent.grazeCooldownTicks = randInt(MIN_GRAZE_COOLDOWN, MAX_GRAZE_COOLDOWN);
   }
}

const findHerdMembers = (cowComponent: CowComponent, visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (entity.type === EntityType.cow) {
         const otherCowComponent = CowComponentArray.getComponent(entity.id);
         if (otherCowComponent.species === cowComponent.species) {
            herdMembers.push(entity);
         }
      }
   }
   return herdMembers;
}

const chaseAndEatBerry = (cow: Entity, cowComponent: CowComponent, berryItemEntity: Entity, acceleration: number): boolean => {
   if (entitiesAreColliding(cow, berryItemEntity) !== CollisionVars.NO_COLLISION) {
      eatBerry(berryItemEntity, cowComponent);
      return true;
   }

   moveEntityToPosition(cow, berryItemEntity.position.x, berryItemEntity.position.y, acceleration, TURN_SPEED);
   
   return false;
}

const entityIsHoldingBerry = (entity: Entity): boolean => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity.id);

   for (let i = 0 ; i < inventoryUseComponent.inventoryUseInfos.length; i++) {
      const useInfo = inventoryUseComponent.inventoryUseInfos[i];
      
      const heldItem = useInfo.inventory.itemSlots[useInfo.selectedItemSlot];
      if (typeof heldItem !== "undefined" && heldItem.type === ItemType.berry) {
         return true;
      }
   }

   return false;
}

const getFollowTarget = (followAIComponent: FollowAIComponent, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const wantsToFollow = entityWantsToFollow(followAIComponent);
   
   let currentTargetIsHoldingBerry = false;
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      if (!InventoryUseComponentArray.hasComponent(entity.id)) {
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

export function tickCow(cow: Entity): void {
   const cowComponent = CowComponentArray.getComponent(cow.id);
   updateCowComponent(cow, cowComponent);

   const aiHelperComponent = AIHelperComponentArray.getComponent(cow.id);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(cow.id);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntityIDs.length > 0) {
      const escapeEntity = chooseEscapeEntity(cow, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(cow, escapeEntity, 300, TURN_SPEED);
         return;
      }
   }

   // Graze dirt to recover health
   if (cowComponent.grazeCooldownTicks === 0 && cow.tile.type === TileType.grass) {
      graze(cow, cowComponent);
      return;
   } else {
      cowComponent.grazeProgressTicks = 0;
   }

   // Eat berries
   if (wantsToEatBerries(cowComponent)) {
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const itemEntity = aiHelperComponent.visibleEntities[i];
         if (itemEntity.type === EntityType.itemEntity) {
            const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
            if (itemComponent.itemType === ItemType.berry) {
               const wasEaten = chaseAndEatBerry(cow, cowComponent, itemEntity, 200);
               if (wasEaten) {
                  healEntity(cow, 3, cow.id);
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
      if (typeof Board.entityRecord[cowComponent.targetBushID] === "undefined") {
         let target: Entity | null = null;
         let minDistance = Number.MAX_SAFE_INTEGER;
         for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
            const berryBush = aiHelperComponent.visibleEntities[i];
            if (berryBush.type !== EntityType.berryBush) {
               continue;
            }
   
            // Don't shake bushes without berries
            const berryBushComponent = BerryBushComponentArray.getComponent(berryBush.id);
            if (berryBushComponent.numBerries === 0) {
               continue;
            }

            const distance = cow.position.calculateDistanceBetween(berryBush.position);
            if (distance < minDistance) {
               minDistance = distance;
               target = berryBush;
            }
         }
   
         if (target !== null) {
            cowComponent.targetBushID = target.id;
         }
      }

      const targetBerryBush = Board.entityRecord[cowComponent.targetBushID];
      if (typeof targetBerryBush !== "undefined") {
         moveEntityToPosition(cow, targetBerryBush.position.x, targetBerryBush.position.y, 200, TURN_SPEED);
   
         // If the target entity is directly in front of the cow, start eatin it
         const testPositionX = cow.position.x + 60 * Math.sin(cow.rotation);
         const testPositionY = cow.position.y + 60 * Math.cos(cow.rotation);
         if (Board.positionIsInBoard(testPositionX, testPositionY)) {
            // @Hack? The only place which uses this weird function
            const testEntities = Board.getEntitiesAtPosition(testPositionX, testPositionY);
            if (testEntities.indexOf(targetBerryBush) !== -1) {
               cowComponent.bushShakeTimer++;
               if (cowComponent.bushShakeTimer >= 1.5 * Settings.TPS) {
                  dropBerry(targetBerryBush, 1);
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
   const followAIComponent = FollowAIComponentArray.getComponent(cow.id);
   updateFollowAIComponent(cow, aiHelperComponent.visibleEntities, 7)
   
   const followedEntity = Board.entityRecord[followAIComponent.followTargetID];
   if (typeof followedEntity !== "undefined") {
      continueFollowingEntity(cow, followedEntity, 200, TURN_SPEED);
      return;
   } else {
      const followTarget = getFollowTarget(followAIComponent, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         startFollowingEntity(cow, followTarget, 200, TURN_SPEED, randInt(MIN_FOLLOW_COOLDOWN, MAX_FOLLOW_COOLDOWN));
         return;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(cow.id);
   
   // Herd AI
   // @Incomplete: Steer the herd away from non-grasslands biomes
   const herdMembers = findHerdMembers(cowComponent, aiHelperComponent.visibleEntities);
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(cow, herdMembers, VISION_RANGE, TURN_RATE, MIN_SEPARATION_DISTANCE, SEPARATION_INFLUENCE, ALIGNMENT_INFLUENCE, COHESION_INFLUENCE);

      physicsComponent.acceleration.x = 200 * Math.sin(cow.rotation);
      physicsComponent.acceleration.y = 200 * Math.cos(cow.rotation);
      return;
   }

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(cow.id);
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

export function onCowHurt(cow: Entity, attackingEntity: Entity): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onCowDeath(cow: Entity): void {
   createItemsOverEntity(cow, ItemType.raw_beef, randInt(2, 3), 40);
   createItemsOverEntity(cow, ItemType.leather, randInt(1, 2), 40);
}