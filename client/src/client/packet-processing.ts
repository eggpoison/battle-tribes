import { ServerTileData, WaterRockData, RiverSteppingStoneData, GrassTileInfo, DecorationInfo, RiverFlowDirectionsRecord, WaterRockSize, RiverSteppingStoneSize, DecorationType, GameDataPacket, EntityData, StatusEffectData, CircularHitboxData, RectangularHitboxData, HitData, PlayerKnockbackData, HealData, ResearchOrbCompleteData, ServerTileUpdateData, DebugData, EntityDebugData, LineDebugData, CircleDebugData, TileHighlightData, PathData, PathfindingNodeIndex, PlayerInventoryData } from "webgl-test-shared/dist/client-server-types";
import { AIHelperComponentData, AmmoBoxComponentData, BerryBushComponentData, BlueprintComponentData, BoulderComponentData, BuildingMaterialComponentData, CactusComponentData, ComponentData, CookingComponentData, CowComponentData, CraftingStationComponentData, DoorComponentData, EscapeAIComponentData, FenceComponentData, FenceGateComponentData, FishComponentData, FollowAIComponentData, FrozenYetiComponentData, GolemComponentData, HealingTotemComponentData, HealingTotemTargetData, HealthComponentData, HutComponentData, IceShardComponentData, IceSpikesComponentData, InventoryComponentData, InventoryUseComponentData, ItemComponentData, LayeredRodComponentData, PebblumComponentData, PhysicsComponentData, PlantComponentData, PlanterBoxComponentData, PlayerComponentData, ProjectileComponentData, ResearchBenchComponentData, RockSpikeProjectileComponentData, ScarInfo, ServerComponentType, SlimeComponentData, SlimeSpitComponentData, SlimewispComponentData, SnowballComponentData, SpikesComponentData, StatusEffectComponentData, StructureComponentData, ThrowingProjectileComponentData, TombstoneComponentData, TotemBannerComponentData, TransformComponentData, TreeComponentData, TribeComponentData, TribeMemberComponentData, TribesmanAIComponentData, TribeWarriorComponentData, TunnelComponentData, TurretComponentData, WanderAIComponentData, YetiComponentData, ZombieComponentData } from "webgl-test-shared/dist/components";
import { CactusBodyFlowerData, CactusLimbData, CactusLimbFlowerData, DeathInfo, EntityID, EntityType, FishColour, PlayerCauseOfDeath, SlimeSize, SnowballSize, TribeTotemBanner } from "webgl-test-shared/dist/entities";
import { Inventory, InventoryName, Item, ItemType } from "webgl-test-shared/dist/items/items";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { Settings } from "webgl-test-shared/dist/settings";
import { Biome, TileType } from "webgl-test-shared/dist/tiles";
import { LimbInfo } from "../entity-components/InventoryUseComponent";
import { Point } from "webgl-test-shared/dist/utils";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { TitleGenerationInfo, TribesmanTitle } from "webgl-test-shared/dist/titles";
import { CraftingStation, ItemRequirements } from "webgl-test-shared/dist/items/crafting-recipes";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { EnemyTribeData, TechID, TechTreeUnlockProgress } from "webgl-test-shared/dist/techs";
import { EntityTickEvent, EntityTickEventType } from "webgl-test-shared/dist/entity-events";
import Game from "../Game";
import Player from "../entities/Player";
import Client from "./Client";
import { definiteGameState } from "../game-state/game-states";

export interface InitialGameDataPacket {
   readonly playerID: number;
   readonly spawnPosition: [number, number];
   readonly tiles: Array<ServerTileData>;
   readonly waterRocks: ReadonlyArray<WaterRockData>;
   readonly riverSteppingStones: ReadonlyArray<RiverSteppingStoneData>;
   readonly riverFlowDirections: RiverFlowDirectionsRecord;
   readonly edgeTiles: Array<ServerTileData>;
   readonly grassInfo: Record<number, Record<number, GrassTileInfo>>;
   readonly decorations: ReadonlyArray<DecorationInfo>;
}

export function processInitialGameDataPacket(reader: PacketReader): InitialGameDataPacket {
   const playerID = reader.readNumber();
   
   const spawnPositionX = reader.readNumber();
   const spawnPositionY = reader.readNumber();
   
   const tiles = new Array<ServerTileData>();
   for (let tileIndex = 0; tileIndex < Settings.BOARD_DIMENSIONS * Settings.BOARD_DIMENSIONS; tileIndex++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      const tileType = reader.readNumber() as TileType;
      const tileBiome = reader.readNumber() as Biome;
      const isWall = reader.readBoolean();
      reader.padOffset(3);

      const tile: ServerTileData = {
         x: tileX,
         y: tileY,
         type: tileType,
         biome: tileBiome,
         isWall: isWall
      };
      tiles.push(tile);
   }

   // @Copynpaste
   const edgeTiles = new Array<ServerTileData>();
   const numEdgeTiles = reader.readNumber();
   for (let i = 0; i < numEdgeTiles; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      const tileType = reader.readNumber() as TileType;
      const tileBiome = reader.readNumber() as Biome;
      const isWall = reader.readBoolean();
      reader.padOffset(3);

      const tile: ServerTileData = {
         x: tileX,
         y: tileY,
         type: tileType,
         biome: tileBiome,
         isWall: isWall
      };
      edgeTiles.push(tile);
   }

   const waterRocks = new Array<WaterRockData>();
   const numWaterRocks = reader.readNumber();
   for (let i = 0; i < numWaterRocks; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber() as WaterRockSize;
      const opacity = reader.readNumber();

      const waterRock: WaterRockData = {
         position: [x, y],
         rotation: rotation,
         size: size,
         opacity: opacity
      };
      waterRocks.push(waterRock);
   }

   const steppingStones = new Array<RiverSteppingStoneData>();
   const numSteppingStones = reader.readNumber();
   for (let i = 0; i < numSteppingStones; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const rotation = reader.readNumber();
      const size = reader.readNumber() as RiverSteppingStoneSize;
      const groupID = reader.readNumber();

      const steppingStone: RiverSteppingStoneData = {
         positionX: x,
         positionY: y,
         rotation: rotation,
         size: size,
         groupID: groupID
      };
      steppingStones.push(steppingStone);
   }

   const flowDirections: RiverFlowDirectionsRecord = {};
   const numFlowDirections = reader.readNumber();
   for (let i = 0; i < numFlowDirections; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      const flowDirection = reader.readNumber();

      if (typeof flowDirections[tileX] === "undefined") {
         flowDirections[tileX] = {};
      }
      flowDirections[tileX]![tileY] = flowDirection;
   }

   const grassInfoRecord: Record<number, Record<number, GrassTileInfo>> = {};
   const numGrassInfos = reader.readNumber();
   for (let i = 0; i < numGrassInfos; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      const temperature = reader.readNumber();
      const humidity = reader.readNumber();

      const grassInfo: GrassTileInfo = {
         tileX: tileX,
         tileY: tileY,
         temperature: temperature,
         humidity: humidity
      };

      if (typeof grassInfoRecord[tileX] === "undefined") {
         grassInfoRecord[tileX] = {};
      }
      grassInfoRecord[tileX]![tileY] = grassInfo;
   }

   const decorations = new Array<DecorationInfo>();
   const numDecorations = reader.readNumber();
   for (let i = 0; i < numDecorations; i++) {
      const positionX = reader.readNumber();
      const positionY = reader.readNumber();
      const rotation = reader.readNumber();
      const type = reader.readNumber() as DecorationType;
      const variant = reader.readNumber();

      const decorationInfo: DecorationInfo = {
         positionX: positionX,
         positionY: positionY,
         rotation: rotation,
         type: type,
         variant: variant
      };
      decorations.push(decorationInfo);
   }

   return {
      playerID: playerID,
      spawnPosition: [spawnPositionX, spawnPositionY],
      tiles: tiles,
      edgeTiles: edgeTiles,
      waterRocks: waterRocks,
      riverSteppingStones: steppingStones,
      riverFlowDirections: flowDirections,
      grassInfo: grassInfoRecord,
      decorations: decorations
   };
}

