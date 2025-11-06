import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../../shared/src/boxes/RectangularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { Entity, EntityType } from "../../../../shared/src/entities";
import { ItemType } from "../../../../shared/src/items/items";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { HealthComponent } from "../../components/HealthComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { MithrilOreNodeComponent } from "../../components/MithrilOreNodeComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.mithrilOreNode]: mithrilOreNodeComponent
      },
      lights: []
   };
}