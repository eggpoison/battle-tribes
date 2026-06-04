import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent.js";
import { FishComponent, FishComponentArray } from "../../components/FishComponent.js";
import { EntityConfig } from "../../components.js";
import WanderAI from "../../ai/WanderAI.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import Layer from "../../Layer.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { EscapeAI } from "../../ai/EscapeAI.js";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { applyAccelerationFromGround, getHitboxTile, addHitboxVelocity, turnHitboxToAngle, createHitbox } from "../../hitboxes.js";
import { getEntityLayer } from "../../world.js";
import { Biome } from "../../../../shared/dist/biomes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity, FishColour } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { TileType } from "../../../../shared/dist/tiles.js";
import { UtilVar, angle, polarVec2, customTickIntervalHasPassed } from "../../../../shared/dist/utils.js";

const enum Vars {
   TURN_SPEED = UtilVar.PI / 1.5,
   LUNGE_FORCE = 200,
   LUNGE_INTERVAL = 1
}

const enum Vars {
   TILE_VALIDATION_PADDING = 20
}

registerEntityLootOnDeath(EntityType.fish, {
   itemType: ItemType.raw_fish,
   getAmount: () => 1
});

const positionIsOnlyNearWater = (layer: Layer, x: number, y: number): boolean => {
   const minTileX = Math.max(Math.floor((x - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileX = Math.min(Math.floor((x + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1);
   const minTileY = Math.max(Math.floor((y - Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), 0);
   const maxTileY = Math.min(Math.floor((y + Vars.TILE_VALIDATION_PADDING) / Settings.TILE_SIZE), Settings.WORLD_SIZE_TILES - 1);

   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         if (layer.getTileXYBiome(tileX, tileY) !== Biome.river) {
            return false;
         }
      }
   }

   return true;
}

function wanderTargetIsValid(fish: Entity, layer: Layer, x: number, y: number): boolean {
   if (layer.getBiomeAtPosition(x, y) !== Biome.river) {
      return false;
   }

   if (!positionIsOnlyNearWater(layer, x, y)) {
      return false;
   }

   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.hitboxes[0];
   
   if (!layer.tileRaytraceMatchesTileTypes(fishHitbox.box.posX, fishHitbox.box.posY, x, y, [TileType.water])) {
      return false;
   }

   return true;
}

const moveFunc = (fish: Entity, x: number, y: number, acceleration: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.hitboxes[0];

   const moveDir = angle(x - fishHitbox.box.posX, y - fishHitbox.box.posY);

   const layer = getEntityLayer(fish);
   
   const tileIndex = getHitboxTile(fishHitbox);
   if (layer.tileTypes[tileIndex] === TileType.water) {
      // Swim on water
      applyAccelerationFromGround(fishHitbox, polarVec2(acceleration, moveDir));
   } else {
      // 
      // Lunge on land
      // 

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TICK_RATE, Vars.LUNGE_INTERVAL)) {
         addHitboxVelocity(fishHitbox, polarVec2(Vars.LUNGE_FORCE, moveDir));
      }
   }
}

const turnFunc = (fish: Entity, x: number, y: number, turnSpeed: number, turnDamping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.hitboxes[0];

   const direction = angle(x - fishHitbox.box.posX, y - fishHitbox.box.posY);

   const layer = getEntityLayer(fish);
   
   const tileIndex = getHitboxTile(fishHitbox);
   if (layer.tileTypes[tileIndex] === TileType.water) {
      // Swim on water
      turnHitboxToAngle(fishHitbox, direction, turnSpeed, turnDamping, false);
   } else {
      // 
      // Lunge on land
      // 

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TICK_RATE, Vars.LUNGE_INTERVAL)) {
         if (direction !== fishHitbox.box.angle) {
            // @HACK @BUG
            fishHitbox.box.angle = direction;
            transformComponent.isDirty = true;
         }
      }
   }
}

export function createFishConfig(x: number, y: number, angle: number, colour: FishColour): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 28, 56), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(hitbox, 200, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, Math.PI, 0.5, 0.6, wanderTargetIsValid);
   aiHelperComponent.ais[AIType.escape] = new EscapeAI(200, Math.PI * 2/3, 0.5, 1);

   const attackingEntitiesComponent = new AttackingEntitiesComponent(3 * Settings.TICK_RATE);
   
   const lootComponent = new LootComponent();
   
   const fishComponent = new FishComponent(colour);

   return {
      entityType: EntityType.fish,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         attackingEntitiesComponent,
         lootComponent,
         fishComponent
      ],
      lights: []
   };
}

export function onFishLeaderHurt(fish: Entity, attackingEntity: Entity): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}