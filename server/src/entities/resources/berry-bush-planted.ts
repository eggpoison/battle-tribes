import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, StatusEffect, HitboxCollisionType, CircularBox, ItemType, Settings } from "battletribes-shared";
import { PlantedComponent } from "../../components/PlantedComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { BerryBushPlantedComponent, BerryBushPlantedComponentArray } from "../../components/BerryBushPlantedComponent.js";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent.js";
import { registerDirtyEntity } from "../../server/player-clients.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnHit(EntityType.berryBushPlanted, {
   itemType: ItemType.berry,
   getAmount: (berryBush: Entity) => {
      const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(berryBush);
      return berryBushPlantedComponent.numFruit > 0 ? 1 : 0;
   },
   onItemDrop: (berryBush: Entity) => {
      // @Hack: this type of logic feels like it should be done in a component
      const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(berryBush);
      if (berryBushPlantedComponent.numFruit > 0) {
         berryBushPlantedComponent.numFruit--;
         registerDirtyEntity(berryBush);
      }
   }
});

export function createBerryBushPlantedConfig(x: number, y: number, angle: number, planterBox: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 32), 0.3, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const plantedComponent = new PlantedComponent(planterBox);

   const lootComponent = new LootComponent();

   const berryBushPlantedComponent = new BerryBushPlantedComponent();
   // @SQUEAM for a horse archer shot
   berryBushPlantedComponent.numFruit = 4;
   berryBushPlantedComponent.plantGrowthTicks = 60 * Settings.TICK_RATE;

   return {
      entityType: EntityType.berryBushPlanted,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         plantedComponent,
         lootComponent,
         berryBushPlantedComponent
      ],
      lights: []
   };
}