import { BlueprintType, ComponentData, EntityComponents, EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackPacket, CircularHitboxData, ClientToServerEvents, EntityData, EntityDebugData, GameDataPacket, GameDataPacketOptions, GameDataSyncPacket, HealData, HitData, InitialGameDataPacket, InterServerEvents, PlayerDataPacket, PlayerInventoryData, RectangularHitboxData, ResearchOrbCompleteData, RespawnDataPacket, ServerTileData, ServerToClientEvents, SocketData, VisibleChunkBounds } from "webgl-test-shared/dist/client-server-types";
import { EntityType, LimbAction } from "webgl-test-shared/dist/entities";
import { EnemyTribeData, PlayerTribeData, TechID, getTechByID } from "webgl-test-shared/dist/techs";
import { Inventory, InventoryName } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TribeType, TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { assertUnreachable, Point, randInt, randItem } from "webgl-test-shared/dist/utils";
import { Server, Socket } from "socket.io";
import Board from "./Board";
import { registerCommand } from "./commands";
import { runSpawnAttempt, spawnInitialEntities } from "./entity-spawning";
import Tribe from "./Tribe";
import RectangularHitbox from "./hitboxes/RectangularHitbox";
import CircularHitbox from "./hitboxes/CircularHitbox";
import OPTIONS from "./options";
import Entity from "./Entity";
import { HealthComponentArray, InventoryComponentArray, InventoryUseComponentArray, PlayerComponentArray, TribeComponentArray, TribesmanComponentArray } from "./components/ComponentArray";
import { getInventory, serialiseInventoryComponent } from "./components/InventoryComponent";
import { createPlayer, interactWithStructure, processItemPickupPacket, processItemReleasePacket, processItemUsePacket, processPlayerAttackPacket, processPlayerCraftingPacket, processTechUnlock, startChargingBattleaxe, startChargingBow, startChargingSpear, startEating, uninteractWithStructure, modifyBuilding, deconstructBuilding } from "./entities/tribes/player";
import { serialiseCowComponent } from "./entities/mobs/cow";
import { getTilesOfBiome, resetCensus } from "./census";
import { getInventoryUseInfo, serialiseInventoryUseComponent } from "./components/InventoryUseComponent";
import { serialiseGolemComponent } from "./entities/mobs/golem";
import { forceMaxGrowAllIceSpikes, serialiseIceSpikesComponent } from "./entities/resources/ice-spikes";
import { serialiseStatusEffectComponent } from "./components/StatusEffectComponent";
import { PhysicsComponentArray, serialisePhysicsComponent } from "./components/PhysicsComponent";
import { serialiseAIHelperComponent } from "./components/AIHelperComponent";
import { serialiseArrowComponent } from "./components/ArrowComponent";
import { serialiseBerryBushComponent } from "./entities/resources/berry-bush";
import { serialiseBoulderComponent } from "./entities/resources/boulder";
import { serialiseCactusComponent } from "./entities/resources/cactus";
import { serialiseCookingComponent } from "./components/CookingComponent";
import { serialiseDoorComponent } from "./components/DoorComponent";
import { serialiseEscapeAIComponent } from "./components/EscapeAIComponent";
import { serialiseFishComponent } from "./entities/mobs/fish";
import { serialiseFollowAIComponent } from "./components/FollowAIComponent";
import { serialiseFrozenYetiComponent } from "./components/FrozenYetiComponent";
import { serialiseHealthComponent } from "./components/HealthComponent";
import { serialiseHutComponent } from "./components/HutComponent";
import { serialiseIceShardComponent } from "./components/IceShardComponent";
import { serialiseItemComponent } from "./components/ItemComponent";
import { serialisePebblumComponent } from "./components/PebblumComponent";
import { serialisePlayerComponent } from "./components/PlayerComponent";
import { serialiseRockSpikeComponent } from "./components/RockSpikeProjectileComponent";
import { serialiseSlimeSpitComponent } from "./components/SlimeSpitComponent";
import { serialiseSlimewispComponent } from "./components/SlimewispComponent";
import { serialiseSnowballComponent } from "./components/SnowballComponent";
import { serialiseThrowingProjectileComponent } from "./components/ThrowingProjectileComponent";
import { serialiseTombstoneComponent } from "./components/TombstoneComponent";
import { serialiseTotemBannerComponent } from "./components/TotemBannerComponent";
import { serialiseTreeComponent } from "./entities/resources/tree";
import { serialiseTribeComponent } from "./components/TribeComponent";
import { acceptTitleOffer, rejectTitleOffer, serialiseTribeMemberComponent } from "./components/TribeMemberComponent";
import { serialiseTribesmanComponent } from "./components/TribesmanComponent";
import { serialiseTurretComponent } from "./components/TurretComponent";
import { serialiseWanderAIComponent } from "./components/WanderAIComponent";
import { serialiseYetiComponent } from "./components/YetiComponent";
import { serialiseZombieComponent } from "./components/ZombieComponent";
import SRandom from "./SRandom";
import { resetYetiTerritoryTiles } from "./entities/mobs/yeti";
import { resetComponents } from "./components/components";
import { resetPerlinNoiseCache } from "./perlin-noise";
import { serialiseAmmoBoxComponent } from "./components/AmmoBoxComponent";
import { serialiseSlimeComponent } from "./components/SlimeComponent";
import { getEntityDebugData } from "./entity-debug-data";
import { getVisiblePathfindingNodeOccupances, updateDynamicPathfindingNodes } from "./pathfinding";
import { serialiseBlueprintComponent } from "./components/BlueprintComponent";
import { serialiseTunnelComponent } from "./components/TunnelComponent";
import { serialiseBuildingMaterialComponent } from "./components/BuildingMaterialComponent";
import { serialiseSpikesComponent } from "./components/SpikesComponent";
import { serialiseTribeWarriorComponent } from "./components/TribeWarriorComponent";
import { serialiseResearchBenchComponent } from "./components/ResearchBenchComponent";
import { getVisibleTribes, getVisibleSafetyNodesData, getVisibleBuildingPlans, getVisibleBuildingSafetys, getVisibleRestrictedBuildingAreas, getVisibleWallsData, getVisibleWallConnections } from "./ai-tribe-building/ai-building-client-data";
import { placeBlueprint, throwItem } from "./entities/tribes/tribe-member";
import { updateResourceDistributions } from "./resource-distributions";
import { serialiseHealingTotemComponent } from "./components/HealingTotemComponent";
import { recruitTribesman } from "./entities/tribes/tribesman-ai/tribesman-ai";
import { serialisePlantComponent } from "./components/PlantComponent";
import { serialisePlanterBoxComponent } from "./components/PlanterBoxComponent";
import { serialiseFenceComponent } from "./components/FenceComponent";
import { serialiseFenceGateComponent } from "./components/FenceGateComponent";
import { serialiseFenceConnectionComponent } from "./components/FenceConnectionComponent";