const readInventory = (reader: PacketReader): Inventory => {
   const name = reader.readNumber() as InventoryName;
   const width = reader.readNumber();
   const height = reader.readNumber();
   const inventory = new Inventory(width, height, name);

   const numItems = reader.readNumber();
   for (let j = 0; j < numItems; j++) {
      const itemSlot = reader.readNumber();
      const id = reader.readNumber();
      const itemType = reader.readNumber() as ItemType;
      const count = reader.readNumber();

      const item = new Item(itemType, count, id);
      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

const readCrossbowLoadProgressRecord = (reader: PacketReader): Partial<Record<number, number>> => {
   const record: Partial<Record<number, number>> = {};

   const numEntries = reader.readNumber();
   for (let i = 0; i < numEntries; i++) {
      const itemSlot = reader.readNumber();
      const cooldown = reader.readNumber();
      record[itemSlot] = cooldown;
   }

   return record;
}

const readComponentData = <T extends ServerComponentType>(reader: PacketReader, componentType: T): ComponentData => {
   switch (componentType) {
      case ServerComponentType.aiHelper: {
         const visionRange = reader.readNumber();
         
         const data: AIHelperComponentData = {
            componentType: ServerComponentType.aiHelper,
            visionRange: visionRange
         };
         return data;
      }
      case ServerComponentType.berryBush: {
         const numBerries = reader.readNumber();

         const data: BerryBushComponentData = {
            componentType: ServerComponentType.berryBush,
            numBerries: numBerries
         };
         return data;
      }
      case ServerComponentType.blueprint: {
         const blueprintType = reader.readNumber();
         const buildProgress = reader.readNumber();
         const associatedEntityID = reader.readNumber();

         const data: BlueprintComponentData = {
            componentType: ServerComponentType.blueprint,
            blueprintType: blueprintType,
            buildProgress: buildProgress,
            associatedEntityID: associatedEntityID
         };
         return data;
      }
      case ServerComponentType.boulder: {
         const boulderType = reader.readNumber();

         const data: BoulderComponentData = {
            componentType: ServerComponentType.boulder,
            boulderType: boulderType
         };
         return data;
      }
      case ServerComponentType.cactus: {

         const flowers = new Array<CactusBodyFlowerData>();
         const numFlowers = reader.readNumber();
         for (let i = 0; i < numFlowers; i++) {
            const flowerType = reader.readNumber();
            const height = reader.readNumber();
            const rotation = reader.readNumber();
            const size = reader.readNumber();
            const column = reader.readNumber();

            const flower: CactusBodyFlowerData = {
               type: flowerType,
               height: height,
               rotation: rotation,
               size: size,
               column: column
            };
            flowers.push(flower);
         }
      
         const limbs = new Array<CactusLimbData>();
         const numLimbs = reader.readNumber();
         for (let i = 0; i < numLimbs; i++) {
            const limbDirection = reader.readNumber();
            const hasFlower = reader.readBoolean();
            reader.padOffset(3);

            let flower: CactusLimbFlowerData | undefined;
            if (hasFlower) {
               const type = reader.readNumber();
               const height = reader.readNumber();
               const rotation = reader.readNumber();
               const direction = reader.readNumber();
               
               flower = {
                  type: type,
                  height: height,
                  rotation: rotation,
                  direction: direction
               };
            }

            const limbData: CactusLimbData = {
               direction: limbDirection,
               flower: flower
            };
            limbs.push(limbData);
         }

         const data: CactusComponentData = {
            componentType: ServerComponentType.cactus,
            flowers: flowers,
            limbs: limbs
         };
         return data;
      }
      case ServerComponentType.cooking: {
         const heatingProgress = reader.readNumber();
         const isCooking = reader.readBoolean();
         reader.padOffset(3);

         const data: CookingComponentData = {
            componentType: ServerComponentType.cooking,
            heatingProgress: heatingProgress,
            isCooking: isCooking
         };
         return data;
      }
      case ServerComponentType.cow: {
         const species = reader.readNumber();
         const grazeProgress = reader.readNumber();

         const data: CowComponentData = {
            componentType: ServerComponentType.cow,
            species: species,
            grazeProgress: grazeProgress
         };
         return data;
      }
      case ServerComponentType.door: {
         const toggleType = reader.readNumber();
         const openProgress = reader.readNumber();

         const data: DoorComponentData = {
            componentType: ServerComponentType.door,
            toggleType: toggleType,
            openProgress: openProgress
         };
         return data;
      }
      case ServerComponentType.fish: {
         const colour = reader.readNumber() as FishColour;

         const data: FishComponentData = {
            componentType: ServerComponentType.fish,
            colour: colour
         };
         return data;
      }
      case ServerComponentType.frozenYeti: {
         const attackType = reader.readNumber();
         const attackStage = reader.readNumber();
         const stageProgress = reader.readNumber();

         const rockSpikePositions = new Array<[number, number]>();
         const numRockSpikes = reader.readNumber();
         for (let i = 0; i < numRockSpikes; i++) {
            const x = reader.readNumber();
            const y = reader.readNumber();
            rockSpikePositions.push([x, y]);
         }

         const data: FrozenYetiComponentData = {
            componentType: ServerComponentType.frozenYeti,
            attackType: attackType,
            attackStage: attackStage,
            stageProgress: stageProgress,
            rockSpikePositions: rockSpikePositions
         };
         return data;
      }
      case ServerComponentType.golem: {
         const wakeProgress = reader.readNumber();
         const ticksAwake = reader.readNumber();
         const isActive = reader.readBoolean();
         reader.padOffset(3);
         
         const data: GolemComponentData = {
            componentType: ServerComponentType.golem,
            wakeProgress: wakeProgress,
            ticksAwake: ticksAwake,
            isAwake: isActive
         };
         return data;
      }
      case ServerComponentType.health: {
         const health = reader.readNumber();
         const maxHealth = reader.readNumber();

         const data: HealthComponentData = {
            componentType: ServerComponentType.health,
            health: health,
            maxHealth: maxHealth
         };
         return data;
      }
      case ServerComponentType.hut: {
         const lastDoorSwingTicks = reader.readNumber();
         const isRecalling = reader.readBoolean();
         reader.padOffset(3);

         const data: HutComponentData = {
            componentType: ServerComponentType.hut,
            lastDoorSwingTicks: lastDoorSwingTicks,
            isRecalling: isRecalling
         };
         return data;
      }
      case ServerComponentType.iceShard: {
         const data: IceShardComponentData = {
            componentType: ServerComponentType.iceShard
         };
         return data;
      }
      case ServerComponentType.iceSpikes: {
         const data: IceSpikesComponentData = {
            componentType: ServerComponentType.iceSpikes
         };
         return data;
      }
      case ServerComponentType.inventory: {
         const inventories: Partial<Record<InventoryName, Inventory>> = {};
         const numInventories = reader.readNumber();
         for (let i = 0; i < numInventories; i++) {
            const inventory = readInventory(reader);
            inventories[inventory.name] = inventory;
         }

         const data: InventoryComponentData = {
            componentType: ServerComponentType.inventory,
            inventories: inventories
         };
         return data;
      }
      case ServerComponentType.inventoryUse: {
         const limbInfos = new Array<LimbInfo>();
         const numUseInfos = reader.readNumber();
         for (let i = 0; i < numUseInfos; i++) {
            const usedInventoryName = reader.readNumber() as InventoryName;
            const selectedItemSlot = reader.readNumber();
            const bowCooldownTicks = reader.readNumber();

            const itemAttackCooldowns: Partial<Record<number, number>> = {};
            const numAttackCooldowns = reader.readNumber();
            for (let j = 0; j < numAttackCooldowns; j++) {
               const itemSlot = reader.readNumber();
               const cooldown = reader.readNumber();
               itemAttackCooldowns[itemSlot] = cooldown;
            }

            const spearWindupCooldowns: Partial<Record<number, number>> = {};
            const numSpearWindupCooldowns = reader.readNumber();
            for (let j = 0; j < numSpearWindupCooldowns; j++) {
               const itemSlot = reader.readNumber();
               const cooldown = reader.readNumber();
               spearWindupCooldowns[itemSlot] = cooldown;
            }

            const crossbowLoadProgressRecord = readCrossbowLoadProgressRecord(reader);

            const foodEatingTimer = reader.readNumber();
            const action = reader.readNumber();
            const lastAttackTicks = reader.readNumber();
            const lastEatTicks = reader.readNumber();
            const lastBowChargeTicks = reader.readNumber();
            const lastSpearChargeTicks = reader.readNumber();
            const lastBattleaxeChargeTicks = reader.readNumber();
            const lastCrossbowLoadTicks = reader.readNumber();
            const lastCraftTicks = reader.readNumber();
            const thrownBattleaxeItemID = reader.readNumber();
            const lastAttackCooldown = reader.readNumber();

            const limbInfo: LimbInfo = {
               selectedItemSlot: selectedItemSlot,
               inventoryName: usedInventoryName,
               bowCooldownTicks: bowCooldownTicks,
               itemAttackCooldowns: itemAttackCooldowns,
               spearWindupCooldowns: spearWindupCooldowns,
               crossbowLoadProgressRecord: crossbowLoadProgressRecord,
               foodEatingTimer: foodEatingTimer,
               action: action,
               lastAttackTicks: lastAttackTicks,
               lastEatTicks: lastEatTicks,
               lastBowChargeTicks: lastBowChargeTicks,
               lastSpearChargeTicks: lastSpearChargeTicks,
               lastBattleaxeChargeTicks: lastBattleaxeChargeTicks,
               lastCrossbowLoadTicks: lastCrossbowLoadTicks,
               thrownBattleaxeItemID: thrownBattleaxeItemID,
               lastAttackCooldown: lastAttackCooldown,
               lastCraftTicks: lastCraftTicks,
               animationStartOffset: new Point(0, 0),
               animationEndOffset: new Point(0, 0),
               animationDurationTicks: 0,
               animationTicksElapsed: 0
            };
            limbInfos.push(limbInfo);
         }

         const data: InventoryUseComponentData = {
            componentType: ServerComponentType.inventoryUse,
            inventoryUseInfos: limbInfos
         };
         return data;
      }
      case ServerComponentType.item: {
         const itemType = reader.readNumber() as ItemType;

         const data: ItemComponentData = {
            componentType: ServerComponentType.item,
            itemType: itemType
         };
         return data;
      }
      case ServerComponentType.pebblum: {
         const data: PebblumComponentData = {
            componentType: ServerComponentType.pebblum
         };
         return data;
      }
      case ServerComponentType.physics: {
         const velocityX = reader.readNumber();
         const velocityY = reader.readNumber();
         const accelerationX = reader.readNumber();
         const accelerationY = reader.readNumber();

         const data: PhysicsComponentData = {
            componentType: ServerComponentType.physics,
            velocity: [velocityX, velocityY],
            acceleration: [accelerationX, accelerationY]
         };
         return data;
      }
      case ServerComponentType.player: {
         // @Hack: hardcoded
         const username = reader.readString(100);

         const data: PlayerComponentData = {
            componentType: ServerComponentType.player,
            username: username
         };
         return data;
      }
      case ServerComponentType.rockSpike: {
         const size = reader.readNumber();
         const lifetimeTicks = reader.readNumber();

         const data: RockSpikeProjectileComponentData = {
            componentType: ServerComponentType.rockSpike,
            size: size,
            lifetime: lifetimeTicks
         };
         return data;
      }
      case ServerComponentType.slime: {
         const size = reader.readNumber();
         const eyeRotation = reader.readNumber();

         const orbSizes = new Array<SlimeSize>();
         const numOrbs = reader.readNumber();
         for (let i = 0; i < numOrbs; i++) {
            const orbSize = reader.readNumber() as SlimeSize;
            orbSizes.push(orbSize);
         }

         const anger = reader.readNumber();
         const spitChargeProgress = reader.readNumber();

         const data: SlimeComponentData = {
            componentType: ServerComponentType.slime,
            size: size,
            eyeRotation: eyeRotation,
            orbSizes: orbSizes,
            anger: anger,
            spitChargeProgress: spitChargeProgress
         };
         return data;
      }
      case ServerComponentType.slimeSpit: {
         const size = reader.readNumber();

         const data: SlimeSpitComponentData = {
            componentType: ServerComponentType.slimeSpit,
            size: size
         }
         return data;
      }
      case ServerComponentType.slimewisp: {
         const data: SlimewispComponentData = {
            componentType: ServerComponentType.slimewisp
         };
         return data;
      }
      case ServerComponentType.snowball: {
         const size = reader.readNumber() as SnowballSize;

         const data: SnowballComponentData = {
            componentType: ServerComponentType.snowball,
            size: size
         };
         return data;
      }
      case ServerComponentType.statusEffect: {
         const statusEffects = new Array<StatusEffectData>();
         const numStatusEffects = reader.readNumber();
         for (let i = 0; i < numStatusEffects; i++) {
            const type = reader.readNumber() as StatusEffect;
            const ticksElapsed = reader.readNumber();

            const statusEffectData: StatusEffectData = {
               type: type,
               ticksElapsed: ticksElapsed
            }
            statusEffects.push(statusEffectData);
         }
         
         const data: StatusEffectComponentData = {
            componentType: ServerComponentType.statusEffect,
            statusEffects: statusEffects
         };
         return data;
      }
      case ServerComponentType.throwingProjectile: {
         const data: ThrowingProjectileComponentData = {
            componentType: ServerComponentType.throwingProjectile
         };
         return data;
      }
      case ServerComponentType.tombstone: {
         const tombstoneType = reader.readNumber();
         const zombieSpawnProgress = reader.readNumber();
         const zombieSpawnPositionX = reader.readNumber();
         const zombieSpawnPositionY = reader.readNumber();

         let deathInfo: DeathInfo | null = null;
         const hasDeathInfo = reader.readBoolean();
         reader.padOffset(3);
         if (hasDeathInfo) {
            // @Hack: hardcoded
            const username = reader.readString(100);
            const causeOfDeath = reader.readNumber() as PlayerCauseOfDeath;
            deathInfo = {
               username: username,
               causeOfDeath: causeOfDeath
            };
         }

         const data: TombstoneComponentData = {
            componentType: ServerComponentType.tombstone,
            tombstoneType: tombstoneType,
            zombieSpawnProgress: zombieSpawnProgress,
            zombieSpawnX: zombieSpawnPositionX,
            zombieSpawnY: zombieSpawnPositionY,
            deathInfo: deathInfo
         };
         return data;
      }
      case ServerComponentType.totemBanner: {
         const banners = new Array<TribeTotemBanner>();
         const numBanners = reader.readNumber();
         for (let i = 0; i < numBanners; i++) {
            const hutNum = reader.readNumber();
            const layer = reader.readNumber();
            const direction = reader.readNumber();

            const banner: TribeTotemBanner = {
               hutNum: hutNum,
               layer: layer,
               direction: direction
            };
            banners.push(banner);
         }

         const data: TotemBannerComponentData = {
            componentType: ServerComponentType.totemBanner,
            banners: banners
         };
         return data;
      }
      case ServerComponentType.tree: {
         const size = reader.readNumber();
         
         const data: TreeComponentData = {
            componentType: ServerComponentType.tree,
            treeSize: size
         };
         return data;
      }
      case ServerComponentType.tribe: {
         const tribeID = reader.readNumber();

         const data: TribeComponentData = {
            componentType: ServerComponentType.tribe,
            tribeID: tribeID
         };
         return data;
      }
      case ServerComponentType.tribeMember: {
         const rawWarpaintType = reader.readNumber();
         const warpaintType = rawWarpaintType !== -1 ? rawWarpaintType : null;
         
         const titles = new Array<TitleGenerationInfo>();
         const numTitles = reader.readNumber();
         for (let i = 0; i < numTitles; i++) {
            const title = reader.readNumber() as TribesmanTitle;
            const displayOption = reader.readNumber();
            
            titles.push({
               title: title,
               displayOption: displayOption
            });
         }
         
         const data: TribeMemberComponentData = {
            componentType: ServerComponentType.tribeMember,
            warPaintType: warpaintType,
            titles: titles
         };
         return data;
      }
      case ServerComponentType.tribesmanAI: {
         const name = reader.readNumber();
         const untitledDescriptor = reader.readNumber();
         const currentAIType = reader.readNumber();
         const relationsWithPlayer = reader.readNumber();
         const craftingItemType = reader.readNumber() as ItemType;
         const craftingProgress = reader.readNumber();

         const data: TribesmanAIComponentData = {
            componentType: ServerComponentType.tribesmanAI,
            name: name,
            untitledDescriptor: untitledDescriptor,
            currentAIType: currentAIType,
            relationsWithPlayer: relationsWithPlayer,
            craftingItemType: craftingItemType,
            craftingProgress: craftingProgress
         };
         return data;
      }
      case ServerComponentType.turret: {
         const aimDirection = reader.readNumber();
         const chargeProgress = reader.readNumber();
         const reloadProgress = reader.readNumber();

         const data: TurretComponentData = {
            componentType: ServerComponentType.turret,
            aimDirection: aimDirection,
            chargeProgress: chargeProgress,
            reloadProgress: reloadProgress
         };
         return data;
      }
      case ServerComponentType.yeti: {
         const attackProgress = reader.readNumber();

         const data: YetiComponentData = {
            componentType: ServerComponentType.yeti,
            attackProgress: attackProgress
         };
         return data;
      }
      case ServerComponentType.zombie: {
         const zombieType = reader.readNumber();

         const data: ZombieComponentData = {
            componentType: ServerComponentType.zombie,
            zombieType: zombieType
         };
         return data;
      }
      case ServerComponentType.ammoBox: {
         const ammoType = reader.readNumber();
         const ammoRemaining = reader.readNumber();

         const data: AmmoBoxComponentData = {
            componentType: ServerComponentType.ammoBox,
            ammoType: ammoType,
            ammoRemaining: ammoRemaining
         };
         return data;
      }
      case ServerComponentType.wanderAI: {
         const targetPositionX = reader.readNumber();
         const targetPositionY = reader.readNumber();

         const data: WanderAIComponentData = {
            componentType: ServerComponentType.wanderAI,
            targetPositionX: targetPositionX,
            targetPositionY: targetPositionY
         }
         return data;
      }
      case ServerComponentType.escapeAI: {
         const attackingEntityIDs = new Array<EntityID>();
         const numAttackingEntities = reader.readNumber();
         for (let i = 0; i < numAttackingEntities; i++) {
            const id = reader.readNumber();
            attackingEntityIDs.push(id);
         }

         const attackingEntitiesTicksSinceLastAttack = new Array<EntityID>();
         for (let i = 0; i < numAttackingEntities; i++) {
            const ticksSinceLastAttack = reader.readNumber();
            attackingEntitiesTicksSinceLastAttack.push(ticksSinceLastAttack);
         }

         const data: EscapeAIComponentData = {
            componentType: ServerComponentType.escapeAI,
            attackingEntityIDs: attackingEntityIDs,
            attackEntityTicksSinceLastAttack: attackingEntitiesTicksSinceLastAttack
         };
         return data;
      }
      case ServerComponentType.followAI: {
         const followTargetID = reader.readNumber();
         const followCooldownTicks = reader.readNumber();
         const interestTimer = reader.readNumber();

         const data: FollowAIComponentData = {
            componentType: ServerComponentType.followAI,
            followTargetID: followTargetID,
            followCooldownTicks: followCooldownTicks,
            interestTimer: interestTimer
         };
         return data;
      }
      case ServerComponentType.researchBench: {
         const isOccupied = reader.readBoolean();
         reader.padOffset(3);

         const data: ResearchBenchComponentData = {
            componentType: ServerComponentType.researchBench,
            isOccupied: isOccupied
         };
         return data;
      }
      case ServerComponentType.tunnel: {
         const doorBitset = reader.readNumber();
         const topDoorOpenProgress = reader.readNumber();
         const bottomDoorOpenProgress = reader.readNumber();

         const data: TunnelComponentData = {
            componentType: ServerComponentType.tunnel,
            doorBitset: doorBitset,
            topDoorOpenProgress: topDoorOpenProgress,
            bottomDoorOpenProgress: bottomDoorOpenProgress
         };
         return data;
      }
      case ServerComponentType.buildingMaterial: {
         const material = reader.readNumber();

         const data: BuildingMaterialComponentData = {
            componentType: ServerComponentType.buildingMaterial,
            material: material
         }
         return data;
      }
      case ServerComponentType.spikes: {
         const isCovered = reader.readBoolean();
         reader.padOffset(3);

         const data: SpikesComponentData = {
            componentType: ServerComponentType.spikes,
            isCovered: isCovered
         };
         return data;
      }
      case ServerComponentType.tribeWarrior: {
         const scars = new Array<ScarInfo>();
         const numScars = reader.readNumber();
         for (let i = 0; i < numScars; i++) {
            const offsetX = reader.readNumber();
            const offsetY = reader.readNumber();
            const rotation = reader.readNumber();
            const type = reader.readNumber();

            scars.push({
               offsetX: offsetX,
               offsetY: offsetY,
               rotation: rotation,
               type: type
            });
         }

         const data: TribeWarriorComponentData = {
            componentType: ServerComponentType.tribeWarrior,
            scars: scars
         };
         return data;
      }
      case ServerComponentType.healingTotem: {
         const healTargets = new Array<HealingTotemTargetData>();
         const numTargets = reader.readNumber();
         for (let i = 0; i < numTargets; i++) {
            const healTargetID = reader.readNumber();
            const x = reader.readNumber();
            const y = reader.readNumber();
            const ticksHealed = reader.readNumber();

            healTargets.push({
               entityID: healTargetID,
               x: x,
               y: y,
               ticksHealed: ticksHealed
            });
         }

         const data: HealingTotemComponentData = {
            componentType: ServerComponentType.healingTotem,
            healingTargetsData: healTargets
         }
         return data;
      }
      case ServerComponentType.planterBox: {
         const plantType = reader.readNumber();
         const isFertilised = reader.readBoolean();
         reader.padOffset(3);

         const data: PlanterBoxComponentData = {
            componentType: ServerComponentType.planterBox,
            plantType: plantType,
            isFertilised: isFertilised
         };
         return data;
      }
      case ServerComponentType.plant: {
         const plantType = reader.readNumber();
         const growthProgress = reader.readNumber();
         const numFruit = reader.readNumber();

         const data: PlantComponentData = {
            componentType: ServerComponentType.plant,
            plant: plantType,
            plantGrowthProgress: growthProgress,
            numFruit: numFruit
         };
         return data;
      }
      case ServerComponentType.structure: {
         const hasActiveBlueprint = reader.readBoolean();
         reader.padOffset(3);
         const connectedSidesBitset = reader.readNumber();
         
         const data: StructureComponentData = {
            componentType: ServerComponentType.structure,
            hasActiveBlueprint: hasActiveBlueprint,
            connectedSidesBitset: connectedSidesBitset
         };
         return data;
      }
      case ServerComponentType.fence: {
         const data: FenceComponentData = {
            componentType: ServerComponentType.fence
         };
         return data;
      }
      case ServerComponentType.fenceGate: {
         const toggleType = reader.readNumber();
         const openProgress = reader.readNumber();

         const data: FenceGateComponentData = {
            componentType: ServerComponentType.fenceGate,
            toggleType: toggleType,
            openProgress: openProgress
         };
         return data;
      }
      case ServerComponentType.craftingStation: {
         const craftingStation = reader.readNumber() as CraftingStation;

         const data: CraftingStationComponentData = {
            componentType: ServerComponentType.craftingStation,
            craftingStation: craftingStation
         };
         return data;
      }
      case ServerComponentType.transform: {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const rotation = reader.readNumber();
         const ageTicks = reader.readNumber();
         const collisionBit = reader.readNumber();
         const collisionMask = reader.readNumber();
         
         // Circular
         const circularHitboxes = new Array<CircularHitboxData>();
         const numCircularHitboxes = reader.readNumber();
         for (let i = 0; i < numCircularHitboxes; i++) {
            const mass = reader.readNumber();
            const offsetX = reader.readNumber();
            const offsetY = reader.readNumber();
            const collisionType = reader.readNumber();
            const collisionBit = reader.readNumber();
            const collisionMask = reader.readNumber();
            const localID = reader.readNumber();
            const flags = reader.readNumber();
            const radius = reader.readNumber();

            const data: CircularHitboxData = {
               mass: mass,
               offsetX: offsetX,
               offsetY: offsetY,
               collisionType: collisionType,
               collisionBit: collisionBit,
               collisionMask: collisionMask,
               localID: localID,
               flags: flags,
               radius: radius
            };
            circularHitboxes.push(data);
         }

         const rectangularHitboxes = new Array<RectangularHitboxData>();
         const numRectangularHitboxes = reader.readNumber();
         for (let i = 0; i < numRectangularHitboxes; i++) {
            const mass = reader.readNumber();
            const offsetX = reader.readNumber();
            const offsetY = reader.readNumber();
            const collisionType = reader.readNumber();
            const collisionBit = reader.readNumber();
            const collisionMask = reader.readNumber();
            const localID = reader.readNumber();
            const flags = reader.readNumber();
            const width = reader.readNumber();
            const height = reader.readNumber();
            const rotation = reader.readNumber();

            const data: RectangularHitboxData = {
               mass: mass,
               offsetX: offsetX,
               offsetY: offsetY,
               collisionType: collisionType,
               collisionBit: collisionBit,
               collisionMask: collisionMask,
               localID: localID,
               flags: flags,
               width: width,
               height: height,
               rotation: rotation
            };
            rectangularHitboxes.push(data);
         }

         const data: TransformComponentData = {
            componentType: ServerComponentType.transform,
            position: [positionX, positionY],
            rotation: rotation,
            rectangularHitboxes: rectangularHitboxes,
            circularHitboxes: circularHitboxes,
            ageTicks: ageTicks,
            collisionBit: collisionBit,
            collisionMask: collisionMask
         };
         return data;
      }
      case ServerComponentType.projectile: {
         const data: ProjectileComponentData = {
            componentType: ServerComponentType.projectile
         };
         return data;
      }
      case ServerComponentType.layeredRod: {
         const numLayers = reader.readNumber();
         const bendX = reader.readNumber();
         const bendY = reader.readNumber();
         const r = reader.readNumber();
         const g = reader.readNumber();
         const b = reader.readNumber();

         const data: LayeredRodComponentData = {
            componentType: ServerComponentType.layeredRod,
            numLayers: numLayers,
            bend: [bendX, bendY],
            colour: {
               r: r,
               g: g,
               b: b
            }
         };
         return data;
      }
      default: {
         const unreachable: never = componentType;
         return unreachable;
      }
   }
}

const readEntityData = (reader: PacketReader): EntityData => {
   const entityID = reader.readNumber() as EntityID;
   const entityType = reader.readNumber() as EntityType;

   // Components
   const components = new Array<ComponentData>();
   const numComponents = reader.readNumber();
   for (let i = 0; i < numComponents; i++) {
      const componentType = reader.readNumber() as ServerComponentType;

      const componentData = readComponentData(reader, componentType);
      components.push(componentData);
   }

   return {
      id: entityID,
      type: entityType,
      components: components
   };
}

const readDebugData = (reader: PacketReader): EntityDebugData => {
   const entityID = reader.readNumber();

   const lines = new Array<LineDebugData>();
   const numLines = reader.readNumber();
   for (let i = 0; i < numLines; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const targetX = reader.readNumber();
      const targetY = reader.readNumber();
      const thickness = reader.readNumber();

      lines.push({
         colour: [r, g, b],
         targetPosition: [targetX, targetY],
         thickness: thickness
      });
   }

   const circles = new Array<CircleDebugData>();
   const numCircles = reader.readNumber();
   for (let i = 0; i < numCircles; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const radius = reader.readNumber();
      const thickness = reader.readNumber();

      circles.push({
         colour: [r, g, b],
         radius: radius,
         thickness: thickness
      });
   }

   const tileHighlights = new Array<TileHighlightData>();
   const numTileHighlights = reader.readNumber();
   for (let i = 0; i < numTileHighlights; i++) {
      const r = reader.readNumber();
      const g = reader.readNumber();
      const b = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();

      tileHighlights.push({
         colour: [r, g, b],
         tilePosition: [x, y]
      });
   }
   
   const entries = new Array<string>();
   const numDebugEntries = reader.readNumber();
   for (let i = 0; i < numDebugEntries; i++) {
      // @Hack: hardcoded
      const entry = reader.readString(1000);
      entries.push(entry);
   }

   let pathData: PathData | undefined;

   const pathNodes = new Array<PathfindingNodeIndex>();
   const numPathNodes = reader.readNumber();
   for (let i = 0; i < numPathNodes; i++) {
      const nodeIndex = reader.readNumber();
      pathNodes.push(nodeIndex);
   }

   const rawPathNodes = new Array<PathfindingNodeIndex>();
   const numRawPathNodes = reader.readNumber();
   for (let i = 0; i < numRawPathNodes; i++) {
      const nodeIndex = reader.readNumber();
      rawPathNodes.push(nodeIndex);
   }

   if (numPathNodes > 0 || numRawPathNodes > 0) {
      pathData = {
         pathNodes: pathNodes,
         rawPathNodes: rawPathNodes
      };
   }
   
   return {
      entityID: entityID,
      lines: lines,
      circles: circles,
      tileHighlights: tileHighlights,
      debugEntries: entries,
      pathData: pathData
   };
}

const readPlayerInventories = (reader: PacketReader): PlayerInventoryData => {
   const hotbarInventory = readInventory(reader);
   const backpackInventory = readInventory(reader);
   const backpackSlotInventory = readInventory(reader);
   const heldItemSlotInventory = readInventory(reader);
   const craftingOutputSlotInventory = readInventory(reader);
   const armourSlotInventory = readInventory(reader);
   const offhandInventory = readInventory(reader);
   const gloveSlotInventory = readInventory(reader);

   return {
      hotbar: hotbarInventory,
      backpackSlot: backpackSlotInventory,
      backpackInventory: backpackInventory,
      heldItemSlot: heldItemSlotInventory,
      craftingOutputItemSlot: craftingOutputSlotInventory,
      armourSlot: armourSlotInventory,
      gloveSlot: gloveSlotInventory,
      offhand: offhandInventory
   };
}

export function processGameDataPacket(reader: PacketReader): GameDataPacket {
   const simulationIsPaused = reader.readBoolean();
   reader.padOffset(3);

   // Add entities
   const entityDataArray = new Array<EntityData>();
   const numEntities = reader.readNumber();
   for (let i = 0; i < numEntities; i++) {
      const entityData = readEntityData(reader);
      entityDataArray.push(entityData);
   }

   const playerInventories = readPlayerInventories(reader);
   
   const visibleHits = new Array<HitData>();
   const numHits = reader.readNumber();
   for (let i = 0; i < numHits; i++) {
      const hitEntityID = reader.readNumber();
      const x = reader.readNumber();
      const y = reader.readNumber();
      const attackEffectiveness = reader.readNumber() as AttackEffectiveness;
      const damage = reader.readNumber();
      const shouldShowDamageNumber = reader.readBoolean();
      reader.padOffset(3);
      const flags = reader.readNumber();
      
      const hit: HitData = {
         hitEntityID: hitEntityID,
         hitPosition: [x, y],
         attackEffectiveness: attackEffectiveness,
         damage: damage,
         shouldShowDamageNumber: shouldShowDamageNumber,
         flags: flags
      };
      visibleHits.push(hit);
   }

   const playerKnockbacks = new Array<PlayerKnockbackData>();
   const numPlayerKnockbacks = reader.readNumber();
   for (let i = 0; i < numPlayerKnockbacks; i++) {
      const knockback = reader.readNumber();
      const knockbackDirection = reader.readNumber();
      playerKnockbacks.push({
         knockback: knockback,
         knockbackDirection: knockbackDirection
      });
   }

   const heals = new Array<HealData>();
   const numHeals = reader.readNumber();
   for (let i = 0; i < numHeals; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const healedID = reader.readNumber();
      const healerID = reader.readNumber();
      const healAmount = reader.readNumber();
      heals.push({
         entityPositionX: x,
         entityPositionY: y,
         healedID: healedID,
         healerID: healerID,
         healAmount: healAmount
      });
   }

   const visibleEntityDeathIDs = new Array<EntityID>();
   const numVisibleDeaths = reader.readNumber();
   for (let i = 0; i < numVisibleDeaths; i++) {
      const id = reader.readNumber();
      visibleEntityDeathIDs.push(id);
   }

   const orbCompletes = new Array<ResearchOrbCompleteData>();
   const numOrbs = reader.readNumber();
   for (let i = 0; i < numOrbs; i++) {
      const x = reader.readNumber();
      const y = reader.readNumber();
      const amount = reader.readNumber();

      orbCompletes.push({
         x: x,
         y: y,
         amount: amount
      });
   }

   const tileUpdates = new Array<ServerTileUpdateData>();
   const numTileUpdates = reader.readNumber();
   for (let i = 0; i < numTileUpdates; i++) {
      const tileIndex = reader.readNumber();
      const tileType = reader.readNumber();
      const isWall = reader.readBoolean();
      reader.padOffset(3);

      tileUpdates.push({
         tileIndex: tileIndex,
         type: tileType,
         isWall: isWall
      });
   }

   const ticks = reader.readNumber();
   const time = reader.readNumber();
   const playerHealth = reader.readNumber();

   const hasDebugData = reader.readBoolean();
   reader.padOffset(3);
   
   let debugData: EntityDebugData | undefined;
   if (hasDebugData) {
      debugData = readDebugData(reader);
   }

   // 
   // Player tribe data
   // 
   // @Cleanup: move into a separate function

   const tribeName = reader.readString(100);
   const tribeID = reader.readNumber();
   const tribeType = reader.readNumber();
   const hasTotem = reader.readBoolean();
   reader.padOffset(3);
   const numHuts = reader.readNumber();
   const tribesmanCap = reader.readNumber();

   const area = new Array<[tileX: number, tileY: number]>();
   const areaLength = reader.readNumber();
   for (let i = 0; i < areaLength; i++) {
      const tileX = reader.readNumber();
      const tileY = reader.readNumber();
      area.push([tileX, tileY]);
   }

   const rawSelectedTechID = reader.readNumber();
   const selectedTechID = rawSelectedTechID !== -1 ? rawSelectedTechID : null;

   const unlockedTechs = new Array<TechID>();
   const numUnlockedTechs = reader.readNumber();
   for (let i = 0; i < numUnlockedTechs; i++) {
      const techID = reader.readNumber();
      unlockedTechs.push(techID);
   }

   // Tech tree unlock progress
   const techTreeUnlockProgress: TechTreeUnlockProgress = {};
   const numTechProgressEntries = reader.readNumber();
   for (let i = 0; i < numTechProgressEntries; i++) {
      const techID = reader.readNumber() as TechID;

      const itemProgress: ItemRequirements = {};
      const numRequirements = reader.readNumber();
      for (let j = 0; j < numRequirements; j++) {
         const itemType = reader.readNumber() as ItemType;
         const amount = reader.readNumber();
         itemProgress[itemType] = amount;
      }

      const studyProgress = reader.readNumber();

      techTreeUnlockProgress[techID] = {
         itemProgress: itemProgress,
         studyProgress: studyProgress
      };
   }

   // Enemy tribes data
   const enemyTribesData = new Array<EnemyTribeData>();
   const numEnemyTribes = reader.readNumber();
   for (let i = 0; i < numEnemyTribes; i++) {
      const name = reader.readString(100);
      const id = reader.readNumber();
      const tribeType = reader.readNumber();

      enemyTribesData.push({
         name: name,
         id: id,
         tribeType: tribeType
      });
   }

   // @Incomplete
   // hasFrostShield: player.immunityTimer === 0 && playerArmour !== null && playerArmour.type === ItemType.deepfrost_armour,

   const hasFrostShield = reader.readBoolean();
   reader.padOffset(3);

   const hasPickedUpItem = reader.readBoolean();
   reader.padOffset(3);

   const hotbarCrossbowLoadProgressRecord = readCrossbowLoadProgressRecord(reader);

   // Title offer
   const hasTitleOffer = reader.readBoolean();
   reader.padOffset(3);
   let titleOffer: TribesmanTitle | null = null;
   if (hasTitleOffer) {
      titleOffer = reader.readNumber();
   }
   
   // Tick events
   const tickEvents = new Array<EntityTickEvent>();
   const numTickEvents = reader.readNumber();
   for (let i = 0; i < numTickEvents; i++) {
      const entityID = reader.readNumber()
      const type = reader.readNumber() as EntityTickEventType;
      const data = reader.readNumber();
      tickEvents.push({
         entityID: entityID,
         type: type,
         data: data
      });
   }
   
   return {
      simulationIsPaused: simulationIsPaused,
      entityDataArray: entityDataArray,
      tileUpdates: tileUpdates,
      visibleHits: visibleHits,
      playerKnockbacks: playerKnockbacks,
      heals: heals,
      orbCompletes: orbCompletes,
      inventory: playerInventories,
      serverTicks: ticks,
      serverTime: time,
      playerHealth: playerHealth,
      entityDebugData: debugData,
      playerTribeData: {
         name: tribeName,
         id: tribeID,
         tribeType: tribeType,
         hasTotem: hasTotem,
         numHuts: numHuts,
         tribesmanCap: tribesmanCap,
         area: area,
         selectedTechID: selectedTechID,
         unlockedTechs: unlockedTechs,
         techTreeUnlockProgress: techTreeUnlockProgress
      },
      enemyTribesData: enemyTribesData,
      hasFrostShield: hasFrostShield,
      pickedUpItem: hasPickedUpItem,
      hotbarCrossbowLoadProgressRecord: hotbarCrossbowLoadProgressRecord,
      titleOffer: titleOffer,
      tickEvents: tickEvents,
      // @Incomplete
      visiblePathfindingNodeOccupances: [],
      visibleSafetyNodes: [],
      visibleBuildingPlans: [],
      visibleBuildingSafetys: [],
      visibleRestrictedBuildingAreas: [],
      visibleWalls: [],
      visibleWallConnections: [],
      visibleEntityDeathIDs: [],
      visibleGrassBlockers: []
   };
}

export function processSyncDataPacket(reader: PacketReader): void {
   if (!Game.isRunning || Player.instance === null) return;
   
   const x = reader.readNumber();
   const y = reader.readNumber();
   const rotation = reader.readNumber();

   const velocityX = reader.readNumber();
   const velocityY = reader.readNumber();
   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();

   const health = reader.readNumber();

   const playerInventories = readPlayerInventories(reader);
   // // Add inventory data
   // addInventoryDataToPacket(packet, hotbarInventory);
   // addInventoryDataToPacket(packet, backpackInventory);
   // addInventoryDataToPacket(packet, backpackSlotInventory);
   // addInventoryDataToPacket(packet, heldItemSlotInventory);
   // addInventoryDataToPacket(packet, craftingOutputSlotInventory);
   // addInventoryDataToPacket(packet, armourSlotInventory);
   // addInventoryDataToPacket(packet, offhandInventory);
   // addInventoryDataToPacket(packet, gloveSlotInventory);

   
   const transformComponent = Player.instance.getServerComponent(ServerComponentType.transform);
   
   transformComponent.position.x = x;
   transformComponent.position.y = y;
   transformComponent.rotation = rotation;
   Client.updatePlayerInventory(playerInventories);

   const physicsComponent = Player.instance.getServerComponent(ServerComponentType.physics);
   physicsComponent.velocity.x = velocityX;
   physicsComponent.velocity.y = velocityY;
   physicsComponent.acceleration.x = accelerationX;
   physicsComponent.acceleration.y = accelerationY;
   
   definiteGameState.setPlayerHealth(health);
   if (definiteGameState.playerIsDead()) {
      Client.killPlayer();
   }

   Game.sync();
}