import { Point, customTickIntervalHasPassed, lerp, randAngle, randFloat, randInt, randItem, rotatePointAroundOrigin, secondsToTicks, ItemType, ITEM_INFO_RECORD, ConsumableItemInfo, getItemRecipe, Entity, LimbAction, Settings, assert, _point } from "webgl-test-shared";
import { InventoryUseComponentArray, LimbInfo } from "./entity-components/server-components/InventoryUseComponent";
import { getTextureArrayIndex } from "./texture-atlases";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { ParticleColour } from "./rendering/webgl/particle-rendering";
import { createColouredParticle, createSawdustCloud } from "./particles";
import TexturedRenderPart from "./render-parts/TexturedRenderPart";
import { VisualRenderPart } from "./render-parts/render-parts";
import { TribesmanAIComponentArray } from "./entity-components/server-components/TribesmanAIComponent";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getEntityAgeTicks, getEntityRenderObject } from "./world";
import { currentSnapshot } from "./networking/snapshots";
import { getRenderPartAge } from "./render-parts/render-part-ages";

enum CustomItemState {
   usingMedicine,
   crafting
}

const MIN_LIMB_DIRECTION = 0.2;
const MAX_LIMB_DIRECTION = 0.9;

const MIN_LIMB_MOVE_INTERVAL = secondsToTicks(0.2);
const MAX_LIMB_MOVE_INTERVAL = secondsToTicks(0.4);

const BANDAGE_LIFETIME_TICKS = secondsToTicks(1.25);

// @Incomplete: Investigate using slices of the actual item images instead of hardcoded pixel colours
const INGREDIENT_PARTICLE_COLOURS: Partial<Record<ItemType, ReadonlyArray<ParticleColour>>> = {
   [ItemType.wood]: [[114/255, 49/255, 0], [135/255, 74/255, 0], [153/255, 92/255, 6/255]]
};

const MEDICINE_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [[217/255, 26/255, 20/255], [63/255, 204/255, 91/255]];

export function generateRandomLimbPosition(): Point {
   const offsetDirection = randAngle();
   const offsetMagnitude = 8 * Math.random();

   const x = offsetMagnitude * Math.sin(offsetDirection);
   const y = 4 + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

export function createCraftingAnimationParticles(entity: Entity, limbIdx: number): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
   
   const recipe = getItemRecipe(tribesmanComponent.craftingItemType);
   if (recipe === null) {
      // @Temporary
      // console.warn("No recipe");
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   // @Hack
   const hitbox = transformComponent.hitboxes[0];

   for (const itemTypeString of Object.keys(recipe.ingredients)) {
      const ingredientType = Number(itemTypeString) as ItemType;

      if (ingredientType === ItemType.wood && Math.random() < 1 * Settings.DT_S) {
         const pos = generateRandomLimbPosition();

         rotatePointAroundOrigin(pos.x, pos.y, hitbox.box.angle);
         const x = hitbox.box.position.x + _point.x;
         const y = hitbox.box.position.y + _point.y;

         createSawdustCloud(x, y);
      }
      
      if (Math.random() >= 2.5 * Settings.DT_S) {
         continue;
      }
      
      const particleColours = INGREDIENT_PARTICLE_COLOURS[ingredientType];
      if (particleColours !== undefined) {
         const colour = randItem(particleColours);
         const pos = generateRandomLimbPosition();

         rotatePointAroundOrigin(pos.x, pos.y, hitbox.box.angle);
         const x = hitbox.box.position.x + _point.x;
         const y = hitbox.box.position.y + _point.y;

         createColouredParticle(x, y, randFloat(30, 50), colour[0], colour[1], colour[2]);
      }
   }
}

const createBandageRenderPart = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   const offsetMagnitude = 32 * Math.random();
   const offsetDirection = randAngle();
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      6,
      randAngle(),
      offsetMagnitude * Math.sin(offsetDirection), offsetMagnitude * Math.cos(offsetDirection),
      getTextureArrayIndex("entities/miscellaneous/bandage.png")
   );

   const renderObject = getEntityRenderObject(entity);
   renderObject.attachRenderPart(renderPart);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   inventoryUseComponent.bandageRenderParts.push(renderPart);
}

export function updateBandageRenderPart(entity: Entity, renderPart: VisualRenderPart): void {
   const renderPartAge = getRenderPartAge(renderPart);
   
   if (renderPartAge >= BANDAGE_LIFETIME_TICKS) {
      const renderObject = getEntityRenderObject(entity);
      renderObject.removeRenderPart(renderPart);

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
      const idx = inventoryUseComponent.bandageRenderParts.indexOf(renderPart);
      if (idx !== -1) {
         inventoryUseComponent.bandageRenderParts.splice(idx, 1);
      }
      return;
   }

   const progress = renderPartAge / BANDAGE_LIFETIME_TICKS;
   renderPart.opacity = 1 - progress * progress;
}

