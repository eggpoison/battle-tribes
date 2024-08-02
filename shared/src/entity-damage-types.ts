import { EntityType } from "./entities";
import { ITEM_TYPE_RECORD as ITEM_CATEGORY_RECORD, Item } from "./items/items";

const enum DamageType {
   basic,
   weapon,
   axe,
   pickaxe
}

export const enum AttackEffectiveness {
   stopped = 0,
   ineffective = 1,
   effective = 2
}

interface EntityDamageInfo {
   readonly effectiveDamageTypes: ReadonlyArray<DamageType>;
   readonly stoppedDamageTypes: ReadonlyArray<DamageType>;
}

// @Cleanup: make this a parameter of the healthcomponent?
const ENTITY_DAMAGE_INFO_RECORD: Record<EntityType, EntityDamageInfo> = {
   [EntityType.cow]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.zombie]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.tombstone]: {
      effectiveDamageTypes: [DamageType.pickaxe],
      stoppedDamageTypes: []
   },
   [EntityType.tree]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.workbench]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.boulder]: {
      effectiveDamageTypes: [DamageType.pickaxe],
      stoppedDamageTypes: [DamageType.basic]
   },
   [EntityType.berryBush]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.cactus]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.yeti]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.iceSpikes]: {
      effectiveDamageTypes: [DamageType.weapon, DamageType.pickaxe],
      stoppedDamageTypes: []
   },
   [EntityType.slime]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.slimewisp]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.player]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.tribeWorker]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.tribeWarrior]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.tribeTotem]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.workerHut]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.warriorHut]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.barrel]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.campfire]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.furnace]: {
      effectiveDamageTypes: [DamageType.pickaxe],
      stoppedDamageTypes: []
   },
   [EntityType.snowball]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.krumblid]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.frozenYeti]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.fish]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.itemEntity]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.woodenArrow]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.ballistaWoodenBolt]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.ballistaRock]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.ballistaSlimeball]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.ballistaFrostcicle]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.slingTurretRock]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.iceShardProjectile]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.rockSpikeProjectile]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.spearProjectile]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.researchBench]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.wall]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.slimeSpit]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.spitPoison]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.door]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.battleaxeProjectile]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.golem]: {
      effectiveDamageTypes: [DamageType.pickaxe],
      stoppedDamageTypes: [DamageType.basic]
   },
   [EntityType.planterBox]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.iceArrow]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.pebblum]: {
      effectiveDamageTypes: [DamageType.pickaxe],
      stoppedDamageTypes: []
   },
   [EntityType.embrasure]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.tunnel]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.floorSpikes]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.wallSpikes]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.floorPunjiSticks]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.wallPunjiSticks]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.blueprintEntity]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.ballista]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.slingTurret]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.healingTotem]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.plant]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.fence]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.fenceGate]: {
      effectiveDamageTypes: [DamageType.axe],
      stoppedDamageTypes: []
   },
   [EntityType.frostshaper]: {
      effectiveDamageTypes: [DamageType.weapon],
      stoppedDamageTypes: []
   },
   [EntityType.stonecarvingTable]: {
      effectiveDamageTypes: [DamageType.pickaxe],
      stoppedDamageTypes: []
   },
   [EntityType.grassStrand]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.decoration]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.reed]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   },
   [EntityType.lilypad]: {
      effectiveDamageTypes: [],
      stoppedDamageTypes: []
   }
};

const getItemDamageTypes = (item: Item | null): ReadonlyArray<DamageType> => {
   if (item === null) {
      return [DamageType.basic];
   }

   const category = ITEM_CATEGORY_RECORD[item.type];
   switch (category) {
      case "backpack":
      case "bow":
      case "hammer":
      case "bow":
      case "crossbow":
      case "glove":
      case "healing":
      case "material":
      case "placeable":
      case "armour": return [DamageType.basic];
      case "axe": return [DamageType.axe];
      case "battleaxe": return [DamageType.axe, DamageType.weapon];
      case "pickaxe": return [DamageType.pickaxe];
      case "sword":
      case "spear": return [DamageType.weapon];
   }
}

const getDamageTypeEffectiveness = (damageType: DamageType, entityDamageInfo: EntityDamageInfo): AttackEffectiveness => {
   if (entityDamageInfo.effectiveDamageTypes.includes(damageType)) {
      return AttackEffectiveness.effective;
   }

   if (entityDamageInfo.stoppedDamageTypes.includes(damageType)) {
      return AttackEffectiveness.stopped;
   }

   return AttackEffectiveness.ineffective;
}

// @Incomplete: account for building material for walls, tunnels, etc.
export function calculateAttackEffectiveness(item: Item | null, attackedEntityType: EntityType): AttackEffectiveness {
   const damageTypes = getItemDamageTypes(item);
   const damageInfo = ENTITY_DAMAGE_INFO_RECORD[attackedEntityType];

   // Return the maximum effectiveness that the item has against the entity
   let maxEffectiveness = AttackEffectiveness.stopped;
   for (let i = 0; i < damageTypes.length; i++) {
      const damageType = damageTypes[i];

      const effectiveness = getDamageTypeEffectiveness(damageType, damageInfo);
      if (effectiveness > maxEffectiveness) {
         maxEffectiveness = effectiveness;
      }
   }

   return maxEffectiveness;
}