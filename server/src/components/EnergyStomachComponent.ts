import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { Settings } from "../../../shared/src/settings";
import { Hitbox } from "../hitboxes";
import { ComponentArray } from "./ComponentArray";
import { damageEntity } from "./HealthComponent";
import { getRandomPositionInBox, TransformComponentArray } from "./TransformComponent";

/** Interval between damage ticks */
const DAMAGE_TICK_INTERVAL_TICKS = 2 * Settings.TICK_RATE;

export class EnergyStomachComponent {
   /** Units of energy that the creature can store */
   public readonly energyCapacity: number;
   /** Number of energy units expended by the creature per second */
   public readonly metabolism: number;

   public energy: number;

   public damageTickTimer = 0;
   public readonly hungerDamage: number;
   
   constructor(energyCapacity: number, metabolism: number, hungerDamage: number) {
      this.energyCapacity = energyCapacity;
      this.energy = energyCapacity;
      this.metabolism = metabolism;
      this.hungerDamage = hungerDamage;
   }
}

export const EnergyStomachComponentArray = new ComponentArray<EnergyStomachComponent>(ServerComponentType.energyStomach, true, getDataLength, addDataToPacket);
EnergyStomachComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

function onTick(entity: Entity): void {
   // @SQUEAM
   if(1+1===2)return;
   const energyStomachComponent = EnergyStomachComponentArray.getComponent(entity);
   energyStomachComponent.energy -= energyStomachComponent.metabolism * Settings.DT_S;
   if (energyStomachComponent.energy < 0) {
      energyStomachComponent.energy = 0;
      if (energyStomachComponent.damageTickTimer === 0) {
         energyStomachComponent.damageTickTimer = DAMAGE_TICK_INTERVAL_TICKS;

         const transformComponent = TransformComponentArray.getComponent(entity);
         // @Hack
         const hitbox = transformComponent.hitboxes[0];
         damageEntity(hitbox, null, energyStomachComponent.hungerDamage, 0, AttackEffectiveness.effective, getRandomPositionInBox(hitbox.box), 0);
      } else {
         energyStomachComponent.damageTickTimer--;
      }
   } else {
      energyStomachComponent.damageTickTimer = DAMAGE_TICK_INTERVAL_TICKS;
   }
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

/** Returns how full an entity is as a proportion of their energy capacity */
export function getEntityFullness(entity: Entity): number {
   if (!EnergyStomachComponentArray.hasComponent(entity)) {
      throw new Error();
   }

   const energyStomachComponent = EnergyStomachComponentArray.getComponent(entity);
   return energyStomachComponent.energy / energyStomachComponent.energyCapacity;
}

export function addHungerEnergy(entity: Entity, energy: number): void {
   if (!EnergyStomachComponentArray.hasComponent(entity)) {
      throw new Error();
   }

   const energyStomachComponent = EnergyStomachComponentArray.getComponent(entity);
   energyStomachComponent.energy += energy;
   if (energyStomachComponent.energy > energyStomachComponent.energyCapacity) {
      energyStomachComponent.energy = energyStomachComponent.energyCapacity;
   }
}