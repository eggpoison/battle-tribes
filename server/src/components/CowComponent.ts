import { CowSpecies, EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { randFloat, randInt, TileIndex } from "webgl-test-shared/dist/utils";
import { EntityTickEvent, EntityTickEventType } from "webgl-test-shared/dist/entity-events";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { COW_GRAZE_TIME_TICKS, CowVars } from "../entities/mobs/cow";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { registerEntityTickEvent } from "../server/player-clients";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import Board from "../Board";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntityFromConfig } from "../Entity";
import { Packet } from "webgl-test-shared/dist/packets";
import { TileType, Biome } from "webgl-test-shared/dist/tiles";
import { moveEntityToPosition, runHerdAI, entityHasReachedPosition, stopEntity } from "../ai-shared";
import { chooseEscapeEntity, runFromAttackingEntity } from "../ai/escape-ai";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import { dropBerry } from "../entities/resources/berry-bush";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { BerryBushComponentArray } from "./BerryBushComponent";
import { EscapeAIComponentArray, updateEscapeAIComponent } from "./EscapeAIComponent";
import { FollowAIComponentArray, updateFollowAIComponent, continueFollowingEntity, startFollowingEntity, entityWantsToFollow, FollowAIComponent } from "./FollowAIComponent";
import { healEntity, getEntityHealth } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";
import { GrassBlockerCircle } from "webgl-test-shared/dist/grass-blockers";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { addGrassBlocker } from "../grass-blockers";
import { InventoryComponentArray, getInventory } from "./InventoryComponent";
import { InventoryUseComponentArray } from "./InventoryUseComponent";

const enum Vars {
   MIN_POOP_PRODUCTION_COOLDOWN = 5 * Settings.TPS,
   MAX_POOP_PRODUCTION_COOLDOWN = 15 * Settings.TPS,
   BERRY_FULLNESS_VALUE = 0.15,
   MIN_POOP_PRODUCTION_FULLNESS = 0.4,
   BOWEL_EMPTY_TIME_TICKS = 55 * Settings.TPS,
   MAX_BERRY_CHASE_FULLNESS = 0.8,
   TURN_SPEED = 3.14159265358979,
   // Herd AI constants
   TURN_RATE = 0.4,
   MIN_SEPARATION_DISTANCE = 150,
   SEPARATION_INFLUENCE = 0.7,
   ALIGNMENT_INFLUENCE = 0.5,
   COHESION_INFLUENCE = 0.3
}

export interface CowComponentParams {
   readonly species: CowSpecies;
   readonly grazeCooldownTicks: number;
}

export class CowComponent {
   public readonly species: CowSpecies;
   public grazeProgressTicks = 0;
   public grazeCooldownTicks: number;

   // For shaking berry bushes
   public targetBushID = 0;
   public bushShakeTimer = 0;

   /** Used when producing poop. */
   public bowelFullness = 0;
   public poopProductionCooldownTicks = 0;

   constructor(params: CowComponentParams) {
      this.species = params.species;
      this.grazeCooldownTicks = params.grazeCooldownTicks;
   }
}

export const CowComponentArray = new ComponentArray<CowComponent>(ServerComponentType.cow, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const poop = (cow: EntityID, cowComponent: CowComponent): void => {
   cowComponent.poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);
   
   // Shit it out
   const transformComponent = TransformComponentArray.getComponent(cow);
   const poopPosition = transformComponent.position.offset(randFloat(0, 16), 2 * Math.PI * Math.random());
   const config = createItemEntityConfig();
   config[ServerComponentType.transform].position.x = poopPosition.x;
   config[ServerComponentType.transform].position.y = poopPosition.y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.item].itemType = ItemType.poop;
   config[ServerComponentType.item].amount = 1;
   createEntityFromConfig(config);

   // Let it out
   const event: EntityTickEvent<EntityTickEventType.cowFart> = {
      entityID: cow,
      type: EntityTickEventType.cowFart,
      data: 0
   };
   registerEntityTickEvent(cow, event);
}

