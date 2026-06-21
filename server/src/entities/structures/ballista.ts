import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { StructureComponent } from "../../components/StructureComponent.js";
import Tribe from "../../Tribe.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { TurretComponent } from "../../components/TurretComponent.js";
import { AIHelperComponent } from "../../components/AIHelperComponent.js";
import { AmmoBoxComponent } from "../../components/AmmoBoxComponent.js";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent.js";
import { BallistaComponent } from "../../components/BallistaComponent.js";
import { VirtualStructure } from "../../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StructureConnection } from "../../structure-placement.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { Inventory, InventoryName } from "../../../../shared/dist/items/items.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createBallistaConfig(x: number, y: number, angle: number, tribe: Tribe, connections: StructureConnection[], virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = createRectangularBox(x, y, 0, 0, angle, 100, 100);
   const hitbox = createHitbox(transformComponent, null, box, 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(100);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const tribeComponent = new TribeComponent(tribe);

   const turretComponent = new TurretComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 550, moveFunc, turnFunc);
   
   const ammoBoxComponent = new AmmoBoxComponent();

   const inventoryComponent = new InventoryComponent();

   const ammoBoxInventory = new Inventory(3, 1, InventoryName.ammoBoxInventory);
   addInventoryToInventoryComponent(inventoryComponent, ammoBoxInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true });

   const ballistaComponent = new BallistaComponent();
   
   return {
      entityType: EntityType.ballista,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         structureComponent,
         tribeComponent,
         turretComponent,
         aiHelperComponent,
         ammoBoxComponent,
         inventoryComponent,
         ballistaComponent
      ],
      lights: []
   };
}