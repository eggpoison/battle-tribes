import { EntityType, PacketReader, ServerComponentType } from "../../../shared/src";
import { ClientComponentType } from "./entity-components/client-component-types";
import { ClientComponentData } from "./entity-components/client-components";
import { getClientComponentArray } from "./entity-components/ClientComponentArray";
import { ComponentArray } from "./entity-components/ComponentArray";
import { ServerComponentData } from "./entity-components/components";
import { TransformComponentData } from "./entity-components/server-components/TransformComponent";
import ServerComponentArray, { getServerComponentArray } from "./entity-components/ServerComponentArray";

export type EntityServerComponentData<T extends ServerComponentType = ServerComponentType> = ReadonlyArray<ServerComponentData<T>>;
export type EntityClientComponentData<T extends ClientComponentType = ClientComponentType> = ReadonlyArray<ClientComponentData<T>>;

const ENTITY_SERVER_COMPONENT_TYPES = new Array<Array<ServerComponentType>>();

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

const ENTITY_COMPONENT_ARRAYS = new Array<Array<ComponentArray>>();

export function registerEntityComponentTypesFromData(reader: PacketReader): void {
   const numEntityTypes = reader.readNumber();
   for (let i = 0; i < numEntityTypes; i++) {
      const componentTypes = new Array<ServerComponentType>();
      const componentArrays = new Array<ComponentArray>();
      
      const numComponents = reader.readNumber();
      for (let i = 0; i < numComponents; i++) {
         const componentType: ServerComponentType = reader.readNumber();
         componentTypes.push(componentType);

         const componentArray = getServerComponentArray(componentType);
         componentArrays.push(componentArray);
      }

      ENTITY_SERVER_COMPONENT_TYPES.push(componentTypes);

      // Don't forget the client component arrays!!
      const clientComponentTypes = ENTITY_CLIENT_COMPONENT_TYPES[i];
      for (const clientComponentType of clientComponentTypes) {
         const clientComponentArray = getClientComponentArray(clientComponentType);
         componentArrays.push(clientComponentArray);
      }

      ENTITY_COMPONENT_ARRAYS.push(componentArrays);
   }
}

export function getEntityServerComponentTypes(entityType: EntityType): ReadonlyArray<ServerComponentType> {
   return ENTITY_SERVER_COMPONENT_TYPES[entityType];
}

export function getEntityClientComponentTypes(entityType: EntityType): ReadonlyArray<ClientComponentType> {
   return ENTITY_CLIENT_COMPONENT_TYPES[entityType];
}

export function getEntityComponentArrays(entityType: EntityType): ReadonlyArray<ComponentArray> {
   return ENTITY_COMPONENT_ARRAYS[entityType];
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