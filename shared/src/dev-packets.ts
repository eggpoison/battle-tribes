import { ServerComponentType } from "./components";
import { EntityType } from "./entities";
import { InventoryName, ItemSlots } from "./items/items";

const SUMMON_DATA_RECORD = {
   [ServerComponentType.aiHelper]: {},
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
   [ServerComponentType.inventory]: {
      itemSlots: 0 as Partial<Record<InventoryName, ItemSlots>>
   },
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
   [ServerComponentType.tribe]: {
      tribeID: 0 as number
   },
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
   [ServerComponentType.punjiSticks]: {},
   [ServerComponentType.tribeWarrior]: {},
   [ServerComponentType.healingTotem]: {},
   [ServerComponentType.planterBox]: {},
   [ServerComponentType.plant]: {},
   [ServerComponentType.structure]: {},
   [ServerComponentType.fence]: {},
   [ServerComponentType.fenceGate]: {},
   [ServerComponentType.craftingStation]: {},
   [ServerComponentType.transform]: {},
   [ServerComponentType.projectile]: {},
   [ServerComponentType.iceArrow]: {},
   [ServerComponentType.layeredRod]: {},
   [ServerComponentType.decoration]: {},
   [ServerComponentType.spitPoisonArea]: {},
   [ServerComponentType.battleaxeProjectile]: {},
   [ServerComponentType.spearProjectile]: {},
   [ServerComponentType.krumblid]: {},
   [ServerComponentType.damageBox]: {},
   [ServerComponentType.guardian]: {}
} satisfies Record<ServerComponentType, object>;

export type ComponentSummonData<T extends ServerComponentType> = typeof SUMMON_DATA_RECORD[T];

export type EntitySummonData = Partial<{
   // @Temporary: make more specific
   [K in ServerComponentType]: ComponentSummonData<K>;
}>;

export interface EntitySummonPacket<T extends EntityType = EntityType> {
   readonly position: [number, number];
   readonly rotation: number;
   readonly entityType: T;
   readonly summonData: EntitySummonData;
}