export function updateCowComponent(cow: EntityID, cowComponent: CowComponent): void {
   if (cowComponent.poopProductionCooldownTicks > 0) {
      cowComponent.poopProductionCooldownTicks--;
   } else if (cowComponent.bowelFullness >= Vars.MIN_POOP_PRODUCTION_FULLNESS) {
      poop(cow, cowComponent);
   }

   cowComponent.bowelFullness -= 1 / Vars.BOWEL_EMPTY_TIME_TICKS;
   if (cowComponent.bowelFullness < 0) {
      cowComponent.bowelFullness = 0;
   }

   if (cowComponent.grazeCooldownTicks > 0) {
      cowComponent.grazeCooldownTicks--;
   }
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
      cowComponent.grazeCooldownTicks = randInt(CowVars.MIN_GRAZE_COOLDOWN, CowVars.MAX_GRAZE_COOLDOWN);
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
   moveEntityToPosition(cow, berryTransformComponent.position.x, berryTransformComponent.position.y, acceleration, Vars.TURN_SPEED);
   
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

function onTick(cowComponent: CowComponent, cow: EntityID): void {
   updateCowComponent(cow, cowComponent);

   const transformComponent = TransformComponentArray.getComponent(cow);
   const aiHelperComponent = AIHelperComponentArray.getComponent(cow);
   
   // Escape AI
   const escapeAIComponent = EscapeAIComponentArray.getComponent(cow);
   updateEscapeAIComponent(escapeAIComponent, 5 * Settings.TPS);
   if (escapeAIComponent.attackingEntities.length > 0) {
      const escapeEntity = chooseEscapeEntity(cow, aiHelperComponent.visibleEntities);
      if (escapeEntity !== null) {
         runFromAttackingEntity(cow, escapeEntity, 300, Vars.TURN_SPEED);
         return;
      }
   }

   // Graze dirt to recover health
   const tileIndex = getEntityTile(transformComponent);
   const tileType = Board.tileTypes[tileIndex];
   if (cowComponent.grazeCooldownTicks === 0 && tileType === TileType.grass) {
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
   if (getEntityHealth(cow) < CowVars.MAX_HEALTH) {
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

         moveEntityToPosition(cow, targetTransformComponent.position.x, targetTransformComponent.position.y, 200, Vars.TURN_SPEED);
   
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
      continueFollowingEntity(cow, followAIComponent.followTargetID, 200, Vars.TURN_SPEED);
      return;
   } else {
      const followTarget = getFollowTarget(followAIComponent, aiHelperComponent.visibleEntities);
      if (followTarget !== null) {
         // Follow the entity
         startFollowingEntity(cow, followTarget, 200, Vars.TURN_SPEED, randInt(CowVars.MIN_FOLLOW_COOLDOWN, CowVars.MAX_FOLLOW_COOLDOWN));
         return;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(cow);
   
   // Herd AI
   // @Incomplete: Steer the herd away from non-grasslands biomes
   const herdMembers = findHerdMembers(cowComponent, aiHelperComponent.visibleEntities);
   if (herdMembers.length >= 2 && herdMembers.length <= 6) {
      runHerdAI(cow, herdMembers, CowVars.VISION_RANGE, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

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
      let targetTile: TileIndex;
      do {
         targetTile = getWanderTargetTile(cow, CowVars.VISION_RANGE);
      } while (++attempts <= 50 && (Board.tileIsWalls[targetTile] === 1 || Board.tileBiomes[targetTile] !== Biome.grasslands));

      const tileX = Board.getTileX(targetTile);
      const tileY = Board.getTileY(targetTile);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;
      wander(cow, x, y, 200, Vars.TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const cowComponent = CowComponentArray.getComponent(entity);
   
   packet.addNumber(cowComponent.species);
   packet.addNumber(cowComponent.grazeProgressTicks > 0 ? cowComponent.grazeProgressTicks / COW_GRAZE_TIME_TICKS : -1);
}

export function eatBerry(berryItemEntity: EntityID, cowComponent: CowComponent): void {
   cowComponent.bowelFullness += Vars.BERRY_FULLNESS_VALUE;
   
   Board.destroyEntity(berryItemEntity);
}

export function wantsToEatBerries(cowComponent: CowComponent): boolean {
   return cowComponent.bowelFullness <= Vars.MAX_BERRY_CHASE_FULLNESS;
}