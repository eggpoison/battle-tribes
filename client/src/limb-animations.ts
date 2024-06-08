import { ConsumableItemInfo, ITEM_INFO_RECORD, ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, customTickIntervalHasPassed, lerp, randFloat, randInt, randItem, rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { getItemRecipe } from "webgl-test-shared/dist/crafting-recipes";
import { LimbAction } from "webgl-test-shared/dist/entities";
import RenderPart from "./render-parts/RenderPart";
import { LimbInfo } from "./entity-components/InventoryUseComponent";
import { getTextureArrayIndex } from "./texture-atlases/entity-texture-atlas";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { ParticleColour } from "./rendering/webgl/particle-rendering";
import { createColouredParticle, createSawdustCloud } from "./particles";
import Entity from "./Entity";
import Board from "./Board";

enum CustomItemState {
   usingMedicine,
   crafting
}

const MIN_LIMB_DIRECTION = 0.2;
const MAX_LIMB_DIRECTION = 0.9;

const MIN_LIMB_MOVE_INTERVAL = Math.floor(0.2 * Settings.TPS);
const MAX_LIMB_MOVE_INTERVAL = Math.floor(0.4 * Settings.TPS);

const BANDAGE_LIFETIME_TICKS = Math.floor(1.25 * Settings.TPS);

// @Incomplete: Investigate using slices of the actual item images instead of hardcoded pixel colours
const INGREDIENT_PARTICLE_COLOURS: Partial<Record<ItemType, ReadonlyArray<ParticleColour>>> = {
   [ItemType.wood]: [[114/255, 49/255, 0], [135/255, 74/255, 0], [153/255, 92/255, 6/255]]
};

const MEDICINE_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [[217/255, 26/255, 20/255], [63/255, 204/255, 91/255]];

export function generateRandomLimbPosition(limbIdx: number): Point {
   const limbMult = limbIdx === 0 ? 1 : -1;

   let offsetDirection = randFloat(MIN_LIMB_DIRECTION, MAX_LIMB_DIRECTION);
   const offsetMagnitude = 34 + randFloat(0, 6 + 6 * (offsetDirection - MIN_LIMB_DIRECTION) / MAX_LIMB_DIRECTION);
   offsetDirection *= limbMult;

   const x = offsetMagnitude * Math.sin(offsetDirection);
   const y = offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

export function createCraftingAnimationParticles(entity: Entity, limbIdx: number): void {
   const tribesmanComponent = entity.getServerComponent(ServerComponentType.tribesmanAI);
   
   const recipe = getItemRecipe(tribesmanComponent.craftingItemType);
   if (recipe === null) {
      console.warn("No recipe");
      return;
   }
   
   for (const itemTypeString of Object.keys(recipe.ingredients)) {
      const ingredientType = Number(itemTypeString) as ItemType;

      if (ingredientType === ItemType.wood && Math.random() < 1 / Settings.TPS) {
         const pos = generateRandomLimbPosition(limbIdx);

         const x = entity.position.x + rotateXAroundOrigin(pos.x, pos.y, entity.rotation);
         const y = entity.position.y + rotateYAroundOrigin(pos.x, pos.y, entity.rotation);

         createSawdustCloud(x, y);
      }
      
      if (Math.random() >= 2.5 / Settings.TPS) {
         continue;
      }
      
      const particleColours = INGREDIENT_PARTICLE_COLOURS[ingredientType];
      if (typeof particleColours !== "undefined") {
         const colour = randItem(particleColours);
         const pos = generateRandomLimbPosition(limbIdx);

         const x = entity.position.x + rotateXAroundOrigin(pos.x, pos.y, entity.rotation);
         const y = entity.position.y + rotateYAroundOrigin(pos.x, pos.y, entity.rotation);

         createColouredParticle(x, y, randFloat(30, 50), colour[0], colour[1], colour[2]);
      }
   }
}

const createBandageRenderPart = (entity: Entity): void => {
   const renderPart = new RenderPart(
      entity,
      getTextureArrayIndex("entities/miscellaneous/bandage.png"),
      6,
      2 * Math.PI * Math.random()
   );

   const offsetMagnitude = 32 * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   renderPart.offset.x = offsetMagnitude * Math.sin(offsetDirection);
   renderPart.offset.y = offsetMagnitude * Math.cos(offsetDirection);

   entity.attachRenderPart(renderPart);

   const inventoryUseComponent = entity.getServerComponent(ServerComponentType.inventoryUse);
   inventoryUseComponent.bandageRenderParts.push(renderPart);
}

export function updateBandageRenderPart(entity: Entity, renderPart: RenderPart): void {
   if (renderPart.age >= BANDAGE_LIFETIME_TICKS) {
      entity.removeRenderPart(renderPart);

      const inventoryUseComponent = entity.getServerComponent(ServerComponentType.inventoryUse);
      const idx = inventoryUseComponent.bandageRenderParts.indexOf(renderPart);
      if (idx !== -1) {
         inventoryUseComponent.bandageRenderParts.splice(idx, 1);
      }
      return;
   }

   const progress = renderPart.age / BANDAGE_LIFETIME_TICKS;
   renderPart.opacity = 1 - progress * progress;
}

export function createMedicineAnimationParticles(entity: Entity, limbIdx: number): void {
   if (Math.random() < 5 / Settings.TPS) {
      const colour = randItem(MEDICINE_PARTICLE_COLOURS);
      const pos = generateRandomLimbPosition(limbIdx);
      
      const x = entity.position.x + rotateXAroundOrigin(pos.x, pos.y, entity.rotation);
      const y = entity.position.y + rotateYAroundOrigin(pos.x, pos.y, entity.rotation);
      
      createColouredParticle(x, y, randFloat(20, 35), colour[0], colour[1], colour[2]);
   }

   // @Hack: limbIdx
   // Bandages
   if (limbIdx === 0 && customTickIntervalHasPassed(entity.ageTicks, 0.4)) {
      createBandageRenderPart(entity);
   }
}

const getCustomItemRenderPartTextureSource = (entity: Entity, state: CustomItemState): string => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         return CLIENT_ITEM_INFO_RECORD[ItemType.herbal_medicine].entityTextureSource;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = entity.getServerComponent(ServerComponentType.tribesmanAI);
         return CLIENT_ITEM_INFO_RECORD[tribesmanComponent.craftingItemType].entityTextureSource;
      }
   }
}

