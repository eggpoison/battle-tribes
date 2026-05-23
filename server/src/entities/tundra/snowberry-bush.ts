import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Point, HitboxCollisionType, CircularBox, ItemType } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { SnowberryBushComponent, SnowberryBushComponentArray } from "../../components/SnowberryBushComponent.js";
import { registerDirtyEntity } from "../../server/player-clients.js";

registerEntityLootOnHit(EntityType.snowberryBush, {
   itemType: ItemType.snowberry,
   getAmount: (snowberryBush: Entity) => {
      const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);
      return snowberryBushComponent.numBerries > 0 ? 1 : 0;
   },
   onItemDrop: (snowberryBush: Entity) => {
      const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);
      if (snowberryBushComponent.numBerries > 0) {
         snowberryBushComponent.numBerries--;
         registerDirtyEntity(snowberryBush);
      }
   }
});

export function createSnowberryBushConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 34), 0.9, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const lootComponent = new LootComponent();
   
   const snowberryBushComponent = new SnowberryBushComponent();
   
   return {
      entityType: EntityType.snowberryBush,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         snowberryBushComponent
      ],
      lights: []
   };
}