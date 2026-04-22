import { EntityType, PacketReader, ServerComponentType } from "../../../shared/src";
import { ClientComponentType } from "./entity-components/client-component-types";
import { ClientComponentData } from "./entity-components/client-components";
import { ComponentArray, getClientComponentArray, getServerComponentArray, ServerComponentArray } from "./entity-components/component-registry";
import { ServerComponentData } from "./entity-components/components";
import { TransformComponentData } from "./entity-components/server-components/TransformComponent";

export type EntityServerComponentData<T extends ServerComponentType = ServerComponentType> = ReadonlyArray<ServerComponentData<T>>;
export type EntityClientComponentData<T extends ClientComponentType = ClientComponentType> = ReadonlyArray<ClientComponentData<T>>;

const ENTITY_SERVER_COMPONENT_TYPES: Array<Array<ServerComponentType>> = [];

const ENTITY_CLIENT_COMPONENT_TYPES: ReadonlyArray<ReadonlyArray<ClientComponentType>> = [
   // cow
   [ClientComponentType.footprint],
   // zombie
   [],
   // tombstone
   [],
   // tree
   [],
   // workbench
   [ClientComponentType.workbench],
   // boulder
   [],
   // berryBush
   [],
   // cactus
   [],
   // yeti
   [ClientComponentType.randomSound],
   // iceSpikes
   [],
   // slime
   [],
   // slimewisp
   [],
   // player
   [ClientComponentType.footprint, ClientComponentType.equipment],
   // tribeWorker
   [ClientComponentType.footprint, ClientComponentType.equipment],
   // tribeWarrior
   [ClientComponentType.footprint, ClientComponentType.equipment],
   // tribeTotem
   [],
   // workerHut
   [ClientComponentType.workerHut],
   // warriorHut
   [ClientComponentType.warriorHut],
   // barrel
   [],
   // campfire
   [],
   // furnace
   [],
   // snowball
   [],
   // krumblid
   [ClientComponentType.footprint],
   // fish
   [],
   // itemEntity
   [],
   // fleshSwordItemEntity
   [],
   // woodenArrow
   [ClientComponentType.woodenArrow],
   // ballistaWoodenBolt
   [ClientComponentType.ballistaWoodenBolt],
   // ballistaRock
   [ClientComponentType.ballistaRock],
   // ballistaSlimeball
   [ClientComponentType.ballistaSlimeball],
   // ballistaFrostcicle
   [ClientComponentType.ballistaFrostcicle],
   // slingTurretRock
   [],
   // iceShardProjectile
   [],
   // spearProjectile
   [],
   // researchBench
   [],
   // wall
   [ClientComponentType.wall],
   // slimeSpit
   [],
   // spitPoisonArea
   [],
   // door
   [],
   // battleaxeProjectile
   [ClientComponentType.thrownBattleaxe],
   // golem
   [],
   // planterBox
   [],
   // iceArrow
   [],
   // pebblum
   [ClientComponentType.footprint],
   // embrasure
   [ClientComponentType.embrasure],
   // tunnel
   [],
   // floorSpikes
   [ClientComponentType.regularSpikes],
   // wallSpikes
   [ClientComponentType.regularSpikes],
   // floorPunjiSticks
   [],
   // wallPunjiSticks
   [],
   // blueprintEntity
   [],
   // ballista
   [],
   // slingTurret
   [],
   // healingTotem
   [],
   // treePlanted
   [],
   // berryBushPlanted
   [],
   // iceSpikesPlanted
   [],
   // fence
   [],
   // fenceGate
   [],
   // frostshaper
   [ClientComponentType.frostshaper],
   // stonecarvingTable
   [ClientComponentType.stonecarvingTable],
   // grassStrand
   [],
   // decoration
   [],
   // riverSteppingStone
   [],
   // reed
   [],
   // lilypad
   [ClientComponentType.lilypad],
   // fibrePlant
   [],
   // guardian
   [],
   // guardianGemQuake
   [],
   // guardianGemFragmentProjectile
   [],
   // guardianSpikyBall
   [],
   // bracings
   [],
   // fireTorch
   [],
   // spikyBastard
   [],
   // glurbHeadSegment
   [],
   // glurbBodySegment
   [],
   // glurbTailSegment
   [ClientComponentType.glurbTailSegment],
   // slurbTorch
   [],
   // treeRootBase
   [],
   // treeRootSegment
   [],
   // mithrilOreNode
   [],
   // scrappy
   [],
   // cogwalker
   [],
   // automatonAssembler
   [],
   // mithrilAnvil
   [],
   // heldItem
   [],
   // moss
   [],
   // floorSign
   [],
   // desertBushLively
   [],
   // desertBushSandy
   [],
   // desertSmallWeed
   [],
   // desertShrub
   [],
   // tumbleweedLive
   [],
   // tumbleweedDead
   [],
   // palmTree
   [],
   // pricklyPear
   [],
   // pricklyPearFragmentProjectile
   [],
   // dustflea
   [],
   // sandstoneRock
   [],
   // okren
   [],
   // okrenClaw
   [],
   // dustfleaMorphCocoon
   [],
   // sandBall
   [],
   // krumblidMorphCocoon
   [],
   // okrenTongue
   [],
   // dustfleaEgg
   [],
   // spruceTree
   [],
   // tundraRock
   [],
   // tundraRockFrozen
   [],
   // snowberryBush
   [],
   // snobe
   [ClientComponentType.footprint, ClientComponentType.randomSound],
   // snobeMound
   [],
   // inguSerpent
   [],
   // tukmok
   [],
   // tukmokTrunk
   [],
   // tukmokTailClub
   [],
   // tukmokSpur
   [],
   // inguYetuksnoglurblidokowflea
   [],
   // inguYetuksnoglurblidokowfleaSeekerHead
   [],
   // inguYetukLaser
   [],
];