const getCustomItemRenderPartOpacity = (entity: Entity, state: CustomItemState): number => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         const inventoryUseComponent = entity.getServerComponent(ServerComponentType.inventoryUse);

         // @Hack
         let lastEatTicks: number | undefined;
         for (let i = 0; i < inventoryUseComponent.useInfos.length; i++) {
            const limbInfo = inventoryUseComponent.useInfos[i];
            
            if (limbInfo.action === LimbAction.useMedicine) {
               lastEatTicks = limbInfo.lastEatTicks;
            }
         }
         if (typeof lastEatTicks === "undefined") {
            throw new Error();
         }
         
         const useInfo = ITEM_INFO_RECORD[ItemType.herbal_medicine] as ConsumableItemInfo;

         const ticksSpentUsingMedicine = Board.ticks - lastEatTicks;
         const useProgress = ticksSpentUsingMedicine / Math.floor(useInfo.consumeTime * Settings.TPS);
         return 1 - useProgress;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = entity.getServerComponent(ServerComponentType.tribesmanAI);
         return tribesmanComponent.craftingProgress * 0.8;
      }
   }
}

const getCustomItemRenderPartState = (entity: Entity): CustomItemState | null => {
   const inventoryUseComponent = entity.getServerComponent(ServerComponentType.inventoryUse);
   
   for (let i = 0; i < inventoryUseComponent.useInfos.length; i++) {
      const limbInfo = inventoryUseComponent.useInfos[i];
      
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
   
   const inventoryUseComponent = entity.getServerComponent(ServerComponentType.inventoryUse);
   if (customItemState !== null) {
      if (inventoryUseComponent.customItemRenderPart === null) {
         inventoryUseComponent.customItemRenderPart = new RenderPart(
            inventoryUseComponent.entity,
            getTextureArrayIndex(getCustomItemRenderPartTextureSource(entity, customItemState)),
            9,
            0
         );
         inventoryUseComponent.customItemRenderPart.offset.y = 38;
         inventoryUseComponent.entity.attachRenderPart(inventoryUseComponent.customItemRenderPart);
      }
      
      inventoryUseComponent.customItemRenderPart.opacity = getCustomItemRenderPartOpacity(entity, customItemState);
   } else {
      if (inventoryUseComponent.customItemRenderPart !== null) {
         inventoryUseComponent.entity.removeRenderPart(inventoryUseComponent.customItemRenderPart);
         inventoryUseComponent.customItemRenderPart = null;
      }
   }
}

export function animateLimb(limb: RenderPart, limbIdx: number, limbInfo: LimbInfo): void {
   if (limbInfo.animationTicksElapsed === limbInfo.animationDurationTicks) {
      // New animation

      limbInfo.animationStartOffset.x = limbInfo.animationEndOffset.x;
      limbInfo.animationStartOffset.y = limbInfo.animationEndOffset.y;

      const newOffset = generateRandomLimbPosition(limbIdx);
      limbInfo.animationEndOffset.x = newOffset.x;
      limbInfo.animationEndOffset.y = newOffset.y;

      limbInfo.animationDurationTicks = randInt(MIN_LIMB_MOVE_INTERVAL, MAX_LIMB_MOVE_INTERVAL);
      limbInfo.animationTicksElapsed = 0;
   }

   limbInfo.animationTicksElapsed++;

   // Move offset
   const moveProgress = limbInfo.animationTicksElapsed / limbInfo.animationDurationTicks;
   limb.offset.x = lerp(limbInfo.animationStartOffset.x, limbInfo.animationEndOffset.x, moveProgress);
   limb.offset.y = lerp(limbInfo.animationStartOffset.y, limbInfo.animationEndOffset.y, moveProgress);
}