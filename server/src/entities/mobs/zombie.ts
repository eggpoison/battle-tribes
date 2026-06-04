import { HealthComponent } from "../../components/HealthComponent.js";
import { ZombieComponent, ZombieComponentArray } from "../../components/ZombieComponent.js";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import WanderAI from "../../ai/WanderAI.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import Layer from "../../Layer.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { InventoryUseComponent } from "../../components/InventoryUseComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox } from "../../hitboxes.js";
import { Biome } from "../../../../shared/dist/biomes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, Entity } from "../../../../shared/dist/entities.js";
import { ItemType, Inventory, InventoryName } from "../../../../shared/dist/items/items.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { randInt } from "../../../../shared/dist/utils.js";

export const enum ZombieVars {
   CHASE_PURSUE_TIME_TICKS = 5 * Settings.TICK_RATE,
   VISION_RANGE = 375
}

registerEntityLootOnDeath(EntityType.zombie, {
   itemType: ItemType.eyeball,
   getAmount: () => Math.random() < 0.1 ? 1 : 0
});

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createZombieConfig(x: number, y: number, angle: number, isGolden: boolean, tombstone: Entity): EntityConfig {
   const zombieType = isGolden ? 3 : randInt(0, 2);

   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 32), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(20);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const zombieComponent = new ZombieComponent(zombieType, tombstone);

   const aiHelperComponent = new AIHelperComponent(hitbox, ZombieVars.VISION_RANGE, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(150, Math.PI * 3, 1, 0.4, positionIsValidCallback);
   
   const inventoryComponent = new InventoryComponent();
   const inventoryUseComponent = new InventoryUseComponent();
   
   const handSlot = new Inventory(1, 1, InventoryName.handSlot);
   addInventoryToInventoryComponent(inventoryComponent, handSlot, { acceptsPickedUpItems: true, isDroppedOnDeath: true });
   inventoryUseComponent.associatedInventoryNames.push(handSlot.name);

   // @IncompletE: chance to not have man hand instead of offhand
   // @HACK @TEMPORARY: Since currently this will put the limb at the front of the zombie, instead of at its side...
   // if (Math.random() < 0.7) {
   if (true) {
      const offhand = new Inventory(0, 0, InventoryName.offhand);
      addInventoryToInventoryComponent(inventoryComponent, offhand, { acceptsPickedUpItems: true, isDroppedOnDeath: true });
      inventoryUseComponent.associatedInventoryNames.push(offhand.name);
   }

   const lootComponent = new LootComponent();
   
   return {
      entityType: EntityType.zombie,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         zombieComponent,
         aiHelperComponent,
         inventoryComponent,
         inventoryUseComponent,
         lootComponent
      ],
      lights: []
   };
}

export function onZombieVisibleEntityHurt(zombie: Entity, hurtEntity: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   zombieComponent.visibleHurtEntityID = hurtEntity;
   zombieComponent.visibleHurtEntityTicks = 0;
}