// @Cleanup: file is way too large

const isTimed = process.argv[2] === "timed";
const averageTickTimes = new Array<number>();

/*

Reference for future self:
node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt

*/

const bundleRectangularHitboxData = (hitbox: RectangularHitbox): RectangularHitboxData => {
   return {
      mass: hitbox.mass,
      offsetX: hitbox.offsetX,
      offsetY: hitbox.offsetY,
      collisionType: hitbox.collisionType,
      localID: hitbox.localID,
      width: hitbox.width,
      height: hitbox.height,
      rotation: hitbox.relativeRotation
   };
}

const bundleCircularHitboxData = (hitbox: CircularHitbox): CircularHitboxData => {
   return {
      mass: hitbox.mass,
      offsetX: hitbox.offsetX,
      offsetY: hitbox.offsetY,
      collisionType: hitbox.collisionType,
      localID: hitbox.localID,
      radius: hitbox.radius
   };
}

const serialiseComponent = <T extends ServerComponentType>(entity: Entity, componentType: T, player: Entity | null): ComponentData => {
   switch (componentType) {
      case ServerComponentType.aiHelper: return serialiseAIHelperComponent(entity);
      case ServerComponentType.arrow: return serialiseArrowComponent(entity);
      case ServerComponentType.ammoBox: return serialiseAmmoBoxComponent(entity);
      case ServerComponentType.berryBush: return serialiseBerryBushComponent(entity);
      case ServerComponentType.blueprint: return serialiseBlueprintComponent(entity);
      case ServerComponentType.boulder: return serialiseBoulderComponent(entity);
      case ServerComponentType.cactus: return serialiseCactusComponent(entity);
      case ServerComponentType.cooking: return serialiseCookingComponent(entity);
      case ServerComponentType.cow: return serialiseCowComponent(entity);
      case ServerComponentType.door: return serialiseDoorComponent(entity);
      case ServerComponentType.escapeAI: return serialiseEscapeAIComponent(entity);
      case ServerComponentType.fish: return serialiseFishComponent(entity);
      case ServerComponentType.followAI: return serialiseFollowAIComponent(entity);
      case ServerComponentType.frozenYeti: return serialiseFrozenYetiComponent(entity);
      case ServerComponentType.golem: return serialiseGolemComponent(entity);
      case ServerComponentType.health: return serialiseHealthComponent(entity);
      case ServerComponentType.hut: return serialiseHutComponent(entity);
      case ServerComponentType.iceShard: return serialiseIceShardComponent(entity);
      case ServerComponentType.iceSpikes: return serialiseIceSpikesComponent(entity);
      case ServerComponentType.inventory: return serialiseInventoryComponent(entity);
      case ServerComponentType.inventoryUse: return serialiseInventoryUseComponent(entity);
      case ServerComponentType.item: return serialiseItemComponent(entity);
      case ServerComponentType.pebblum: return serialisePebblumComponent(entity);
      case ServerComponentType.physics: return serialisePhysicsComponent(entity);
      case ServerComponentType.player: return serialisePlayerComponent(entity);
      case ServerComponentType.researchBench: return serialiseResearchBenchComponent(entity);
      case ServerComponentType.rockSpike: return serialiseRockSpikeComponent(entity);
      case ServerComponentType.slime: return serialiseSlimeComponent(entity);
      case ServerComponentType.slimeSpit: return serialiseSlimeSpitComponent(entity);
      case ServerComponentType.slimewisp: return serialiseSlimewispComponent(entity);
      case ServerComponentType.snowball: return serialiseSnowballComponent(entity);
      case ServerComponentType.statusEffect: return serialiseStatusEffectComponent(entity);
      case ServerComponentType.throwingProjectile: return serialiseThrowingProjectileComponent(entity);
      case ServerComponentType.tombstone: return serialiseTombstoneComponent(entity);
      case ServerComponentType.totemBanner: return serialiseTotemBannerComponent(entity);
      case ServerComponentType.tree: return serialiseTreeComponent(entity);
      case ServerComponentType.tribe: return serialiseTribeComponent(entity);
      case ServerComponentType.tribeMember: return serialiseTribeMemberComponent(entity);
      case ServerComponentType.tribesman: return serialiseTribesmanComponent(entity, player);
      case ServerComponentType.turret: return serialiseTurretComponent(entity);
      case ServerComponentType.wanderAI: return serialiseWanderAIComponent(entity);
      case ServerComponentType.yeti: return serialiseYetiComponent(entity);
      case ServerComponentType.zombie: return serialiseZombieComponent(entity.id);
      case ServerComponentType.tunnel: return serialiseTunnelComponent(entity);
      case ServerComponentType.buildingMaterial: return serialiseBuildingMaterialComponent(entity);
      case ServerComponentType.spikes: return serialiseSpikesComponent(entity);
      case ServerComponentType.tribeWarrior: return serialiseTribeWarriorComponent(entity);
      case ServerComponentType.healingTotem: return serialiseHealingTotemComponent(entity);
      case ServerComponentType.planterBox: return serialisePlanterBoxComponent(entity.id);
      case ServerComponentType.plant: return serialisePlantComponent(entity);
      case ServerComponentType.fenceConnection: return serialiseFenceConnectionComponent(entity.id);
      case ServerComponentType.fence: return serialiseFenceComponent(entity.id);
      case ServerComponentType.fenceGate: return serialiseFenceGateComponent(entity.id);
      default: {
         assertUnreachable(componentType);
      }
   }
}

const serialiseEntityData = (entity: Entity, player: Entity | null): EntityData<EntityType> => {
   const circularHitboxes = new Array<CircularHitboxData>();
   const rectangularHitboxes = new Array<RectangularHitboxData>();

   for (let i = 0; i < entity.hitboxes.length; i++) {
      const hitbox = entity.hitboxes[i];
      // @Cleanup
      if (typeof (hitbox as any)["radius"] !== "undefined") {
         circularHitboxes.push(bundleCircularHitboxData(hitbox as CircularHitbox));
      } else {
         rectangularHitboxes.push(bundleRectangularHitboxData(hitbox as RectangularHitbox));
      }
   }

   const components = new Array<ComponentData>();

   const componentTypes = EntityComponents[entity.type];
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      components.push(serialiseComponent(entity, componentType, player));
   }

   return {
      id: entity.id,
      position: entity.position.package(),
      velocity: entity.velocity.package(),
      rotation: entity.rotation,
      circularHitboxes: circularHitboxes,
      rectangularHitboxes: rectangularHitboxes,
      ageTicks: entity.ageTicks,
      type: entity.type as unknown as EntityType,
      collisionBit: entity.collisionBit,
      collisionMask: entity.collisionMask,
      // @Cleanup: Is there some typescript magic we can do to avoid this evil cast
      components: components as unknown as EntityComponentsData<EntityType>
   };
}

