import { ServerComponentType } from "webgl-test-shared/dist/components";
import { SnowThrowStage, YETI_SNOW_THROW_COOLDOWN, YetiVars } from "../entities/mobs/yeti";
import { ComponentArray } from "./ComponentArray";
import { EntityID, EntityType, SnowballSize } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome } from "webgl-test-shared/dist/tiles";
import { randFloat, randItem, TileIndex, UtilVars } from "webgl-test-shared/dist/utils";
import Board from "../Board";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import { Packet } from "webgl-test-shared/dist/packets";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { stopEntity, moveEntityToPosition, entityHasReachedPosition } from "../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../ai/wander-ai";
import { entitiesAreColliding, CollisionVars } from "../collision";
import { createSnowballConfig } from "../entities/snowball";
import { createEntityFromConfig } from "../Entity";
import { AIHelperComponentArray } from "./AIHelperComponent";
import { HealthComponentArray, healEntity } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { PhysicsComponentArray } from "./PhysicsComponent";
import { TribeComponentArray } from "./TribeComponent";
import { WanderAIComponentArray } from "./WanderAIComponent";

const enum Vars {
   SMALL_SNOWBALL_THROW_SPEED_MIN = 550,
   SMALL_SNOWBALL_THROW_SPEED_MAX = 650,
   LARGE_SNOWBALL_THROW_SPEED_MIN = 350,
   LARGE_SNOWBALL_THROW_SPEED_MAX = 450,
   SNOW_THROW_ARC = UtilVars.PI/5,
   SNOW_THROW_OFFSET = 64,
   SNOW_THROW_WINDUP_TIME = 1.75,
   SNOW_THROW_HOLD_TIME = 0.1,
   SNOW_THROW_RETURN_TIME = 0.6,
   SNOW_THROW_KICKBACK_AMOUNT = 110,
   
   TURN_SPEED = UtilVars.PI * 3/2,
}

export interface YetiComponentParams {
   readonly territory: ReadonlyArray<TileIndex>;
}

export interface YetiTargetInfo {
   remainingPursueTicks: number;
   totalDamageDealt: number;
}

const MIN_TERRITORY_SIZE = 50;
const MAX_TERRITORY_SIZE = 100;

// /** Stores which tiles belong to which yetis' territories */
const yetiTerritoryTiles: Partial<Record<TileIndex, EntityID>> = {};

export class YetiComponent {
   public readonly territory: ReadonlyArray<TileIndex>;

   // Stores the ids of all entities which have recently attacked the yeti
   public readonly attackingEntities: Partial<Record<number, YetiTargetInfo>> = {};

   public attackTarget: EntityID | null = null;
   public isThrowingSnow = false;
   public snowThrowStage: SnowThrowStage = SnowThrowStage.windup;
   public snowThrowAttackProgress = 1;
   public snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
   public snowThrowHoldTimer = 0;