const COMPONENT_ARRAYS: Array<Array<ComponentArray>> = [];
const SERVER_COMPONENT_ARRAYS: Array<Array<ServerComponentArray>> = [];
const COMPONENT_ARRAYS_HAVE_INTERMEDIATE_INFO: Array<boolean> = [];

// @Cleanup: the export!!
export const ENTITY_INTERMEDIATE_INFOS: Array<Array<object>> = [];

export function registerEntityComponentTypesFromData(reader: PacketReader): void {
   const numEntityTypes = reader.readNumber();
   for (let entityType = 0; entityType < numEntityTypes; entityType++) {
      const componentTypes: Array<ServerComponentType> = [];
      const componentArrays: Array<ComponentArray> = [];
      const serverComponentArrays: Array<ServerComponentArray> = [];
      
      let hasIntermediateInfo = false;
      const intermediateInfos: Array<object> = [];
      
      const numComponents = reader.readNumber();
      for (let j = 0; j < numComponents; j++) {
         const componentType: ServerComponentType = reader.readNumber();
         componentTypes.push(componentType);

         const componentArray = getServerComponentArray(componentType);

         serverComponentArrays.push(componentArray);
         
         // @Copynpaste
         componentArrays.push(componentArray);
         if (componentArray.populateIntermediateInfo !== undefined) {
            hasIntermediateInfo = true;
         }
         intermediateInfos.push(null as unknown as object);
      }

      ENTITY_SERVER_COMPONENT_TYPES.push(componentTypes);

      // Client component arrays
      for (const clientComponentType of ENTITY_CLIENT_COMPONENT_TYPES[entityType]) {
         const componentArray = getClientComponentArray(clientComponentType);
         
         // @Copynpaste
         componentArrays.push(componentArray);
         if (componentArray.populateIntermediateInfo !== undefined) {
            hasIntermediateInfo = true;
         }
         intermediateInfos.push(null as unknown as object)
      }

      COMPONENT_ARRAYS.push(componentArrays);
      SERVER_COMPONENT_ARRAYS.push(serverComponentArrays);
      COMPONENT_ARRAYS_HAVE_INTERMEDIATE_INFO.push(hasIntermediateInfo);
      ENTITY_INTERMEDIATE_INFOS.push(intermediateInfos);
   }
}

export function getEntityServerComponentTypes(entityType: EntityType): ReadonlyArray<ServerComponentType> {
   return ENTITY_SERVER_COMPONENT_TYPES[entityType];
}

export function getEntityClientComponentTypes(entityType: EntityType): ReadonlyArray<ClientComponentType> {
   return ENTITY_CLIENT_COMPONENT_TYPES[entityType];
}

export function getEntityServerComponentArrays(entityType: EntityType): ReadonlyArray<ServerComponentArray> {
   return SERVER_COMPONENT_ARRAYS[entityType];
}

export function getEntityComponentArrays(entityType: EntityType): ReadonlyArray<ComponentArray> {
   return COMPONENT_ARRAYS[entityType];
}

export function hasIntermediateInfo(entityType: EntityType): boolean {
   return COMPONENT_ARRAYS_HAVE_INTERMEDIATE_INFO[entityType];
}

export function getServerComponentData<T extends ServerComponentType>(entityServerComponentData: EntityServerComponentData, entityComponentTypes: ReadonlyArray<ServerComponentType>, componentType: T): ServerComponentData<T> {
   for (let i = 0; i < entityComponentTypes.length; i++) {
      const currentComponentType = entityComponentTypes[i];
      if (currentComponentType === componentType) {
         const data = entityServerComponentData[i];
         return data as ServerComponentData<T>;
      }
   }

   throw new Error();
}

// Transform component is a special case which can be done faster
export function getTransformComponentData(entityServerComponentData: EntityServerComponentData): TransformComponentData {
   return entityServerComponentData[0] as TransformComponentData;
}

export function getClientComponentData<T extends ClientComponentType>(entityClientComponentData: EntityClientComponentData, entityComponentTypes: ReadonlyArray<ClientComponentType>, componentType: T): ClientComponentData<T> {
   for (let i = 0; i < entityComponentTypes.length; i++) {
      const currentComponentType = entityComponentTypes[i];
      if (currentComponentType === componentType) {
         const data = entityClientComponentData[i];
         return data as ClientComponentData<T>;
      }
   }

   throw new Error();
}