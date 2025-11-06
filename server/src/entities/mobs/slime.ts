import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { SlimeSize, EntityType, Entity } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randInt, secondsToTicks } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { SlimeComponent, SlimeComponentArray } from "../../components/SlimeComponent";
import Layer from "../../Layer";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "battletribes-shared/biomes";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CraftingStationComponent } from "../../components/CraftingStationComponent";
import { registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared";
import { Hitbox } from "../../hitboxes";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.slime]: slimeComponent,
         [ServerComponentType.craftingStation]: craftingStationComponent
      },
      lights: []
   };
}