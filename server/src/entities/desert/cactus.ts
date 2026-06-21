import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType, CactusFlowerSize } from "../../../../shared/dist/entities.js";
import { ItemType } from "../../../../shared/dist/items/items.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";
import { randInt, randFloat, randAngle } from "../../../../shared/dist/utils.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { ChildConfigAttachInfo, EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { CactusComponent, CactusFlower } from "../../components/CactusComponent.js";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";

const RADIUS = 40;
/** Amount the hitbox is brought in. */
const HITBOX_PADDING = 3;

registerEntityLootOnDeath(EntityType.cactus, {
   itemType: ItemType.cactus_spine,
   getAmount: () => randInt(2, 5)
});

export function createCactusConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   // Root hitbox
   const rootHitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, RADIUS - HITBOX_PADDING), 1, HitboxCollisionType.soft, CollisionBit.cactus, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(rootHitbox);
   addHitboxToTransformComponent(transformComponent, rootHitbox);

   const flowers: CactusFlower[] = [];

   // Root hitbox flowers
   let numFlowers = 1;
   while (Math.random() < 0.35 && numFlowers < 5) {
      numFlowers++;
   }
   for (let i = 0; i < numFlowers; i++) {
      const flowerOffsetMagnitude = randFloat(10, 30);
      const flowerOffsetDirection = 2 * Math.PI / 8 * randInt(0, 7);

      flowers.push({
         parentHitboxLocalID: rootHitbox.localID,
         offsetX: flowerOffsetMagnitude * Math.sin(flowerOffsetDirection),
         offsetY: flowerOffsetMagnitude * Math.cos(flowerOffsetDirection),
         angle: randAngle(),
         flowerType: randInt(0, 4),
         size: randInt(0, 1),
      });
   }

   // Low chance for 0 limbs
   // High chance for 1 limb
   // Less chance for 2 limbs
   // Less chance for 3 limbs
   let numLimbs = 0;
   while (Math.random() < 4/5 - numLimbs/5 && numLimbs < 3) {
      numLimbs++;
   }
   
   // Limbs
   for (let i = 0; i < numLimbs; i++) {
      const offsetDirection = randAngle();
      const offsetX = 37 * Math.sin(offsetDirection);
      const offsetY = 37 * Math.cos(offsetDirection);
      const box = createCircularBox(0, 0, offsetX, offsetY, 0, 18);
      const hitbox = createHitbox(transformComponent, rootHitbox, box, 0.4, HitboxCollisionType.soft, CollisionBit.cactus, DEFAULT_COLLISION_MASK);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (Math.random() < 0.45) {
         const flowerOffsetMagnitude = randFloat(6, 10);
         const flowerOffsetDirection = randAngle();

         flowers.push({
            parentHitboxLocalID: hitbox.localID,
            offsetX: flowerOffsetMagnitude * Math.sin(flowerOffsetDirection),
            offsetY: flowerOffsetMagnitude * Math.cos(flowerOffsetDirection),
            angle: randAngle(),
            flowerType: randInt(0, 3),
            size: CactusFlowerSize.small
         });
      }
   }

   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const lootComponent = new LootComponent();

   const childConfigs: ChildConfigAttachInfo[] = [];
   // @SQUEAM: no pears in the clementus shots!
   // if (Math.random() < 0.4) {
   //    const offset = polarVec2((rootHitbox.box as CircularBox).radius, randAngle());

   //    const x = rootHitbox.box.position.x + offset.x;
   //    const y = rootHitbox.box.position.y + offset.y;
   //    const position = new Point(x, y);
      
   //    const config = createPricklyPearConfig(position, offset, randAngle());
   //    childConfigs.push({
   //       entityConfig: config,
   //       attachedHitbox: config.components[ServerComponentType.transform]!.hitboxes[0],
   //       parentHitbox: rootHitbox,
   //       isPartOfParent: true
   //    });
   // }
   
   const cactusComponent = new CactusComponent(flowers, childConfigs.length > 0);

   return {
      entityType: EntityType.cactus,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         lootComponent,
         cactusComponent
      ],
      lights: [],
      childConfigs: childConfigs
   };
}