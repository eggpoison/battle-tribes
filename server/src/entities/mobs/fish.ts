import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType, FishColour } from "battletribes-shared/entities";
import { angle, customTickIntervalHasPassed, Point, polarVec2, UtilVars } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { FishComponent, FishComponentArray } from "../../components/FishComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { TileType } from "battletribes-shared/tiles";
import Layer from "../../Layer";
import { Settings } from "battletribes-shared/settings";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { EscapeAI } from "../../ai/EscapeAI";
import { Biome } from "../../../../shared/src/biomes";
import { AttackingEntitiesComponent } from "../../components/AttackingEntitiesComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { applyAccelerationFromGround, getHitboxTile, Hitbox, addHitboxVelocity, turnHitboxToAngle } from "../../hitboxes";
import { getEntityLayer } from "../../world";

const enum Vars {
   TURN_SPEED = UtilVars.PI / 1.5,
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
   
   if (!layer.tileRaytraceMatchesTileTypes(fishHitbox.box.position.x, fishHitbox.box.position.y, x, y, [TileType.water])) {
      return false;
   }

   return true;
}

const moveFunc = (fish: Entity, pos: Point, acceleration: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.hitboxes[0];

   const direction = fishHitbox.box.position.angleTo(pos);

   const layer = getEntityLayer(fish);
   
   const tileIndex = getHitboxTile(fishHitbox);
   if (layer.tileTypes[tileIndex] === TileType.water) {
      // Swim on water
      applyAccelerationFromGround(fishHitbox, polarVec2(acceleration, direction));
   } else {
      // 
      // Lunge on land
      // 

      const fishComponent = FishComponentArray.getComponent(fish);
      if (customTickIntervalHasPassed(fishComponent.secondsOutOfWater * Settings.TICK_RATE, Vars.LUNGE_INTERVAL)) {
         addHitboxVelocity(fishHitbox, polarVec2(Vars.LUNGE_FORCE, direction));
      }
   }
}

const turnFunc = (fish: Entity, pos: Point, turnSpeed: number, turnDamping: number): void => {
   const transformComponent = TransformComponentArray.getComponent(fish);
   const fishHitbox = transformComponent.hitboxes[0];

   const direction = fishHitbox.box.position.angleTo(pos);

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

export function createFishConfig(position: Point, rotation: number, colour: FishColour): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 28, 56), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.attackingEntities]: attackingEntitiesComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.fish]: fishComponent
      },
      lights: []
   };
}

export function onFishLeaderHurt(fish: Entity, attackingEntity: Entity): void {
   if (HealthComponentArray.hasComponent(attackingEntity)) {
      const fishComponent = FishComponentArray.getComponent(fish);
      fishComponent.attackTargetID = attackingEntity;
   }
}