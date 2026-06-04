import { EntityConfig } from "../../../components.js";
import { CraftingStationComponent } from "../../../components/CraftingStationComponent.js";
import { HealthComponent } from "../../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent.js";
import { TribeComponent } from "../../../components/TribeComponent.js";
import Tribe from "../../../Tribe.js";
import { VirtualStructure } from "../../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { MithrilAnvilComponent } from "../../../components/MithrilAnvilComponent.js";
import { createHitbox, setHitboxIsNonGrassBlocking, setHitboxIsStatic } from "../../../hitboxes.js";
import { StructureConnection } from "../../../structure-placement.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/dist/collision.js";
import { EntityType } from "../../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../../shared/dist/status-effects.js";

export function createMithrilAnvilConfig(x: number, y: number, angle: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Middle box
   {
      const box = createRectangularBox(x, y, -16, 0, angle, 48, 56);
      const hitbox = createHitbox(transformComponent, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxIsStatic(hitbox);
      setHitboxIsNonGrassBlocking(hitbox);
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   // Left box
   {
      const box = createRectangularBox(x, y, -48, 0, angle, 16, 40);
      const hitbox = createHitbox(transformComponent, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxIsStatic(hitbox);
      setHitboxIsNonGrassBlocking(hitbox);
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   // Right box
   {
      const box = createRectangularBox(x, y, 30, 0, angle, 44, 40);
      const hitbox = createHitbox(transformComponent, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxIsStatic(hitbox);
      setHitboxIsNonGrassBlocking(hitbox);
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   const healthComponent = new HealthComponent(50);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned | StatusEffect.freezing);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const craftingStationComponent = new CraftingStationComponent();
   
   const mithrilAnvilComponent = new MithrilAnvilComponent();
   
   return {
      entityType: EntityType.mithrilAnvil,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         craftingStationComponent,
         mithrilAnvilComponent,
      ],
      lights: []
   };
}