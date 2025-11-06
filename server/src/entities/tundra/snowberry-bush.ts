import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent";
import { Hitbox } from "../../hitboxes";
import { SnowberryBushComponent, SnowberryBushComponentArray } from "../../components/SnowberryBushComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { registerDirtyEntity } from "../../server/player-clients";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.snowberryBush]: snowberryBushComponent
      },
      lights: []
   };
}