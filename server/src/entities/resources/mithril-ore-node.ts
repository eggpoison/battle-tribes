import { HitboxCollisionType, RectangularBox, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, ItemType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { MithrilOreNodeComponent } from "../../components/MithrilOreNodeComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

registerEntityLootOnDeath(EntityType.mithrilOreNode, {
   itemType: ItemType.mithrilOre,
   getAmount: () => 1
});

export function createMithrilOreNodeConfig(position: Point, rotation: number, size: number, variant: number, children: ReadonlyArray<Entity>, renderHeight: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.25, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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