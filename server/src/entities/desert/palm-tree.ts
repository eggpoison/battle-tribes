import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { StatusEffect } from "../../../../shared/src/status-effects";
import { Point, randInt } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { PalmTreeComponent } from "../../components/PalmTreeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

registerEntityLootOnDeath(EntityType.palmTree, {
   itemType: ItemType.wood,
   getAmount: () => randInt(3, 5)
});

export function createPalmTreeConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 58), 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(20);

   const lootComponent = new LootComponent();
   
   const palmTreeComponent = new PalmTreeComponent();
   
   return {
      entityType: EntityType.palmTree,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         lootComponent,
         palmTreeComponent
      ],
      lights: []
   };
}