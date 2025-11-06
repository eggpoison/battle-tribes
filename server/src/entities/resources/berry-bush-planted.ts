import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { StatusEffect } from "battletribes-shared/status-effects";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { PlantedComponent } from "../../components/PlantedComponent";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { BerryBushPlantedComponent, BerryBushPlantedComponentArray } from "../../components/BerryBushPlantedComponent";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { registerDirtyEntity } from "../../server/player-clients";
import { Hitbox } from "../../hitboxes";
import { Settings } from "../../../../shared/src/settings";

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

export function createBerryBushPlantedConfig(position: Point, rotation: number, planterBox: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 28), 0.3, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.planted]: plantedComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.berryBushPlanted]: berryBushPlantedComponent
      },
      lights: []
   };
}