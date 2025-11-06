import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { BerryBushComponent, BerryBushComponentArray } from "../../components/BerryBushComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { LootComponent, registerEntityLootOnHit } from "../../components/LootComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { registerDirtyEntity } from "../../server/player-clients";
import { Hitbox } from "../../hitboxes";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.berryBush]: berryBushComponent
      },
      lights: []
   };
}