   constructor(params: YetiComponentParams) {
      this.territory = params.territory;
   }
}
export const YetiComponentArray = new ComponentArray<YetiComponent>(ServerComponentType.yeti, true, {
   onJoin: onJoin,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const tileBelongsToYetiTerritory = (tileX: number, tileY: number): boolean => {
   const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
   return yetiTerritoryTiles.hasOwnProperty(tileIndex);
}

const tileIsValid = (territoryTiles: ReadonlyArray<TileIndex>, tileIndex: TileIndex): boolean => {
   const tileX = Board.getTileX(tileIndex);
   const tileY = Board.getTileY(tileIndex);
   
   // Make sure the tile is inside the board
   if (!Board.tileIsInBoard(tileX, tileY)) {
      return false;
   }

   const biome = Board.tileBiomes[tileIndex];
   return biome === Biome.tundra && !tileBelongsToYetiTerritory(tileX, tileY) && !territoryTiles.includes(tileIndex);
}

const generateYetiTerritoryTiles = (originTileX: number, originTileY: number): ReadonlyArray<TileIndex> => {
   const territoryTiles = new Array<TileIndex>();
   // Tiles to expand the territory from
   const spreadTiles = new Array<TileIndex>();

   const originTileIndex = Board.getTileIndexIncludingEdges(originTileX, originTileY);
   territoryTiles.push(originTileIndex);
   spreadTiles.push(originTileIndex);

   while (spreadTiles.length > 0) {
      // Pick a random tile to expand from
      const idx = Math.floor(Math.random() * spreadTiles.length);
      const tileIndex = spreadTiles[idx];

      const tileX = Board.getTileX(tileIndex);
      const tileY = Board.getTileY(tileIndex);

      const potentialTiles = [
         [tileX + 1, tileY],
         [tileX - 1, tileY],
         [tileX, tileY + 1],
         [tileX, tileY - 1]
      ];

      // Remove out of bounds tiles
      for (let i = 3; i >= 0; i--) {
         const tileCoordinates = potentialTiles[i];
         if (!Board.tileIsInBoard(tileCoordinates[0], tileCoordinates[1])) {
            potentialTiles.splice(i, 1);
         }
      }

      let numValidTiles = 0;

      for (let i = potentialTiles.length - 1; i >= 0; i--) {
         const tileCoordinates = potentialTiles[i];
         const tileIndex = Board.getTileIndexIncludingEdges(tileCoordinates[0], tileCoordinates[1]);
         if (tileIsValid(territoryTiles, tileIndex)) {
            numValidTiles++;
         } else {
            potentialTiles.splice(i, 1);
         }
      }

      if (numValidTiles === 0) {
         spreadTiles.splice(idx, 1);
      } else {
         // Pick a random tile to expand to
         const [tileX, tileY] = randItem(potentialTiles);
         const tileIndex = Board.getTileIndexIncludingEdges(tileX, tileY);
         territoryTiles.push(tileIndex);
         spreadTiles.push(tileIndex);
      }

      if (territoryTiles.length >= MAX_TERRITORY_SIZE) {
         break;
      }
   }

   return territoryTiles;
}

const registerYetiTerritory = (yeti: EntityID, territory: ReadonlyArray<TileIndex>): void => {
   for (const tileIndex of territory) {
      yetiTerritoryTiles[tileIndex] = yeti;
   }
}

export function yetiSpawnPositionIsValid(positionX: number, positionY: number): boolean {
   const originTileX = Math.floor(positionX / Settings.TILE_SIZE);
   const originTileY = Math.floor(positionY / Settings.TILE_SIZE);

   const territoryTiles = generateYetiTerritoryTiles(originTileX, originTileY);
   return territoryTiles.length >= MIN_TERRITORY_SIZE;
}

const removeYetiTerritory = (tileIndex: TileIndex): void => {
   delete yetiTerritoryTiles[tileIndex];
}

function onJoin(yeti: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   
   const tileIndex = getEntityTile(transformComponent);
   const tileX = Board.getTileX(tileIndex);
   const tileY = Board.getTileY(tileIndex);
   
   const territory = generateYetiTerritoryTiles(tileX, tileY);
   registerYetiTerritory(yeti, territory);
}

const throwSnowball = (yeti: EntityID, size: SnowballSize, throwAngle: number): void => {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   
   const angle = throwAngle + randFloat(-Vars.SNOW_THROW_ARC, Vars.SNOW_THROW_ARC);
   
   const position = transformComponent.position.copy();
   position.x += Vars.SNOW_THROW_OFFSET * Math.sin(angle);
   position.y += Vars.SNOW_THROW_OFFSET * Math.cos(angle);

   let velocityMagnitude: number;
   if (size === SnowballSize.small) {
      velocityMagnitude = randFloat(Vars.SMALL_SNOWBALL_THROW_SPEED_MIN, Vars.SMALL_SNOWBALL_THROW_SPEED_MAX);
   } else {
      velocityMagnitude = randFloat(Vars.LARGE_SNOWBALL_THROW_SPEED_MIN, Vars.LARGE_SNOWBALL_THROW_SPEED_MAX);
   }

   const config = createSnowballConfig();
   config[ServerComponentType.transform].position.x = position.x;
   config[ServerComponentType.transform].position.y = position.y;
   config[ServerComponentType.physics].velocityX += velocityMagnitude * Math.sin(angle);
   config[ServerComponentType.physics].velocityY += velocityMagnitude * Math.cos(angle);
   config[ServerComponentType.snowball].size = size;
   config[ServerComponentType.snowball].yetiID = yeti;
   createEntityFromConfig(config);
}

const throwSnow = (yeti: EntityID, target: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(yeti);
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   
   const throwAngle = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

   // Large snowballs
   for (let i = 0; i < 2; i++) {
      throwSnowball(yeti, SnowballSize.large, throwAngle);
   }

   // Small snowballs
   for (let i = 0; i < 3; i++) {
      throwSnowball(yeti, SnowballSize.small, throwAngle);
   }

   // Kickback
   const physicsComponent = PhysicsComponentArray.getComponent(yeti);
   physicsComponent.externalVelocity.x += Vars.SNOW_THROW_KICKBACK_AMOUNT * Math.sin(throwAngle * Math.PI);
   physicsComponent.externalVelocity.y += Vars.SNOW_THROW_KICKBACK_AMOUNT * Math.cos(throwAngle * Math.PI);
}

const getYetiTarget = (yeti: EntityID, visibleEntities: ReadonlyArray<EntityID>): EntityID | null => {
   const yetiComponent = YetiComponentArray.getComponent(yeti);

   // @Speed
   // Decrease remaining pursue time
   for (const id of Object.keys(yetiComponent.attackingEntities).map(idString => Number(idString))) {
      const attackingEntityInfo = yetiComponent.attackingEntities[id]!;
      attackingEntityInfo.remainingPursueTicks--;
      if (attackingEntityInfo!.remainingPursueTicks <= 0) {
         delete yetiComponent.attackingEntities[id];
      }
   }
   
   let mostDamageDealt = 0;
   let target: EntityID | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      const entityType = Board.getEntityType(entity);

      // Don't chase entities without health or natural tundra resources or snowballs or frozen yetis who aren't attacking the yeti
      if (!HealthComponentArray.hasComponent(entity) || entityType === EntityType.iceSpikes || entityType === EntityType.snowball || (entityType === EntityType.frozenYeti && !yetiComponent.attackingEntities.hasOwnProperty(entity))) {
         continue;
      }
      
      // Don't chase frostlings which aren't attacking the yeti
      if ((entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior || entityType === EntityType.player) && !yetiComponent.attackingEntities.hasOwnProperty(entity)) {
         const tribeComponent = TribeComponentArray.getComponent(entity);
         if (tribeComponent.tribe.tribeType === TribeType.frostlings) {
            continue;
         }
      }

      const entityTransformComponent = TransformComponentArray.getComponent(entity);

      const entityTileIndex = getEntityTile(entityTransformComponent);

      // Don't attack entities which aren't attacking the yeti and aren't encroaching on its territory
      if (!yetiComponent.attackingEntities.hasOwnProperty(entity) && !yetiComponent.territory.includes(entityTileIndex)) {
         continue;
      }

      const attackingInfo = yetiComponent.attackingEntities[entity];
      if (typeof attackingInfo !== "undefined") {
         const damageDealt = attackingInfo.totalDamageDealt;
         if (damageDealt > mostDamageDealt) {
            mostDamageDealt = damageDealt;
            target = entity;
         }
      } else {
         // Attack targets which haven't dealt any damage (with the lowest priority)
         if (mostDamageDealt === 0) {
            target = entity;
         }
      }
   }

   return target;
}

function onTick(yetiComponent: YetiComponent, yeti: EntityID): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(yeti);
   const transformComponent = TransformComponentArray.getComponent(yeti);

   if (yetiComponent.isThrowingSnow) {
      // If the target has run outside the yeti's vision range, cancel the attack
      if (yetiComponent.attackTarget !== null && transformComponent.position.calculateDistanceBetween(TransformComponentArray.getComponent(yetiComponent.attackTarget).position) > YetiVars.VISION_RANGE) {
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.attackTarget = null;
         yetiComponent.isThrowingSnow = false;
      } else {
         const targetTransformComponent = TransformComponentArray.getComponent(yetiComponent.attackTarget!);
         
         switch (yetiComponent.snowThrowStage) {
            case SnowThrowStage.windup: {
               yetiComponent.snowThrowAttackProgress -= Settings.I_TPS / Vars.SNOW_THROW_WINDUP_TIME;
               if (yetiComponent.snowThrowAttackProgress <= 0) {
                  throwSnow(yeti, yetiComponent.attackTarget!);
                  yetiComponent.snowThrowAttackProgress = 0;
                  yetiComponent.snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
                  yetiComponent.snowThrowStage = SnowThrowStage.hold;
                  yetiComponent.snowThrowHoldTimer = 0;
               }

               const physicsComponent = PhysicsComponentArray.getComponent(yeti);
               physicsComponent.targetRotation = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);;
               physicsComponent.turnSpeed = Vars.TURN_SPEED;

               stopEntity(physicsComponent);
               return;
            }
            case SnowThrowStage.hold: {
               yetiComponent.snowThrowHoldTimer += Settings.I_TPS;
               if (yetiComponent.snowThrowHoldTimer >= Vars.SNOW_THROW_HOLD_TIME) {
                  yetiComponent.snowThrowStage = SnowThrowStage.return;
               }

               const physicsComponent = PhysicsComponentArray.getComponent(yeti);
               physicsComponent.targetRotation = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);;
               physicsComponent.turnSpeed = Vars.TURN_SPEED;

               stopEntity(physicsComponent);
               return;
            }
            case SnowThrowStage.return: {
               yetiComponent.snowThrowAttackProgress += Settings.I_TPS / Vars.SNOW_THROW_RETURN_TIME;
               if (yetiComponent.snowThrowAttackProgress >= 1) {
                  yetiComponent.snowThrowAttackProgress = 1;
                  yetiComponent.attackTarget = null;
                  yetiComponent.isThrowingSnow = false;
               }
            }
         }
      }
   } else if (yetiComponent.snowThrowCooldown === 0 && !yetiComponent.isThrowingSnow) {
      const target = getYetiTarget(yeti, aiHelperComponent.visibleEntities);
      if (target !== null) {
         yetiComponent.isThrowingSnow = true;
         yetiComponent.attackTarget = target;
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.snowThrowStage = SnowThrowStage.windup;
      }
   }

   yetiComponent.snowThrowCooldown -= Settings.I_TPS;
   if (yetiComponent.snowThrowCooldown < 0) {
      yetiComponent.snowThrowCooldown = 0;
   }

   // Chase AI
   const chaseTarget = getYetiTarget(yeti, aiHelperComponent.visibleEntities);
   if (chaseTarget !== null) {
      const targetTransformComponent = TransformComponentArray.getComponent(chaseTarget);
      moveEntityToPosition(yeti, targetTransformComponent.position.x, targetTransformComponent.position.y, 375, Vars.TURN_SPEED);
      return;
   }

   // Eat raw beef and leather
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: EntityID | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (Board.getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         if (itemComponent.itemType === ItemType.raw_beef || itemComponent.itemType === ItemType.raw_fish) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            
            const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         
         moveEntityToPosition(yeti, foodTransformComponent.position.x, foodTransformComponent.position.y, 100, Vars.TURN_SPEED);

         if (entitiesAreColliding(yeti, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(yeti, 3, yeti);
            Board.destroyEntity(closestFoodItem);
         }
         return;
      }
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(yeti);

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(yeti);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(yeti, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.6)) {
      let attempts = 0;
      let targetTile: TileIndex;
      do {
         targetTile = getWanderTargetTile(yeti, YetiVars.VISION_RANGE);
      } while (++attempts <= 50 && (Board.tileIsWalls[targetTile] === 1 || Board.tileBiomes[targetTile] !== Biome.tundra || !yetiComponent.territory.includes(targetTile)));

      const tileX = Board.getTileX(targetTile);
      const tileY = Board.getTileY(targetTile);
      const x = (tileX + Math.random()) * Settings.TILE_SIZE;
      const y = (tileY + Math.random()) * Settings.TILE_SIZE;
      wander(yeti, x, y, 100, Vars.TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

function onRemove(yeti: EntityID): void {
   // Remove territory
   const yetiComponent = YetiComponentArray.getComponent(yeti);
   for (let i = 0; i < yetiComponent.territory.length; i++) {
      const tileIndex = yetiComponent.territory[i];
      removeYetiTerritory(tileIndex);
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const yetiComponent = YetiComponentArray.getComponent(entity);
   packet.addNumber(yetiComponent.snowThrowAttackProgress);
}