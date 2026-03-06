import { EntityType, PacketReader, ServerComponentType } from "../../../shared/src";
import { ClientComponentType } from "./entity-components/client-component-types";

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

export function registerEntityComponentTypesFromData(reader: PacketReader): void {
   const numEntityTypes = reader.readNumber();
   for (let i = 0; i < numEntityTypes; i++) {
      const componentTypes = new Array<ServerComponentType>();
      
      const numComponents = reader.readNumber();
      for (let i = 0; i < numComponents; i++) {
         const componentType: ServerComponentType = reader.readNumber();
         componentTypes.push(componentType);
      }

      ENTITY_SERVER_COMPONENT_TYPES.push(componentTypes);
   }
}

export function getEntityServerComponentTypes(entityType: EntityType): ReadonlyArray<ServerComponentType> {
   return ENTITY_SERVER_COMPONENT_TYPES[entityType];
}

export function getEntityClientComponentTypes(entityType: EntityType): ReadonlyArray<ClientComponentType> {
   return ENTITY_CLIENT_COMPONENT_TYPES[entityType];
}