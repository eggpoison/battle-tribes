import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, Entity, getTileIndexIncludingEdges, Point, randInt, TileIndex, Settings, ItemType, Biome, CircularBox, HitboxCollisionType, HitboxFlag } from "battletribes-shared";
import { HealthComponent } from "../../components/HealthComponent.js";
import { YetiComponent, YetiComponentArray } from "../../components/YetiComponent.js";
import Layer from "../../Layer.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import WanderAI from "../../ai/WanderAI.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { accelerateEntityToPosition, turnToPosition } from "../../ai-shared.js";
import { Hitbox } from "../../hitboxes.js";

export const YETI_SNOW_THROW_COOLDOWN = 7;

export enum SnowThrowStage {
   windup,
   hold,
   return
}

registerEntityLootOnDeath(EntityType.yeti, {
   itemType: ItemType.rawYetiFlesh,
   getAmount: () => randInt(4, 7)
});
registerEntityLootOnDeath(EntityType.yeti, {
   itemType: ItemType.yeti_hide,
   getAmount: () => randInt(2, 3)
});
registerEntityLootOnDeath(EntityType.yeti, {
   itemType: ItemType.deepfrost_heart,
   getAmount: () => Math.random() < 0.5 ? 1 : 0
});

function wanderPositionIsValid(entity: Entity, layer: Layer, x: number, y: number): boolean {
   const tileX = Math.floor(x / Settings.TILE_SIZE);
   const tileY = Math.floor(y / Settings.TILE_SIZE);
   const tileIndex = getTileIndexIncludingEdges(tileX, tileY);

   const yetiComponent = YetiComponentArray.getComponent(entity);
   return layer.getTileBiome(tileIndex) === Biome.tundra && yetiComponent.territory.includes(tileIndex);
}

const moveFunc = (slimewisp: Entity, pos: Point, acceleration: number): void => {
   accelerateEntityToPosition(slimewisp, pos, acceleration);
}

const turnFunc = (slimewisp: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   turnToPosition(slimewisp, pos, turnSpeed, turnDamping);
}

export function createYetiConfig(position: Point, rotation: number, territory: ReadonlyArray<TileIndex>): EntityConfig {
   const transformComponent = new TransformComponent();

   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 64), 3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_BODY]);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const headOffset = new Point(0, 36);
   const headPosition = position.copy();
   headPosition.add(headOffset);
   const headHitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(headPosition, headOffset, 0, 28), 3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.YETI_HEAD]);
   addHitboxToTransformComponent(transformComponent, headHitbox);
   
   const healthComponent = new HealthComponent(75);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(headHitbox, 500, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(100, Math.PI * 1.5, 1, 0.6, wanderPositionIsValid);
   
   const attackingEntitiesComponent = new AttackingEntitiesComponent(5 * Settings.TICK_RATE);
   
   const lootComponent = new LootComponent();
   
   const yetiComponent = new YetiComponent(territory);
   
   return {
      entityType: EntityType.yeti,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         lootComponent,
         yetiComponent
      ],
      lights: []
   };
}