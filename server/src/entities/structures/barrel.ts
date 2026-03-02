import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import Tribe from "../../Tribe";
import { BarrelComponent } from "../../components/BarrelComponent";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../shared/src/utils";
import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { Hitbox } from "../../hitboxes";
import { StructureConnection } from "../../structure-placement";

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
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.barrel]: barrelComponent
      },
      lights: []
   };
}