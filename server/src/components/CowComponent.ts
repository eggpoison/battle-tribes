import { CowSpecies, EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { randFloat, randInt } from "webgl-test-shared/dist/utils";
import { EntityTickEvent, EntityTickEventType } from "webgl-test-shared/dist/entity-events";
import { CowComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { COW_GRAZE_TIME_TICKS } from "../entities/mobs/cow";
import { ComponentArray } from "./ComponentArray";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { registerEntityTickEvent } from "../server/player-clients";
import { TransformComponentArray } from "./TransformComponent";
import Board from "../Board";
import { createItemEntityConfig } from "../entities/item-entity";
import { createEntityFromConfig } from "../Entity";
import { Packet } from "webgl-test-shared/dist/packets";

const enum Vars {
   MIN_POOP_PRODUCTION_COOLDOWN = 5 * Settings.TPS,
   MAX_POOP_PRODUCTION_COOLDOWN = 15 * Settings.TPS,
   BERRY_FULLNESS_VALUE = 0.15,
   MIN_POOP_PRODUCTION_FULLNESS = 0.4,
   BOWEL_EMPTY_TIME_TICKS = 55 * Settings.TPS,
   MAX_BERRY_CHASE_FULLNESS = 0.8
}

export interface CowComponentParams {
   readonly species: CowSpecies;
   readonly grazeCooldownTicks: number;
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

   constructor(params: CowComponentParams) {
      this.species = params.species;
      this.grazeCooldownTicks = params.grazeCooldownTicks;
   }
}

export const CowComponentArray = new ComponentArray<CowComponent>(ServerComponentType.cow, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

const poop = (cow: EntityID, cowComponent: CowComponent): void => {
   cowComponent.poopProductionCooldownTicks = randInt(Vars.MIN_POOP_PRODUCTION_COOLDOWN, Vars.MAX_POOP_PRODUCTION_COOLDOWN);
   
   // Shit it out
   const transformComponent = TransformComponentArray.getComponent(cow);
   const poopPosition = transformComponent.position.offset(randFloat(0, 16), 2 * Math.PI * Math.random());
   const config = createItemEntityConfig();
   config[ServerComponentType.transform].position.x = poopPosition.x;
   config[ServerComponentType.transform].position.y = poopPosition.y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.item].itemType = ItemType.poop;
   config[ServerComponentType.item].amount = 1;
   createEntityFromConfig(config);

   // Let it out
   const event: EntityTickEvent<EntityTickEventType.cowFart> = {
      entityID: cow,
      type: EntityTickEventType.cowFart,
      data: 0
   };
   registerEntityTickEvent(cow, event);
}

export function updateCowComponent(cow: EntityID, cowComponent: CowComponent): void {
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

export function eatBerry(berryItemEntity: EntityID, cowComponent: CowComponent): void {
   cowComponent.bowelFullness += Vars.BERRY_FULLNESS_VALUE;
   
   Board.destroyEntity(berryItemEntity);
}

export function wantsToEatBerries(cowComponent: CowComponent): boolean {
   return cowComponent.bowelFullness <= Vars.MAX_BERRY_CHASE_FULLNESS;
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const cowComponent = CowComponentArray.getComponent(entity);
   
   packet.addNumber(cowComponent.species);
   packet.addNumber(cowComponent.grazeProgressTicks > 0 ? cowComponent.grazeProgressTicks / COW_GRAZE_TIME_TICKS : -1);
}