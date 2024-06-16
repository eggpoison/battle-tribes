import { ServerComponentType } from "./components";
import { EntityType } from "./entities";

const SUMMON_DATA_RECORD = {
   [ServerComponentType.aiHelper]: {},
   [ServerComponentType.arrow]: {},
   [ServerComponentType.berryBush]: {},
   [ServerComponentType.blueprint]: {},
   [ServerComponentType.boulder]: {},
   [ServerComponentType.cactus]: {},
   [ServerComponentType.cooking]: {},
   [ServerComponentType.cow]: {},
   [ServerComponentType.door]: {},
   [ServerComponentType.fish]: {},
   [ServerComponentType.frozenYeti]: {},
   [ServerComponentType.golem]: {},
   [ServerComponentType.health]: {},
   [ServerComponentType.hut]: {},
   [ServerComponentType.iceShard]: {},
   [ServerComponentType.iceSpikes]: {},
   [ServerComponentType.inventory]: {},
   [ServerComponentType.inventoryUse]: {},
   [ServerComponentType.item]: {},
   [ServerComponentType.pebblum]: {},
   [ServerComponentType.physics]: {},
   [ServerComponentType.player]: {},
   [ServerComponentType.rockSpike]: {},
   [ServerComponentType.slime]: {},
   [ServerComponentType.slimeSpit]: {},
   [ServerComponentType.slimewisp]: {},
   [ServerComponentType.snowball]: {},
   [ServerComponentType.statusEffect]: {},
   [ServerComponentType.throwingProjectile]: {},
   [ServerComponentType.tombstone]: {},
   [ServerComponentType.totemBanner]: {},
   [ServerComponentType.tree]: {},
   [ServerComponentType.tribe]: {},
   [ServerComponentType.tribeMember]: {},
   [ServerComponentType.tribesmanAI]: {},
   [ServerComponentType.turret]: {},
   [ServerComponentType.yeti]: {},
   [ServerComponentType.zombie]: {},
   [ServerComponentType.ammoBox]: {},
   [ServerComponentType.wanderAI]: {},
   [ServerComponentType.escapeAI]: {},
   [ServerComponentType.followAI]: {},
   [ServerComponentType.researchBench]: {},
   [ServerComponentType.tunnel]: {},
   [ServerComponentType.buildingMaterial]: {},
   [ServerComponentType.spikes]: {},
   [ServerComponentType.tribeWarrior]: {},
   [ServerComponentType.healingTotem]: {},
   [ServerComponentType.planterBox]: {},
   [ServerComponentType.plant]: {},
   [ServerComponentType.structure]: {},
   [ServerComponentType.fence]: {},
   [ServerComponentType.fenceGate]: {},
   [ServerComponentType.craftingStation]: {},
} satisfies Record<ServerComponentType, object>;

export interface EntitySummonPacket<T extends EntityType = EntityType> {
   readonly position: [number, number];
   readonly rotation: number;
   readonly entityType: T;
   readonly summonData: Partial<{
      // @Temporary: make more specific
      [K in ServerComponentType]: typeof SUMMON_DATA_RECORD[K];
   }>;
}