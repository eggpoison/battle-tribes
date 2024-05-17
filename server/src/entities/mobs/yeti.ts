import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, SnowballSize, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { randItem, Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome } from "webgl-test-shared/dist/tiles";
import Entity from "../../Entity";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { HealthComponentArray, ItemComponentArray, SnowballComponentArray, TribeComponentArray, WanderAIComponentArray, YetiComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity, healEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { WanderAIComponent } from "../../components/WanderAIComponent";
import { entityHasReachedPosition, moveEntityToPosition, stopEntity } from "../../ai-shared";
import { shouldWander, getWanderTargetTile, wander } from "../../ai/wander-ai";
import Tile from "../../Tile";
import { YetiComponent } from "../../components/YetiComponent";
import Board from "../../Board";
import { createItemsOverEntity } from "../../entity-shared";
import { createSnowball } from "../snowball";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { SERVER } from "../../server";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { ServerComponentType } from "webgl-test-shared/dist/components";

const MIN_TERRITORY_SIZE = 50;
const MAX_TERRITORY_SIZE = 100;

const YETI_SIZE = 128;

const VISION_RANGE = 500;

const ATTACK_PURSUE_TIME_TICKS = 5 * Settings.TPS;

export const YETI_SNOW_THROW_COOLDOWN = 7;
const SMALL_SNOWBALL_THROW_SPEED = [550, 650] as const;
const LARGE_SNOWBALL_THROW_SPEED = [350, 450] as const;
const SNOW_THROW_ARC = Math.PI/5;
const SNOW_THROW_OFFSET = 64;
const SNOW_THROW_WINDUP_TIME = 1.75;
const SNOW_THROW_HOLD_TIME = 0.1;
const SNOW_THROW_RETURN_TIME = 0.6;
const SNOW_THROW_KICKBACK_AMOUNT = 110;

const TURN_SPEED = Math.PI * 3/2;

// /** Stores which tiles belong to which yetis' territories */
let yetiTerritoryTiles: Partial<Record<number, Entity>> = {};

export enum SnowThrowStage {
   windup,
   hold,
   return
}

const registerYetiTerritory = (yeti: Entity, territory: ReadonlyArray<Tile>): void => {
   for (const tile of territory) {
      const tileIndex = tile.y * Settings.BOARD_DIMENSIONS + tile.x;
      yetiTerritoryTiles[tileIndex] = yeti;
   }
}

const removeYetiTerritory = (tileX: number, tileY: number): void => {
   const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
   delete yetiTerritoryTiles[tileIndex];
}

export function resetYetiTerritoryTiles(): void {
   yetiTerritoryTiles = {};
}

const tileBelongsToYetiTerritory = (tileX: number, tileY: number): boolean => {
   const tileIndex = tileY * Settings.BOARD_DIMENSIONS + tileX;
   return yetiTerritoryTiles.hasOwnProperty(tileIndex);
}

const generateYetiTerritoryTiles = (originTileX: number, originTileY: number): ReadonlyArray<Tile> => {
   const territoryTiles = new Array<Tile>();
   // Tiles to expand the territory from
   const spreadTiles = new Array<Tile>();

   const tileIsValid = (tile: Tile): boolean => {
      // Make sure the tile is inside the board
      if (tile.x < 0 || tile.x >= Settings.BOARD_DIMENSIONS || tile.y < 0 || tile.y >= Settings.BOARD_DIMENSIONS) {
         return false;
      }

      return tile.biome === Biome.tundra && !tileBelongsToYetiTerritory(tile.x, tile.y) && !territoryTiles.includes(tile);
   }

   const originTile = Board.getTile(originTileX, originTileY);
   territoryTiles.push(originTile);
   spreadTiles.push(originTile);

   while (spreadTiles.length > 0) {
      // Pick a random tile to expand from
      const idx = Math.floor(Math.random() * spreadTiles.length);
      const tile = spreadTiles[idx];

      const potentialTiles = [
         [tile.x + 1, tile.y],
         [tile.x - 1, tile.y],
         [tile.x, tile.y + 1],
         [tile.x, tile.y - 1]
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
         const tile = Board.getTile(tileCoordinates[0], tileCoordinates[1]);
         if (tileIsValid(tile)) {
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
         const tile = Board.getTile(tileX, tileY);
         territoryTiles.push(tile);
         spreadTiles.push(tile);
      }

      if (territoryTiles.length >= MAX_TERRITORY_SIZE) {
         break;
      }
   }

   return territoryTiles;
}

export function yetiSpawnPositionIsValid(positionX: number, positionY: number): boolean {
   const originTileX = Math.floor(positionX / Settings.TILE_SIZE);
   const originTileY = Math.floor(positionY / Settings.TILE_SIZE);

   const territoryTiles = generateYetiTerritoryTiles(originTileX, originTileY);
   return territoryTiles.length >= MIN_TERRITORY_SIZE;
}

export function createYeti(position: Point): Entity {
   const yeti = new Entity(position, 2 * Math.PI * Math.random(), EntityType.yeti, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(position, 3, 0, 0, HitboxCollisionType.soft, YETI_SIZE / 2, yeti.getNextHitboxLocalID(), yeti.rotation, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK);
   yeti.addHitbox(hitbox);

   PhysicsComponentArray.addComponent(yeti.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(yeti.id, new HealthComponent(100));
   StatusEffectComponentArray.addComponent(yeti.id, new StatusEffectComponent(StatusEffect.freezing));
   WanderAIComponentArray.addComponent(yeti.id, new WanderAIComponent());
   AIHelperComponentArray.addComponent(yeti.id, new AIHelperComponent(VISION_RANGE));

   const territory = generateYetiTerritoryTiles(yeti.tile.x, yeti.tile.y);
   registerYetiTerritory(yeti, territory);
   YetiComponentArray.addComponent(yeti.id, new YetiComponent(territory));

   return yeti;
}

const throwSnowball = (yeti: Entity, size: SnowballSize, throwAngle: number): void => {
   const angle = throwAngle + randFloat(-SNOW_THROW_ARC, SNOW_THROW_ARC);
   
   const position = yeti.position.copy();
   position.x += SNOW_THROW_OFFSET * Math.sin(angle);
   position.y += SNOW_THROW_OFFSET * Math.cos(angle);

   const snowballCreationInfo = createSnowball(position, size, yeti.id);

   let velocityMagnitude: number;
   if (size === SnowballSize.small) {
      velocityMagnitude = randFloat(...SMALL_SNOWBALL_THROW_SPEED);
   } else {
      velocityMagnitude = randFloat(...LARGE_SNOWBALL_THROW_SPEED);
   }

   const physicsComponent = snowballCreationInfo.components[ServerComponentType.physics];
   physicsComponent.velocity.x += velocityMagnitude * Math.sin(angle);
   physicsComponent.velocity.y += velocityMagnitude * Math.cos(angle);
}

const throwSnow = (yeti: Entity, target: Entity): void => {
   const throwAngle = yeti.position.calculateAngleBetween(target.position);

   // Large snowballs
   for (let i = 0; i < 2; i++) {
      throwSnowball(yeti, SnowballSize.large, throwAngle);
   }

   // Small snowballs
   for (let i = 0; i < 3; i++) {
      throwSnowball(yeti, SnowballSize.small, throwAngle);
   }

   // Kickback
   const physicsComponent = PhysicsComponentArray.getComponent(yeti.id);
   physicsComponent.velocity.x += SNOW_THROW_KICKBACK_AMOUNT * Math.sin(throwAngle * Math.PI);
   physicsComponent.velocity.y += SNOW_THROW_KICKBACK_AMOUNT * Math.cos(throwAngle * Math.PI);
}

const getYetiTarget = (yeti: Entity, visibleEntities: ReadonlyArray<Entity>): Entity | null => {
   const yetiComponent = YetiComponentArray.getComponent(yeti.id);

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
   let target: Entity | null = null;
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];

      // Don't chase entities without health or natural tundra resources or snowballs or frozen yetis who aren't attacking the yeti
      if (!HealthComponentArray.hasComponent(entity.id) || entity.type === EntityType.iceSpikes || entity.type === EntityType.snowball || (entity.type === EntityType.frozenYeti && !yetiComponent.attackingEntities.hasOwnProperty(entity.id))) {
         continue;
      }
      
      // Don't chase frostlings which aren't attacking the yeti
      if ((entity.type === EntityType.tribeWorker || entity.type === EntityType.tribeWarrior || entity.type === EntityType.player) && !yetiComponent.attackingEntities.hasOwnProperty(entity.id)) {
         const tribeComponent = TribeComponentArray.getComponent(entity.id);
         if (tribeComponent.tribe.type === TribeType.frostlings) {
            continue;
         }
      }

      // Don't attack entities which aren't attacking the yeti and aren't encroaching on its territory
      if (!yetiComponent.attackingEntities.hasOwnProperty(entity.id) && !yetiComponent.territory.includes(entity.tile)) {
         continue;
      }

      const attackingInfo = yetiComponent.attackingEntities[entity.id];
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

export function tickYeti(yeti: Entity): void {
   const aiHelperComponent = AIHelperComponentArray.getComponent(yeti.id);
   const yetiComponent = YetiComponentArray.getComponent(yeti.id);

   if (yetiComponent.isThrowingSnow) {
      // If the target has run outside the yeti's vision range, cancel the attack
      if (yetiComponent.attackTarget !== null && yeti.position.calculateDistanceBetween(yetiComponent.attackTarget.position) > VISION_RANGE) {
         yetiComponent.snowThrowAttackProgress = 1;
         yetiComponent.attackTarget = null;
         yetiComponent.isThrowingSnow = false;
      } else {
         switch (yetiComponent.snowThrowStage) {
            case SnowThrowStage.windup: {
               yetiComponent.snowThrowAttackProgress -= Settings.I_TPS / SNOW_THROW_WINDUP_TIME;
               if (yetiComponent.snowThrowAttackProgress <= 0) {
                  throwSnow(yeti, yetiComponent.attackTarget!);
                  yetiComponent.snowThrowAttackProgress = 0;
                  yetiComponent.snowThrowCooldown = YETI_SNOW_THROW_COOLDOWN;
                  yetiComponent.snowThrowStage = SnowThrowStage.hold;
                  yetiComponent.snowThrowHoldTimer = 0;
               }

               const physicsComponent = PhysicsComponentArray.getComponent(yeti.id);
               physicsComponent.targetRotation = yeti.position.calculateAngleBetween(yetiComponent.attackTarget!.position);;
               physicsComponent.turnSpeed = TURN_SPEED;

               stopEntity(physicsComponent);
               return;
            }
            case SnowThrowStage.hold: {
               yetiComponent.snowThrowHoldTimer += Settings.I_TPS;
               if (yetiComponent.snowThrowHoldTimer >= SNOW_THROW_HOLD_TIME) {
                  yetiComponent.snowThrowStage = SnowThrowStage.return;
               }

               const physicsComponent = PhysicsComponentArray.getComponent(yeti.id);
               physicsComponent.targetRotation = yeti.position.calculateAngleBetween(yetiComponent.attackTarget!.position);;
               physicsComponent.turnSpeed = TURN_SPEED;

               stopEntity(physicsComponent);
               return;
            }
            case SnowThrowStage.return: {
               yetiComponent.snowThrowAttackProgress += Settings.I_TPS / SNOW_THROW_RETURN_TIME;
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
      moveEntityToPosition(yeti, chaseTarget.position.x, chaseTarget.position.y, 375, TURN_SPEED);
      return;
   }

   // Eat raw beef and leather
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (entity.type !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity.id);
         if (itemComponent.itemType === ItemType.raw_beef || itemComponent.itemType === ItemType.raw_fish) {
            const distance = yeti.position.calculateDistanceBetween(entity.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         moveEntityToPosition(yeti, closestFoodItem.position.x, closestFoodItem.position.y, 100, TURN_SPEED);

         if (entitiesAreColliding(yeti, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(yeti, 3, yeti.id);
            closestFoodItem.destroy();
         }
         return;
      }
   }
   
   const physicsComponent = PhysicsComponentArray.getComponent(yeti.id);

   // Wander AI
   const wanderAIComponent = WanderAIComponentArray.getComponent(yeti.id);
   if (wanderAIComponent.targetPositionX !== -1) {
      if (entityHasReachedPosition(yeti, wanderAIComponent.targetPositionX, wanderAIComponent.targetPositionY)) {
         wanderAIComponent.targetPositionX = -1;
         stopEntity(physicsComponent);
      }
   } else if (shouldWander(physicsComponent, 0.6)) {
      let attempts = 0;
      let targetTile: Tile;
      do {
         targetTile = getWanderTargetTile(yeti, VISION_RANGE);
      } while (++attempts <= 50 && (targetTile.isWall || targetTile.biome !== Biome.tundra || !yetiComponent.territory.includes(targetTile)));

      const x = (targetTile.x + Math.random()) * Settings.TILE_SIZE;
      const y = (targetTile.y + Math.random()) * Settings.TILE_SIZE;
      wander(yeti, x, y, 100, TURN_SPEED);
   } else {
      stopEntity(physicsComponent);
   }
}

export function onYetiCollision(yeti: Entity, collidingEntity: Entity): void {
   // Don't damage ice spikes
   if (collidingEntity.type === EntityType.iceSpikes) return;

   // Don't damage snowballs thrown by the yeti
   if (collidingEntity.type === EntityType.snowball) {
      const snowballComponent = SnowballComponentArray.getComponent(collidingEntity.id);
      if (snowballComponent.yetiID === yeti.id) {
         return;
      }
   }
   
   // Don't damage yetis which haven't damaged it
   const yetiComponent = YetiComponentArray.getComponent(yeti.id);
   if ((collidingEntity.type === EntityType.yeti || collidingEntity.type === EntityType.frozenYeti) && !yetiComponent.attackingEntities.hasOwnProperty(collidingEntity.id)) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity.id)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
      if (!canDamageEntity(healthComponent, "yeti")) {
         return;
      }
      
      const hitDirection = yeti.position.calculateAngleBetween(collidingEntity.position);
      damageEntity(collidingEntity, 2, yeti, PlayerCauseOfDeath.yeti, "yeti");
      applyKnockback(collidingEntity, 200, hitDirection);
      SERVER.registerEntityHit({
         entityPositionX: collidingEntity.position.x,
         entityPositionY: collidingEntity.position.y,
         hitEntityID: collidingEntity.id,
         damage: 2,
         knockback: 200,
         angleFromAttacker: hitDirection,
         attackerID: yeti.id,
         flags: 0
      });
      addLocalInvulnerabilityHash(healthComponent, "yeti", 0.3);
   }
}

export function onYetiHurt(yeti: Entity, attackingEntity: Entity, damage: number): void {
   const yetiComponent = YetiComponentArray.getComponent(yeti.id);

   const attackingEntityInfo = yetiComponent.attackingEntities[attackingEntity.id];
   if (typeof attackingEntityInfo !== "undefined") {
      attackingEntityInfo.remainingPursueTicks += ATTACK_PURSUE_TIME_TICKS;
      attackingEntityInfo.totalDamageDealt += damage;
   } else {
      yetiComponent.attackingEntities[attackingEntity.id] = {
         remainingPursueTicks: ATTACK_PURSUE_TIME_TICKS,
         totalDamageDealt: damage
      };
   }
}

export function onYetiDeath(yeti: Entity): void {
   createItemsOverEntity(yeti, ItemType.raw_beef, randInt(4, 7), 80);
   createItemsOverEntity(yeti, ItemType.yeti_hide, randInt(2, 3), 80);

   // Remove territory
   const yetiComponent = YetiComponentArray.getComponent(yeti.id);
   for (let i = 0; i < yetiComponent.territory.length; i++) {
      const territoryTile = yetiComponent.territory[i];
      removeYetiTerritory(territoryTile.x, territoryTile.y);
   }
}