const bundleEntityDataArray = (player: Entity | null, visibleChunkBounds: VisibleChunkBounds): Array<EntityData<EntityType>> => {
   const visibleEntities = getPlayerVisibleEntities(visibleChunkBounds);

   const entityDataArray = new Array<EntityData>();
   for (const entity of visibleEntities) {
      const entityData = serialiseEntityData(entity, player);
      entityDataArray.push(entityData);
   }

   return entityDataArray;
}

const getPlayerVisibleEntities = (chunkBounds: VisibleChunkBounds): ReadonlyArray<Entity> => {
   const entities = new Array<Entity>();
   const seenIDs = new Set<number>();
   
   for (let chunkX = chunkBounds[0]; chunkX <= chunkBounds[1]; chunkX++) {
      for (let chunkY = chunkBounds[2]; chunkY <= chunkBounds[3]; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            if (!seenIDs.has(entity.id)) {
               entities.push(entity);
               seenIDs.add(entity.id);
            }
         }
      }
   }

   return entities;
}

type ISocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

interface PlayerData {
   readonly username: string;
   readonly socket: ISocket;
   /** ID of the player's entity */
   instanceID: number;
   clientIsActive: boolean;
   visibleChunkBounds: VisibleChunkBounds;
   readonly tribe: Tribe;
   /** All hits that have occured to any entity visible to the player */
   hits: Array<HitData>;
   /** All healing done to any entity visible to the player */
   heals: Array<HealData>;
   visibleEntityDeathIDs: Array<number>;
   orbCompletes: Array<ResearchOrbCompleteData>;
   pickedUpItem: boolean;
   gameDataOptions: number;
}

const bundlePlayerTribeData = (playerData: PlayerData): PlayerTribeData => {
   return {
      name: playerData.tribe.name,
      id: playerData.tribe.id,
      tribeType: playerData.tribe.type,
      hasTotem: playerData.tribe.totem !== null,
      numHuts: playerData.tribe.getNumHuts(),
      tribesmanCap: playerData.tribe.tribesmanCap,
      area: playerData.tribe.getArea().map(tile => [tile.x, tile.y]),
      selectedTechID: playerData.tribe.selectedTechID,
      unlockedTechs: playerData.tribe.unlockedTechs,
      techTreeUnlockProgress: playerData.tribe.techTreeUnlockProgress
   };
}

const bundleEnemyTribesData = (playerData: PlayerData): ReadonlyArray<EnemyTribeData> => {
   const enemyTribesData = new Array<EnemyTribeData>();
   for (const tribe of Board.tribes) {
      if (tribe.id === playerData.tribe.id) {
         continue;
      }
      
      enemyTribesData.push({
         name: tribe.name,
         id: tribe.id,
         tribeType: tribe.type
      });
   }
   return enemyTribesData;
}

// @Cleanup: name
const snapRotationToPlayer = (player: Entity, placePosition: Point, rotation: number): number => {
   const playerDirection = player.position.calculateAngleBetween(placePosition);
   let snapRotation = playerDirection - rotation;

   // Snap to nearest PI/2 interval
   snapRotation = Math.round(snapRotation / Math.PI*2) * Math.PI/2;

   snapRotation += rotation;
   return snapRotation;
}

const createNewPlayerInventories = (): PlayerInventoryData => {
   return {
      hotbar: new Inventory(Settings.INITIAL_PLAYER_HOTBAR_SIZE, 1, InventoryName.hotbar),
      backpackInventory: new Inventory(0, 0, InventoryName.backpack),
      backpackSlot: new Inventory(1, 1, InventoryName.backpackSlot),
      heldItemSlot: new Inventory(1, 1, InventoryName.heldItemSlot),
      craftingOutputItemSlot: new Inventory(1, 1, InventoryName.craftingOutputSlot),
      armourSlot: new Inventory(1, 1, InventoryName.armourSlot),
      offhand: new Inventory(1, 1, InventoryName.offhand),
      gloveSlot: new Inventory(1, 1, InventoryName.gloveSlot)
   }
}

// @Cleanup: Remove class, just have functions
/** Communicates between the server and players */
class GameServer {
   /** Minimum number of units away from the border that the player will spawn at */
   private static readonly PLAYER_SPAWN_POSITION_PADDING = 100;

   private io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | null = null;

   private readonly playerDataRecord: Partial<Record<string, PlayerData>> = {};

   private tickInterval: NodeJS.Timeout | undefined;

   private trackedEntityID: number | null = null;

   public isRunning = false;

   private nextTickTime = 0;
   
   /** Sets up the various stuff */
   public setup() {
      updateResourceDistributions();
      spawnInitialEntities();
      forceMaxGrowAllIceSpikes();
   }

   public setTrackedGameObject(id: number | null): void {
      SERVER.trackedEntityID = id;
   }

   public async start(): Promise<void> {
      if (!isTimed) {
         // Seed the random number generator
         if (OPTIONS.inBenchmarkMode) {
            SRandom.seed(40404040404);
         } else {
            SRandom.seed(randInt(0, 9999999999));
         }

         Board.setup();
         SERVER.setup();
      }
      
      if (SERVER.io === null) {
         // Start the server
         // SERVER.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(Settings.SERVER_PORT);
         SERVER.io = new Server(Settings.SERVER_PORT);
         SERVER.handlePlayerConnections();
         console.log("Server started on port " + Settings.SERVER_PORT);
      }

      SERVER.isRunning = true;
      
      if (isTimed) {
         if (typeof global.gc === "undefined") {
            throw new Error("GC function is undefined! Most likely need to pass in the '--expose-gc' flag.");
         }

         Math.random = () => SRandom.next();

         let j = 0;
         for (;;) {
            // Collect garbage from previous run
            for (let i = 0; i < 10; i++) {
               global.gc();
            }
            
            // Reset the board state
            Board.reset();
            resetYetiTerritoryTiles();
            resetCensus();
            resetComponents();
            resetPerlinNoiseCache();

            // Seed the random number generator
            if (OPTIONS.inBenchmarkMode) {
               SRandom.seed(40404040404);
            } else {
               SRandom.seed(randInt(0, 9999999999));
            }
            
            Board.setup();
            SERVER.setup();

            // Warm up the JIT
            for (let i = 0; i < 50; i++) {
               SERVER.tick();
            }
            
            // @Bug: When at 5000, the average tps starts at around 1.8, while at 1000 it starts at .6
            const numTicks = 1000;
            
            const startTime = performance.now();

            const a = [];
            let l = startTime;
            for (let i = 0; i < numTicks; i++) {
               SERVER.tick();
               const n = performance.now();
               a.push(n - l);
               l = n;
            }

            const timeElapsed = performance.now() - startTime;
            const averageTickTimeMS = timeElapsed / numTicks;
            averageTickTimes.push(averageTickTimeMS);
            console.log("(#" + (j + 1) + ") Average tick MS: " + averageTickTimeMS);
            console.log(Math.min(...a), Math.max(...a));
            j++;
         }
      }

      if (typeof SERVER.tickInterval === "undefined") {
         while (SERVER.isRunning) {
            await SERVER.tick();
         }
      }
   }

