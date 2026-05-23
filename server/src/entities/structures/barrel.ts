import { EntityType, StatusEffect, Inventory, InventoryName, Point, HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import Tribe from "../../Tribe.js";
import { BarrelComponent } from "../../components/BarrelComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { Hitbox } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";

export function createBarrelConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new CircularBox(position, new Point(0, 0), rotation, 40);
   const hitbox = new Hitbox(transformComponent, null, true, box, 1.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(20);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.poisoned);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);
   
   const inventoryComponent = new InventoryComponent();

   const inventory = new Inventory(3, 3, InventoryName.inventory);
   addInventoryToInventoryComponent(inventoryComponent, inventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true });
   
   const barrelComponent = new BarrelComponent();
   
   return {
      entityType: EntityType.barrel,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         inventoryComponent,
         barrelComponent
      ],
      lights: []
   };
}