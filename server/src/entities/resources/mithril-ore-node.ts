import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { MithrilOreNodeComponent } from "../../components/MithrilOreNodeComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.mithrilOreNode, {
   itemType: ItemType.mithrilOre,
   getAmount: () => 1
});

export function createMithrilOreNodeConfig(x: number, y: number, angle: number, size: number, variant: number, children: ReadonlyArray<Entity>, renderHeight: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 16, 16), 0.25, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(0);
   
   const lootComponent = new LootComponent();
   
   const mithrilOreNodeComponent = new MithrilOreNodeComponent(size, variant, children, renderHeight);
   
   return {
      entityType: EntityType.mithrilOreNode,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         mithrilOreNodeComponent
      ],
      lights: []
   };
}