   public stop(): void {
      if (typeof SERVER.tickInterval !== "undefined") {
         clearInterval(SERVER.tickInterval);
         SERVER.tickInterval = undefined;
      }

      this.io?.close();
   }

   private async tick(): Promise<void> {
      // These are done before each tick to account for player packets causing entities to be removed/added between ticks.
      Board.pushJoinBuffer();
      Board.removeFlaggedEntities();
      Board.updateTribes();
      
      Board.spreadGrass();

      Board.updateEntities();
      updateDynamicPathfindingNodes();
      Board.resolveEntityCollisions();

      runSpawnAttempt();
      
      Board.pushJoinBuffer();
      Board.removeFlaggedEntities();
      Board.updateTribes();

      if (!isTimed) {
         await SERVER.sendGameDataPackets();
      }

      // Update server ticks and time
      // This is done at the end of the tick so that information sent by players is associated with the next tick to run
      Board.ticks++;
      Board.time += Settings.TIME_PASS_RATE / Settings.TPS / 3600;
      if (Board.time >= 24) {
         Board.time -= 24;
      }

      if (Board.ticks % Settings.TPS === 0) {
         updateResourceDistributions();
      }
   }

   private getPlayerInstance(data: PlayerData): Entity | null {
      const player = Board.entityRecord[data.instanceID];
      if (typeof player !== "undefined") {
         return player;
      }
      return null;
   }

   public getPlayerFromUsername(username: string): Entity | null {
      for (const data of Object.values(SERVER.playerDataRecord)) {
         if (typeof data !== "undefined" && data.username === username) {
            // Found the player!
            return this.getPlayerInstance(data);
         }
      }

      return null;
   }

   public getPlayerDataFromInstance(instance: Entity): PlayerData | null {
      for (const data of Object.values(SERVER.playerDataRecord)) {
         if (typeof data !== "undefined" && data.instanceID === instance.id) {
            // Found the player!
            return data;
         }
      }

      return null;
   }

