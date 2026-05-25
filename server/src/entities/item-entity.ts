import { CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, Settings, Point, randAngle, getSubtileIndex, Item, ItemType, HitboxCollisionType, createRectangularBox } from "battletribes-shared";
import { ItemComponent } from "../components/ItemComponent.js";
import { EntityConfig, LightCreationInfo } from "../components.js";
import { addHitboxToTransformComponent, getRandomPositionInBox, getRandomWeightedHitbox, TransformComponent, TransformComponentArray } from "../components/TransformComponent.js";
import Layer from "../Layer.js";
import { createEntity, getEntityLayer } from "../world.js";
import { createHitbox, Hitbox } from "../hitboxes.js";
import { createLight } from "../lights.js";
import { createItem } from "../items.js";

export function createItemEntityConfig(x: number, y: number, angle: number, item: Item, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const itemComponent = new ItemComponent(item, throwingEntity);

   const lights: Array<LightCreationInfo> = [];
   // @Hack: hardcoded!!
   if (item.type === ItemType.slurb) {
      const light = createLight(new Point(0, 0), 0.6, 0.5, 4, 1, 0.1, 1);
      const lightCreationInfo: LightCreationInfo = {
         light: light,
         attachedHitbox: hitbox
      };
      lights.push(lightCreationInfo);
   }
   
   return {
      entityType: EntityType.itemEntity,
      components: [
         transformComponent,
         itemComponent
      ],
      lights: lights
   };
}

const generateItemEntitySpawnPosition = (entityLayer: Layer, transformComponent: TransformComponent, hitboxIdx?: number): Point | null => {
   for (let attempts = 0; attempts < 50; attempts++) {
      // @Speed: if hitboxIdx is defined, then this does the same thing every loop. also this condition is checked every time
      let hitbox: Hitbox;
      if (hitboxIdx !== undefined) {
         hitbox = transformComponent.hitboxes[hitboxIdx];
      } else {
         hitbox = getRandomWeightedHitbox(transformComponent);
      }
      
      const position = getRandomPositionInBox(hitbox.box);

      const subtileIndex = getSubtileIndex(Math.floor(position.x / Settings.SUBTILE_SIZE), Math.floor(position.y / Settings.SUBTILE_SIZE));
      // Don't spawn item entities in walls otherwise they can get stuck in the wall
      if (!entityLayer.subtileIsWall(subtileIndex)) {
         return position;
      }
   }

   return null;
}

export function createItemsOverEntity(entity: Entity, itemType: ItemType, amount: number, hitboxIdx?: number): void {
   const layer = getEntityLayer(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < amount; i++) {
      const spawnPosition = generateItemEntitySpawnPosition(layer, transformComponent, hitboxIdx);
      if (spawnPosition === null) {
         continue;
      }
      
      // Create item entity
      const config = createItemEntityConfig(spawnPosition.x, spawnPosition.y, randAngle(), createItem(itemType, 1, "", ""), null);
      createEntity(config, getEntityLayer(entity), 0);
   }
}