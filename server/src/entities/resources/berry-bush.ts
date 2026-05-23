import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Point, StatusEffect, CircularBox, HitboxCollisionType, ItemType } from "battletribes-shared";
import { BerryBushComponent, BerryBushComponentArray } from "../../components/BerryBushComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent.js";
import { registerDirtyEntity } from "../../server/player-clients.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnHit(EntityType.berryBush, {
   itemType: ItemType.berry,
   getAmount: (berryBush: Entity) => {
      const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
      return berryBushComponent.numBerries > 0 ? 1 : 0;
   },
   onItemDrop: (berryBush: Entity) => {
      // @Hack: this type of logic feels like it should be done in a component
      const berryBushComponent = BerryBushComponentArray.getComponent(berryBush);
      if (berryBushComponent.numBerries > 0) {
         berryBushComponent.numBerries--;
         registerDirtyEntity(berryBush);
      }
   }
});

export function createBerryBushConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 40), 1, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const lootComponent = new LootComponent();
   
   const berryBushComponent = new BerryBushComponent();
   
   return {
      entityType: EntityType.berryBush,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         berryBushComponent
      ],
      lights: []
   };
}