   private handlePlayerConnections(): void {
      if (SERVER.io === null) return;
      SERVER.io.on("connection", (socket: ISocket) => {
         let username: string;
         let tribeType: TribeType;
         let visibleChunkBounds: VisibleChunkBounds;
         let spawnPosition: Point;

         // @Temporary
         // setTimeout(() => {
         //    if(1+1===2)return;
         //    const p = this.getPlayerFromUsername(username)!;
         //    const tc = TribeComponentArray.getComponent(p.id);
         //    const tribe = tc.tribe;

         //    createTribeWarrior(new Point(spawnPosition.x - 100, spawnPosition.y), tribe, 0);
         // }, 3000);
         
         // @Temporary
         
         // setTimeout(() => {
         //    createTribeWorker(new Point(spawnPosition.x + 500, spawnPosition.y + 150), -1, 0);
         // }, 5000);
         
         // setTimeout(() => {
         //    if(1+1===2)return;
         //    // const p = this.getPlayerFromUsername(username)!;
         //    // const tc = TribeComponentArray.getComponent(p.id);
         //    // const tribe = tc.tribe;
            
         //    const TRIB = new Tribe(TribeType.goblins, true);

         //    createTribeTotem(new Point(spawnPosition.x + 500, spawnPosition.y), 0, TRIB);

         //    const h1 = createWorkerHut(new Point(spawnPosition.x + 380, spawnPosition.y + 50), Math.PI * 1.27, TRIB);
         //    const h2 = createWorkerHut(new Point(spawnPosition.x + 547, spawnPosition.y - 100), Math.PI * 2.87, TRIB);
         //    const h3 = createWorkerHut(new Point(spawnPosition.x + 600, spawnPosition.y + 65), 0.7, TRIB);
         //    const h4 = createWorkerHut(new Point(spawnPosition.x + 700, spawnPosition.y - 65), -0.7, TRIB);
         //    const h5 = createWorkerHut(new Point(spawnPosition.x + 320, spawnPosition.y + 100), -Math.PI*0.4, TRIB);

         //    const w1 = createTribeWorker(h1.position.copy(), TRIB.id, h1.id);
         //    const w2 = createTribeWorker(h2.position.copy(), TRIB.id, h2.id);
         //    const w3 = createTribeWorker(h3.position.copy(), TRIB.id, h3.id);
         //    const w4 = createTribeWorker(h4.position.copy(), TRIB.id, h4.id);
         //    const w5 = createTribeWorker(h5.position.copy(), TRIB.id, h5.id);

         //    // setTimeout(() => {
         //    //    damageEntity(w1, 9999, null, 0);
         //    //    damageEntity(w2, 9999, null, 0);
         //    //    damageEntity(w3, 9999, null, 0);
         //    //    damageEntity(w4, 9999, null, 0);
         //    // }, 100);

         //    createWorkbench(new Point(spawnPosition.x + 520, spawnPosition.y + 230), 0.8, TRIB);
         //    // createTree(new Point(spawnPosition.x, spawnPosition.y + 200), 0, tribe);
         //    // createWall(new Point(spawnPosition.x + 64, spawnPosition.y + 200), 0, TRIB);
         //    createBarrel(new Point(spawnPosition.x + 350, spawnPosition.y - 130), 0, TRIB);
         //    // createDoor(new Point(spawnPosition.x, spawnPosition.y + 200), 0, TRIB, BuildingMaterial.wood);

         //    // setTimeout(() => {
         //    //    const TRIB = new Tribe(TribeType.frostlings, true);
         //    //    createTribeWorker(new Point(spawnPosition.x + 700, spawnPosition.y), TRIB.id, 0);
         //    // }, 3500);
         // }, 4000);


         socket.on("initial_player_data", (_username: string, _tribeType: TribeType) => {
            username = _username;
            tribeType = _tribeType;
         });

         socket.on("spawn_position_request", () => {
            // Spawn the player in a random position in the world
            spawnPosition = SERVER.generatePlayerSpawnPosition(tribeType);
            socket.emit("spawn_position", spawnPosition.package());
         });

         socket.on("visible_chunk_bounds", (_visibleChunkBounds: VisibleChunkBounds) => {
            visibleChunkBounds = _visibleChunkBounds;
         });

         // When the server receives a request for the initial player data, process it and send back the server player data
         socket.on("initial_game_data_request", () => {
            if (typeof username === "undefined") {
               throw new Error("Player username was undefined when trying to send initial game data.");
            }
            if (typeof visibleChunkBounds === "undefined") {
               throw new Error("Player visible chunk bounds was undefined when trying to send initial game data.");
            }
            
            const tribe = new Tribe(tribeType, false);
            const player = createPlayer(spawnPosition, tribe);

            const playerData: PlayerData = {
               username: username,
               socket: socket,
               instanceID: player.id,
               clientIsActive: true,
               visibleChunkBounds: visibleChunkBounds,
               tribe: tribe,
               hits: [],
               heals: [],
               visibleEntityDeathIDs: [],
               orbCompletes: [],
               pickedUpItem: false,
               gameDataOptions: 0
            }
            playerData.instanceID = player.id;

            const serverTileData = new Array<ServerTileData>();
            for (let tileIndex = 0; tileIndex < Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS; tileIndex++) {
               const tile = Board.tiles[tileIndex];
               serverTileData.push({
                  x: tile.x,
                  y: tile.y,
                  type: tile.type,
                  biome: tile.biome,
                  isWall: tile.isWall
               });
            }

            const edgeTileData = new Array<ServerTileData>();
            for (let i = 0; i < Board.edgeTiles.length; i++) {
               const tile = Board.edgeTiles[i];
               edgeTileData.push({
                  x: tile.x,
                  y: tile.y,
                  type: tile.type,
                  biome: tile.biome,
                  isWall: tile.isWall
               });
            }

            const initialGameDataPacket: InitialGameDataPacket = {
               playerID: player.id,
               tiles: serverTileData,
               waterRocks: Board.waterRocks,
               riverSteppingStones: Board.riverSteppingStones,
               riverFlowDirections: Board.getRiverFlowDirections(),
               edgeTiles: edgeTileData,
               edgeRiverFlowDirections: Board.edgeRiverFlowDirections,
               edgeRiverSteppingStones: Board.edgeRiverSteppingStones,
               grassInfo: Board.grassInfo,
               decorations: Board.decorations,
               entityDataArray: bundleEntityDataArray(player, playerData.visibleChunkBounds),
               hits: [],
               heals: [],
               visibleEntityDeathIDs: [],
               orbCompletes: [],
               inventory: createNewPlayerInventories(),
               tileUpdates: [],
               serverTicks: Board.ticks,
               serverTime: Board.time,
               playerHealth: 20,
               playerTribeData: bundlePlayerTribeData(playerData),
               enemyTribesData: bundleEnemyTribesData(playerData),
               hasFrostShield: false,
               pickedUpItem: false,
               hotbarCrossbowLoadProgressRecord: {},
               titleOffer: null,
               visiblePathfindingNodeOccupances: [],
               visibleSafetyNodes: [],
               visibleBuildingPlans: [],
               visibleBuildingSafetys: [],
               visibleRestrictedBuildingAreas: [],
               visibleWalls: [],
               visibleWallConnections: []
            };

            SERVER.playerDataRecord[socket.id] = playerData;

            socket.emit("initial_game_data_packet", initialGameDataPacket);
         });

         // Handle player disconnects
         socket.on("disconnect", () => {
            SERVER.handlePlayerDisconnect(socket);
         });

         socket.on("deactivate", () => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               playerData.clientIsActive = false;
            }
         });

         socket.on("activate", () => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               playerData.clientIsActive = true;

               SERVER.sendGameDataSyncPacket(socket);
            }
         });

         socket.on("player_data_packet", (playerDataPacket: PlayerDataPacket) => {
            SERVER.processPlayerDataPacket(socket, playerDataPacket);
         });

         socket.on("attack_packet", (attackPacket: AttackPacket) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  processPlayerAttackPacket(player, attackPacket);
               }
            }
         });

         socket.on("crafting_packet", (recipeIndex: number) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  processPlayerCraftingPacket(player, recipeIndex);
               }
            }
         });

         socket.on("item_pickup", (entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  processItemPickupPacket(player, entityID, inventoryName, itemSlot, amount);
               }
            }
         });

         socket.on("item_release", (entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  processItemReleasePacket(player, entityID, inventoryName, itemSlot, amount);
               }
            }
         });

         socket.on("item_use_packet", (itemSlot: number) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  processItemUsePacket(player, itemSlot);
               }
            }
         });

         socket.on("held_item_drop", (dropAmount: number, throwDirection: number) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  throwItem(player, InventoryName.heldItemSlot, 1, dropAmount, throwDirection);
               }
            }
         });

         socket.on("item_drop", (itemSlot: number, dropAmount: number, throwDirection: number) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  throwItem(player, InventoryName.hotbar, itemSlot, dropAmount, throwDirection);
               }
            }
         });

         socket.on("respawn", () => {
            SERVER.respawnPlayer(socket);
         });
         
         socket.on("command", (command: string) => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  registerCommand(command, player);
               }
            }
         });

         socket.on("track_game_object", (id: number | null): void => {
            SERVER.setTrackedGameObject(id);
         });

         socket.on("select_tech", (techID: TechID): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               playerData.tribe.selectedTechID = techID;
            }
         });

         socket.on("unlock_tech", (techID: TechID): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               const player = this.getPlayerInstance(playerData);
               if (player !== null) {
                  processTechUnlock(player, techID);
               }
            }
         });

         socket.on("force_unlock_tech", (techID: TechID): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData !== "undefined") {
               playerData.tribe.unlockTech(techID);
            }
         })

         socket.on("study_tech", (studyAmount: number): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }

            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               const tribeComponent = TribeComponentArray.getComponent(player.id);
               
               if (tribeComponent.tribe.selectedTechID !== null) {
                  const selectedTech = getTechByID(tribeComponent.tribe.selectedTechID);
                  playerData.tribe.studyTech(selectedTech, player.position.x, player.position.y, studyAmount);
               }
            }
         });

         socket.on("place_blueprint", (structureID: number, buildingType: BlueprintType): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }
            
            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               const building = Board.entityRecord[structureID]!;
               const rotation = snapRotationToPlayer(player, building.position, building.rotation);
               placeBlueprint(player, structureID, buildingType, rotation);
            };
         });

         socket.on("modify_building", (structureID: number, data: number): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }
            
            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               modifyBuilding(player, structureID, data);
            };
         });

         socket.on("deconstruct_building", (structureID: number): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }

            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               deconstructBuilding(structureID);
            };
         });

         socket.on("structure_interact", (structureID: number, interactData: number): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }
            
            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               interactWithStructure(player, structureID, interactData);
            };
         });

         socket.on("structure_uninteract", (structureID: number): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }
            
            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               uninteractWithStructure(player, structureID);
            };
         });

         socket.on("recruit_tribesman", (tribesmanID: number): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }
            
            const player = this.getPlayerInstance(playerData);
            if (player === null) {
               return;
            };

            const tribesman = Board.entityRecord[tribesmanID];
            if (typeof tribesman === "undefined") {
               return;
            }

            const tribesmanComponent = TribesmanComponentArray.getComponent(tribesmanID);
            const relation = tribesmanComponent.tribesmanRelations[player.id];
            if (typeof relation !== "undefined" && relation >= 50) {
               const tribeComponent = TribeComponentArray.getComponent(player.id);
               
               recruitTribesman(tribesman, tribeComponent.tribe);
            }
         });

         socket.on("respond_to_title_offer", (title: TribesmanTitle, isAccepted: boolean): void => {
            const playerData = SERVER.playerDataRecord[socket.id];
            if (typeof playerData === "undefined") {
               return;
            }
            
            const player = this.getPlayerInstance(playerData);
            if (player !== null) {
               if (isAccepted) {
                  acceptTitleOffer(player, title);
               } else {
                  rejectTitleOffer(player, title);
               }
            };
         })
      });
   }

   private bundleHotbarCrossbowLoadProgressRecord(player: Entity | null): Partial<Record<number, number>> {
      if (player === null) {
         return {};
      }
      
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
      const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);

      return useInfo.crossbowLoadProgressRecord;
   }

   /** Send data about the server to all players */
   public async sendGameDataPackets(): Promise<void> {
      if (SERVER.io === null) return;
      
      return new Promise(async resolve => {
         const currentTime = performance.now();
         while (this.nextTickTime < currentTime) {
            this.nextTickTime += 1000 * Settings.I_TPS;
         }
         
         // @Speed: use while loop instead maybe?
         await (() => {
            return new Promise<void>(resolve => {
               // console.log(currentTime, this.nextTickTime, OPTIONS.warp ? 2 : this.nextTickTime - currentTime);
               setTimeout(() => {
                  resolve();
               }, OPTIONS.warp ? 2 : this.nextTickTime - currentTime);
            })
         })();

         // setTimeout(() => {
            if (SERVER.trackedEntityID !== null && typeof Board.entityRecord[SERVER.trackedEntityID] === "undefined") {
               SERVER.trackedEntityID = null;
            }
   
            let entityDebugData: EntityDebugData | undefined;
            if (SERVER.trackedEntityID !== null) {
               const entity = Board.entityRecord[SERVER.trackedEntityID]!;
               entityDebugData = getEntityDebugData(entity);
            }
   
            for (const playerData of Object.values(SERVER.playerDataRecord)) {
               if (typeof playerData === "undefined" || !playerData.clientIsActive) {
                  continue;
               }
               
               const player = this.getPlayerInstance(playerData);
   
               const tileUpdates = Board.popTileUpdates();
               
               // @Speed @Memory
               const extendedVisibleChunkBounds: VisibleChunkBounds = [
                  Math.max(playerData.visibleChunkBounds[0] - 1, 0),
                  Math.min(playerData.visibleChunkBounds[1] + 1, Settings.BOARD_SIZE - 1),
                  Math.max(playerData.visibleChunkBounds[2] - 1, 0),
                  Math.min(playerData.visibleChunkBounds[3] + 1, Settings.BOARD_SIZE - 1)
               ];
   
               // @Incomplete
               // const playerArmour = player !== null ? getItem(InventoryComponentArray.getComponent(player.id), "armourSlot", 1) : null;

               const visibleTribes = getVisibleTribes(extendedVisibleChunkBounds);
   
               // Initialise the game data packet
               const gameDataPacket: GameDataPacket = {
                  entityDataArray: bundleEntityDataArray(player, extendedVisibleChunkBounds),
                  inventory: this.bundlePlayerInventoryData(player),
                  hits: playerData.hits,
                  heals: playerData.heals,
                  visibleEntityDeathIDs: playerData.visibleEntityDeathIDs,
                  orbCompletes: playerData.orbCompletes,
                  tileUpdates: tileUpdates,
                  serverTicks: Board.ticks,
                  serverTime: Board.time,
                  playerHealth: player !== null ? HealthComponentArray.getComponent(player.id).health : 0,
                  entityDebugData: entityDebugData,
                  playerTribeData: bundlePlayerTribeData(playerData),
                  enemyTribesData: bundleEnemyTribesData(playerData),
                  // @Incomplete
                  // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,
                  hasFrostShield: false,
                  pickedUpItem: playerData.pickedUpItem,
                  hotbarCrossbowLoadProgressRecord: this.bundleHotbarCrossbowLoadProgressRecord(player),
                  titleOffer: player !== null ? PlayerComponentArray.getComponent(player.id).titleOffer : null,
                  // @Cleanup: Copy and paste
                  visiblePathfindingNodeOccupances: (playerData.gameDataOptions & GameDataPacketOptions.sendVisiblePathfindingNodeOccupances) ? getVisiblePathfindingNodeOccupances(extendedVisibleChunkBounds) : [],
                  visibleSafetyNodes: (playerData.gameDataOptions & GameDataPacketOptions.sendVisibleSafetyNodes) ? getVisibleSafetyNodesData(visibleTribes, extendedVisibleChunkBounds) : [],
                  visibleBuildingPlans: (playerData.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingPlans) ? getVisibleBuildingPlans(visibleTribes, extendedVisibleChunkBounds) : [],
                  visibleBuildingSafetys: (playerData.gameDataOptions & GameDataPacketOptions.sendVisibleBuildingSafetys) ? getVisibleBuildingSafetys(visibleTribes, extendedVisibleChunkBounds) : [],
                  visibleRestrictedBuildingAreas: (playerData.gameDataOptions & GameDataPacketOptions.sendVisibleRestrictedBuildingAreas) ? getVisibleRestrictedBuildingAreas(visibleTribes, extendedVisibleChunkBounds) : [],
                  visibleWalls: getVisibleWallsData(visibleTribes, extendedVisibleChunkBounds),
                  visibleWallConnections: (playerData.gameDataOptions & GameDataPacketOptions.sendVisibleWallConnections) ? getVisibleWallConnections(visibleTribes, extendedVisibleChunkBounds) : []
               };
   
               // Send the game data to the player
               playerData.socket.emit("game_data_packet", gameDataPacket);
   
               playerData.hits = [];
               playerData.heals = [];
               playerData.orbCompletes = [];
               playerData.pickedUpItem = false;
            }

            // console.log(performance.now());

            resolve();
         // }, this.nextTickTime - currentTime);
      });
   }

   public registerEntityHit(hitData: HitData): void {
      // @Incomplete: Consider all chunks the entity is in instead of just the one at its position
      
      // @Cleanup: copy and paste
      const chunkX = Math.floor(hitData.entityPositionX / Settings.CHUNK_UNITS);
      const chunkY = Math.floor(hitData.entityPositionY / Settings.CHUNK_UNITS);
      for (const playerData of Object.values(this.playerDataRecord)) {
         if (typeof playerData === "undefined") {
            continue;
         }
         
         if (chunkX >= playerData.visibleChunkBounds[0] && chunkX <= playerData.visibleChunkBounds[1] && chunkY >= playerData.visibleChunkBounds[2] && chunkY <= playerData.visibleChunkBounds[3]) {
            playerData.hits.push(hitData);
         }
      }
   }

   public registerEntityHeal(healData: HealData): void {
      // @Incomplete: Consider all chunks the entity is in instead of just the one at its position
      
      // @Cleanup: copy and paste
      const chunkX = Math.floor(healData.entityPositionX / Settings.CHUNK_UNITS);
      const chunkY = Math.floor(healData.entityPositionY / Settings.CHUNK_UNITS);
      for (const playerData of Object.values(this.playerDataRecord)) {
         if (typeof playerData === "undefined") {
            continue;
         }
         
         if (chunkX >= playerData.visibleChunkBounds[0] && chunkX <= playerData.visibleChunkBounds[1] && chunkY >= playerData.visibleChunkBounds[2] && chunkY <= playerData.visibleChunkBounds[3]) {
            playerData.heals.push(healData);
         }
      }
   }

   public registerEntityDeath(entityX: number, entityY: number, entityID: number): void {
      // @Incomplete: Consider all chunks the entity is in instead of just the one at its position
      
      // @Cleanup: copy and paste
      const chunkX = Math.floor(entityX / Settings.CHUNK_UNITS);
      const chunkY = Math.floor(entityY / Settings.CHUNK_UNITS);
      for (const playerData of Object.values(this.playerDataRecord)) {
         if (typeof playerData === "undefined") {
            continue;
         }
         
         if (chunkX >= playerData.visibleChunkBounds[0] && chunkX <= playerData.visibleChunkBounds[1] && chunkY >= playerData.visibleChunkBounds[2] && chunkY <= playerData.visibleChunkBounds[3]) {
            playerData.visibleEntityDeathIDs.push(entityID);
         }
      }
   }

   public registerResearchOrbComplete(orbCompleteData: ResearchOrbCompleteData): void {
      // @Incomplete: Consider all chunks the entity is in instead of just the one at its position
      
      const chunkX = Math.floor(orbCompleteData.x / Settings.CHUNK_UNITS);
      const chunkY = Math.floor(orbCompleteData.y / Settings.CHUNK_UNITS);
      for (const playerData of Object.values(this.playerDataRecord)) {
         if (typeof playerData === "undefined") {
            continue;
         }
         
         if (chunkX >= playerData.visibleChunkBounds[0] && chunkX <= playerData.visibleChunkBounds[1] && chunkY >= playerData.visibleChunkBounds[2] && chunkY <= playerData.visibleChunkBounds[3]) {
            playerData.orbCompletes.push(orbCompleteData);
         }
      }
   }

   public registerPlayerDroppedItemPickup(player: Entity): void {
      for (const playerData of Object.values(this.playerDataRecord)) {
         if (typeof playerData === "undefined") {
            continue;
         }
         
         if (playerData.instanceID === player.id) {
            playerData.pickedUpItem = true;
            
            return;
         }
      }

      console.warn("Couldn't find player to pickup item!");
   }

   private bundlePlayerInventoryData(player: Entity | null): PlayerInventoryData {
      if (player === null) {
         return createNewPlayerInventories();
      }

      const inventoryComponent = InventoryComponentArray.getComponent(player.id);

      return {
         hotbar: getInventory(inventoryComponent, InventoryName.hotbar),
         backpackInventory: getInventory(inventoryComponent, InventoryName.backpack),
         backpackSlot: getInventory(inventoryComponent, InventoryName.backpackSlot),
         heldItemSlot: getInventory(inventoryComponent, InventoryName.heldItemSlot),
         craftingOutputItemSlot: getInventory(inventoryComponent, InventoryName.craftingOutputSlot),
         armourSlot: getInventory(inventoryComponent, InventoryName.armourSlot),
         offhand: getInventory(inventoryComponent, InventoryName.offhand),
         gloveSlot: getInventory(inventoryComponent, InventoryName.gloveSlot)
      };
   }

   private handlePlayerDisconnect(socket: ISocket): void {
      const playerData = SERVER.playerDataRecord[socket.id];
      if (typeof playerData !== "undefined") {
         const player = this.getPlayerInstance(playerData);
         if (player !== null) {
            player.remove();
         }

         delete SERVER.playerDataRecord[socket.id];
      }
   }

   private sendGameDataSyncPacket(socket: ISocket): void {
      const playerData = SERVER.playerDataRecord[socket.id];
      if (typeof playerData !== "undefined") {
         const player = this.getPlayerInstance(playerData);
         if (player === null) {
            // If the player is dead, send a default packet
            socket.emit("game_data_sync_packet", {
               position: [0, 0],
               velocity: [0, 0],
               acceleration: [0, 0],
               rotation: 0,
               health: 0,
               inventory: SERVER.bundlePlayerInventoryData(player)
            });
            return;
         }

         const packet: GameDataSyncPacket = {
            position: player.position.package(),
            velocity: player.velocity.package(),
            acceleration: player.acceleration.package(),
            rotation: player.rotation,
            health: HealthComponentArray.getComponent(player.id).health,
            inventory: SERVER.bundlePlayerInventoryData(player)
         };

         socket.emit("game_data_sync_packet", packet);
      }
   }

   private processPlayerDataPacket(socket: ISocket, playerDataPacket: PlayerDataPacket): void {
      const playerData = SERVER.playerDataRecord[socket.id];
      if (typeof playerData === "undefined") {
         return;
      }
      
      const player = this.getPlayerInstance(playerData);
      if (player === null) {
         return;
      }

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
      const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);

      player.position.x = playerDataPacket.position[0];
      player.position.y = playerDataPacket.position[1];
      player.velocity = Point.unpackage(playerDataPacket.velocity);
      player.acceleration = Point.unpackage(playerDataPacket.acceleration);
      player.rotation = playerDataPacket.rotation;

      playerData.visibleChunkBounds = playerDataPacket.visibleChunkBounds;
      playerData.gameDataOptions = playerDataPacket.gameDataOptions;
      
      const physicsComponent = PhysicsComponentArray.getComponent(player.id);
      physicsComponent.hitboxesAreDirty = true;
      
      hotbarUseInfo.selectedItemSlot = playerDataPacket.selectedItemSlot;

      const playerComponent = PlayerComponentArray.getComponent(player.id);
      playerComponent.interactingEntityID = playerDataPacket.interactingEntityID !== null ? playerDataPacket.interactingEntityID : 0;

      // @Bug: won't work for using medicine in offhand
      let overrideOffhand = false;
      
      if ((playerDataPacket.mainAction === LimbAction.eat || playerDataPacket.mainAction === LimbAction.useMedicine) && (hotbarUseInfo.action !== LimbAction.eat && hotbarUseInfo.action !== LimbAction.useMedicine)) {
         overrideOffhand = startEating(player, InventoryName.hotbar);
      } else if (playerDataPacket.mainAction === LimbAction.chargeBow && hotbarUseInfo.action !== LimbAction.chargeBow) {
         startChargingBow(player, InventoryName.hotbar);
      } else if (playerDataPacket.mainAction === LimbAction.chargeSpear && hotbarUseInfo.action !== LimbAction.chargeSpear) {
         startChargingSpear(player, InventoryName.hotbar);
      } else if (playerDataPacket.mainAction === LimbAction.chargeBattleaxe && hotbarUseInfo.action !== LimbAction.chargeBattleaxe) {
         startChargingBattleaxe(player, InventoryName.hotbar);
      } else {
         hotbarUseInfo.action = playerDataPacket.mainAction;
      }

      if (!overrideOffhand) {
         const tribeComponent = TribeComponentArray.getComponent(player.id);
         if (tribeComponent.tribe.type === TribeType.barbarians) {
            const offhandUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.offhand);
   
            if ((playerDataPacket.offhandAction === LimbAction.eat || playerDataPacket.offhandAction === LimbAction.useMedicine) && (offhandUseInfo.action !== LimbAction.eat && offhandUseInfo.action !== LimbAction.useMedicine)) {
               startEating(player, InventoryName.offhand);
            } else if (playerDataPacket.offhandAction === LimbAction.chargeBow && offhandUseInfo.action !== LimbAction.chargeBow) {
               startChargingBow(player, InventoryName.offhand);
            } else if (playerDataPacket.offhandAction === LimbAction.chargeSpear && offhandUseInfo.action !== LimbAction.chargeSpear) {
               startChargingSpear(player, InventoryName.offhand);
            } else if (playerDataPacket.offhandAction === LimbAction.chargeBattleaxe && offhandUseInfo.action !== LimbAction.chargeBattleaxe) {
               startChargingBattleaxe(player, InventoryName.offhand);
            } else {
               offhandUseInfo.action = playerDataPacket.offhandAction;
            }
         }
      }
   }

   private generatePlayerSpawnPosition(tribeType: TribeType): Point {
      const tribeInfo = TRIBE_INFO_RECORD[tribeType];
      for (let numAttempts = 0; numAttempts < 50; numAttempts++) {
         const biomeName = randItem(tribeInfo.biomes);
         const biomeTiles = getTilesOfBiome(biomeName);
         if (biomeTiles.length === 0) {
            continue;
         }

         const tile = randItem(biomeTiles);

         // @Temporary
         // const x = (tile.x + Math.random()) * Settings.TILE_SIZE;
         // const y = (tile.y + Math.random()) * Settings.TILE_SIZE;
         const x = (tile.x + 0.5) * Settings.TILE_SIZE + 6;
         const y = (tile.y + 0.5) * Settings.TILE_SIZE + 6;

         if (x < GameServer.PLAYER_SPAWN_POSITION_PADDING || x >= Settings.BOARD_UNITS - GameServer.PLAYER_SPAWN_POSITION_PADDING || y < GameServer.PLAYER_SPAWN_POSITION_PADDING || y >= Settings.BOARD_UNITS - GameServer.PLAYER_SPAWN_POSITION_PADDING) {
            continue;
         }

         return new Point(x, y);
      }
      
      // If all else fails, just pick a random position
      const x = randInt(GameServer.PLAYER_SPAWN_POSITION_PADDING, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - GameServer.PLAYER_SPAWN_POSITION_PADDING);
      const y = randInt(GameServer.PLAYER_SPAWN_POSITION_PADDING, Settings.BOARD_DIMENSIONS * Settings.TILE_SIZE - GameServer.PLAYER_SPAWN_POSITION_PADDING);
      return new Point(x, y);
   }

   private respawnPlayer(socket: ISocket): void {
      const playerData = SERVER.playerDataRecord[socket.id];
      if (typeof playerData === "undefined") {
         return;
      }

      // Calculate spawn position
      let spawnPosition: Point;
      if (playerData.tribe.totem !== null) {
         spawnPosition = playerData.tribe.totem.position.copy();
         const offsetDirection = 2 * Math.PI * Math.random();
         spawnPosition.x += 100 * Math.sin(offsetDirection);
         spawnPosition.y += 100 * Math.cos(offsetDirection);
      } else {
         spawnPosition = this.generatePlayerSpawnPosition(playerData.tribe.type);
      }

      const player = createPlayer(spawnPosition, playerData.tribe);
      playerData.instanceID = player.id;

      const dataPacket: RespawnDataPacket = {
         playerID: player.id,
         spawnPosition: spawnPosition.package()
      };

      socket.emit("respawn_data_packet", dataPacket);
   }

   public sendForcePositionUpdatePacket(player: Entity, position: Point): void {
      const playerData = SERVER.getPlayerDataFromInstance(player);
      if (playerData === null) {
         return;
      }
      
      playerData.socket.emit("force_position_update", position.package());
   }
}

export const SERVER = new GameServer();

// Only start the server if jest isn't running
if (process.env.NODE_ENV !== "test") {
   SERVER.start();
}