import { CowSpecies } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "../Entity";
import { randFloat, randInt } from "webgl-test-shared/dist/utils";
import { createItemEntity } from "../entities/item-entity";
import { ItemType } from "webgl-test-shared/dist/items";
import { EntityEvent } from "webgl-test-shared/dist/entity-events";

const enum Vars {
   MIN_POOP_PRODUCTION_COOLDOWN = 5 * Settings.TPS,
   MAX_POOP_PRODUCTION_COOLDOWN = 15 * Settings.TPS,
   BERRY_FULLNESS_VALUE = 0.15,
   MIN_POOP_PRODUCTION_FULLNESS = 0.4,
   BOWEL_EMPTY_TIME_TICKS = 55 * Settings.TPS,
   MAX_BERRY_CHASE_FULLNESS = 0.8
}

export class CowComponent {
   public readonly species: CowSpecies;
   public grazeProgressTicks = 0;
   public grazeCooldownTicks: number;

   // For shaking berry bushes
   public targetBushID = 0;
   public bushShakeTimer = 0;

   /** Used when producing poop. */
   public bowelFullness = 0;
   public poopProductionCooldownTicks = 0;

   constructor(species: CowSpecies, grazeCooldownTicks: number) {
      this.species = species;
      this.grazeCooldownTicks = grazeCooldownTicks;
   }
}

const poop = (cow: Entity, cowComponent: CowComponent): void => {
   cowComponent.poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);
   
   // Shit it out
   const poopPosition = cow.position.offset(randFloat(0, 16), 2 * Math.PI * Math.random());
   createItemEntity(poopPosition, 2 * Math.PI * Math.random(), ItemType.poop, 1, 0);

   // Let it out
   cow.tickEvents.push(EntityEvent.cowFart);
}

export function updateCowComponent(cow: Entity, cowComponent: CowComponent): void {
   if (cowComponent.poopProductionCooldownTicks > 0) {
      cowComponent.poopProductionCooldownTicks--;
   } else if (cowComponent.bowelFullness >= Vars.MIN_POOP_PRODUCTION_FULLNESS) {
      poop(cow, cowComponent);
   }

   cowComponent.bowelFullness -= 1 / Vars.BOWEL_EMPTY_TIME_TICKS;
   if (cowComponent.bowelFullness < 0) {
      cowComponent.bowelFullness = 0;
   }

   if (cowComponent.grazeCooldownTicks > 0) {
      cowComponent.grazeCooldownTicks--;
   }
}

export function eatBerry(berryItemEntity: Entity, cowComponent: CowComponent): void {
   cowComponent.bowelFullness += Vars.BERRY_FULLNESS_VALUE;
   
   berryItemEntity.destroy();
}

export function wantsToEatBerries(cowComponent: CowComponent): boolean {
   return cowComponent.bowelFullness <= Vars.MAX_BERRY_CHASE_FULLNESS;
}