export function createMedicineAnimationParticles(entity: Entity, limbIdx: number): void {
   if (Math.random() < 5 * Settings.DT_S) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      const colour = randItem(MEDICINE_PARTICLE_COLOURS);
      const pos = generateRandomLimbPosition();
      
      rotatePointAroundOrigin(pos.x, pos.y, hitbox.box.angle);
      const x = hitbox.box.position.x + _point.x;
      const y = hitbox.box.position.y + _point.y;
      
      createColouredParticle(x, y, randFloat(20, 35), colour[0], colour[1], colour[2]);
   }

   // @Hack: limbIdx
   // Bandages
   if (limbIdx === 0 && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.4)) {
      createBandageRenderPart(entity);
   }
}

const getCustomItemRenderPartTextureSource = (entity: Entity, state: CustomItemState): string => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         return CLIENT_ITEM_INFO_RECORD[ItemType.herbal_medicine].entityTextureSource;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
         return CLIENT_ITEM_INFO_RECORD[tribesmanComponent.craftingItemType].entityTextureSource;
      }
   }
}

const getCustomItemRenderPartOpacity = (entity: Entity, state: CustomItemState): number => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

         // @Hack
         let lastEatTicks: number | undefined;
         for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
            const limbInfo = inventoryUseComponent.limbInfos[i];
            
            if (limbInfo.action === LimbAction.useMedicine) {
               lastEatTicks = limbInfo.lastEatTicks;
            }
         }
         assert(lastEatTicks !== undefined);
         
         const useInfo = ITEM_INFO_RECORD[ItemType.herbal_medicine] as ConsumableItemInfo;

         const ticksSpentUsingMedicine = currentSnapshot.tick - lastEatTicks;
         const useProgress = ticksSpentUsingMedicine / secondsToTicks(useInfo.consumeTime);
         return 1 - useProgress;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
         return tribesmanComponent.craftingProgress * 0.8;
      }
   }
}

const getCustomItemRenderPartState = (entity: Entity): CustomItemState | null => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      
      if (limbInfo.action === LimbAction.craft) {
         return CustomItemState.crafting;
      } else if (limbInfo.action === LimbAction.useMedicine) {
         return CustomItemState.usingMedicine;
      }
   }

   return null;
}

export function updateCustomItemRenderPart(entity: Entity): void {
   const customItemState = getCustomItemRenderPartState(entity);
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   if (customItemState !== null) {
      if (inventoryUseComponent.customItemRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         
         inventoryUseComponent.customItemRenderPart = new TexturedRenderPart(
            hitbox,
            getTextureArrayIndex(getCustomItemRenderPartTextureSource(entity, customItemState)),
            9,
            0, 38,
            0
         );

         const renderObject = getEntityRenderObject(entity);
         renderObject.attachRenderPart(inventoryUseComponent.customItemRenderPart);
      } else {
         inventoryUseComponent.customItemRenderPart.switchTextureSource(getCustomItemRenderPartTextureSource(entity, customItemState));
      }
      
      inventoryUseComponent.customItemRenderPart.opacity = getCustomItemRenderPartOpacity(entity, customItemState);
   } else {
      if (inventoryUseComponent.customItemRenderPart !== null) {
         const renderObject = getEntityRenderObject(entity);
         renderObject.removeRenderPart(inventoryUseComponent.customItemRenderPart);
         inventoryUseComponent.customItemRenderPart = null;
      }
   }
}

export function animateLimb(limb: VisualRenderPart, limbInfo: LimbInfo): void {
   if (limbInfo.animationTicksElapsed === limbInfo.animationDurationTicks) {
      // New animation

      limbInfo.animationStartOffset.x = limbInfo.animationEndOffset.x;
      limbInfo.animationStartOffset.y = limbInfo.animationEndOffset.y;

      const newOffset = generateRandomLimbPosition();
      limbInfo.animationEndOffset.x = newOffset.x;
      limbInfo.animationEndOffset.y = newOffset.y;

      limbInfo.animationDurationTicks = randInt(MIN_LIMB_MOVE_INTERVAL, MAX_LIMB_MOVE_INTERVAL);
      limbInfo.animationTicksElapsed = 0;
   }

   limbInfo.animationTicksElapsed++;

   // Move offset
   const moveProgress = limbInfo.animationTicksElapsed / limbInfo.animationDurationTicks;
   limb.offsetX = lerp(limbInfo.animationStartOffset.x, limbInfo.animationEndOffset.x, moveProgress);
   limb.offsetY = lerp(limbInfo.animationStartOffset.y, limbInfo.animationEndOffset.y, moveProgress);
}