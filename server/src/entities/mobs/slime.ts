import { DEFAULT_COLLISION_MASK, CollisionBit, SlimeSize, EntityType, Entity, Settings, StatusEffect, Point, randInt, secondsToTicks, HitboxCollisionType, CircularBox, Biome, ItemType } from "battletribes-shared";
import { HealthComponent } from "../../components/HealthComponent.js";
import { SlimeComponent, SlimeComponentArray } from "../../components/SlimeComponent.js";
import Layer from "../../Layer.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import WanderAI from "../../ai/WanderAI.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { CraftingStationComponent } from "../../components/CraftingStationComponent.js";
import { registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared.js";
import { Hitbox } from "../../hitboxes.js";

export interface SlimeEntityAnger {
   angerAmount: number;
   readonly target: Entity;
}

export const SLIME_RADII: ReadonlyArray<number> = [32, 44, 60];
export const SLIME_MERGE_WEIGHTS: ReadonlyArray<number> = [2, 5, 11];
export const SLIME_MAX_MERGE_WANT: ReadonlyArray<number> = [15 * Settings.TICK_RATE, 40 * Settings.TICK_RATE, 75 * Settings.TICK_RATE];

export const SLIME_MERGE_TIME = 7.5;

export const SPIT_COOLDOWN_TICKS = 4 * Settings.TICK_RATE;
export const SPIT_CHARGE_TIME_TICKS = SPIT_COOLDOWN_TICKS + secondsToTicks(0.8);

const MAX_HEALTH: ReadonlyArray<number> = [10, 20, 35];
export const SLIME_SPEED_MULTIPLIERS: ReadonlyArray<number> = [2.5, 1.75, 1];
const VISION_RANGES = [200, 250, 300];

registerEntityLootOnDeath(EntityType.slime, {
   itemType: ItemType.slimeball,
   getAmount: (entity: Entity) => {
      const slimeComponent = SlimeComponentArray.getComponent(entity);
      switch (slimeComponent.size) {
         case SlimeSize.small: return randInt(1, 2);
         case SlimeSize.medium: return randInt(3, 5);
         case SlimeSize.large: return randInt(6, 9);
      }
   }
});
registerEntityLootOnDeath(EntityType.slime, {
   itemType: ItemType.leather,
   getAmount: () => randInt(1, 2)
});

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getBiomeAtPosition(x, y) === Biome.swamp;
}

const moveFunc = (slime: Entity, pos: Point, _acceleration: number): void => {
   const slimeComponent = SlimeComponentArray.getComponent(slime);
   accelerateEntityToPosition(slime, pos, 150 * SLIME_SPEED_MULTIPLIERS[slimeComponent.size]);
}

const turnFunc = (slime: Entity, pos: Point): void => {
   turnToPosition(slime, pos, 2 * Math.PI, 1);
}

export function createSlimeConfig(position: Point, rotation: number, size: SlimeSize): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, SLIME_RADII[size]), 1 + size * 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(MAX_HEALTH[size]);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const aiHelperComponent = new AIHelperComponent(hitbox, VISION_RANGES[size], moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(150 * SLIME_SPEED_MULTIPLIERS[size], 2 * Math.PI, 1, 0.5, positionIsValidCallback)
   
   const slimeComponent = new SlimeComponent(size);

   const craftingStationComponent = new CraftingStationComponent();
   
   return {
      entityType: EntityType.slime,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         slimeComponent,
         craftingStationComponent
      ],
      lights: []
   };
}