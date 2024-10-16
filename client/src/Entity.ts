import { Point, randFloat } from "battletribes-shared/utils";
import { EntityID, EntityTypeString } from "battletribes-shared/entities";
import { HitData, HitFlags } from "battletribes-shared/client-server-types";
import Board from "./Board";
import { createHealingParticle, createSlimePoolParticle, createSparkParticle } from "./particles";
import { playSound } from "./sound";
import { removeLightsAttachedToEntity, removeLightsAttachedToRenderPart } from "./lights";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { getRandomPointInEntity, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { RenderPart, RenderThing, thingIsRenderPart } from "./render-parts/render-parts";
import { createIdentityMatrix } from "./rendering/matrices";
import { getEntityRenderLayer } from "./render-layers";
import { registerDirtyEntity, renderParentIsHitbox } from "./rendering/render-part-matrices";
import { entityExists, getEntityLayer, getEntityRenderInfo, getEntityType } from "./world";
import { ComponentArrayType, getComponentArrays } from "./entity-components/ComponentArray";
import ServerComponentArray from "./entity-components/ServerComponentArray";

export interface ComponentTint {
   readonly tintR: number;
   readonly tintG: number;
   readonly tintB: number;
}

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

export function createComponentTint(tintR: number, tintG: number, tintB: number): ComponentTint {
   return {
      tintR: tintR,
      tintG: tintG,
      tintB: tintB
   };
}

export class EntityRenderInfo {
   public associatedEntity: EntityID;

   public renderPosition = new Point(0, 0);

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderThings = new Array<RenderThing>();

   public readonly renderPartOverlayGroups = new Array<RenderPartOverlayGroup>();
   
   public readonly modelMatrix = createIdentityMatrix();

   /** Amount the entity's render parts will shake */
   public shakeAmount = 0;

   /** Whether or not the entity has changed visually at all since its last dirty check */
   public isDirty = true;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   constructor(associatedEntity: EntityID) {
      this.associatedEntity = associatedEntity;
   }

   public attachRenderThing(thing: RenderThing): void {
      // Don't add if already attached
      if (this.allRenderThings.indexOf(thing) !== -1) {
         return;
      }

      // @Temporary?
      // @Incomplete: Check with the first render part up the chain
      // Make sure the render part has a higher z-index than its parent
      // if (thing.parent !== null && thing.zIndex <= thing.parent.zIndex) {
      //    throw new Error("Render part less-than-or-equal z-index compared to its parent.");
      // }

      // @Incomplete
      // Add to the array just after its parent

      // Add to the array of all render parts
      let idx = this.allRenderThings.length;
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const currentRenderPart = this.allRenderThings[i];
         if (thing.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.allRenderThings.splice(idx, 0, thing);

      if (thing.parent !== null && !renderParentIsHitbox(thing.parent)) {
         thing.parent.children.push(thing);
      }
      
      if (thingIsRenderPart(thing)) {
         Board.renderPartRecord[thing.id] = thing;
      }

      this.dirty();
   }

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const idx = this.allRenderThings.indexOf(renderPart);
      if (idx === -1) {
         console.warn("Tried to remove when already removed!");
         return;
      }
      
      removeLightsAttachedToRenderPart(renderPart.id);

      delete Board.renderPartRecord[renderPart.id];
      
      // Remove from the root array
      this.allRenderThings.splice(this.allRenderThings.indexOf(renderPart), 1);
   }

   public getRenderThing(tag: string): RenderThing {
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const renderThing = this.allRenderThings[i];

         if (renderThing.tags.includes(tag)) {
            return renderThing;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[getEntityType(this.associatedEntity)]);
   }

   public getRenderThings(tag: string, expectedAmount?: number): Array<RenderThing> {
      const renderThings = new Array<RenderThing>();
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const renderThing = this.allRenderThings[i];

         if (renderThing.tags.includes(tag)) {
            renderThings.push(renderThing);
         }
      }

      if (typeof expectedAmount !== "undefined" && renderThings.length !== expectedAmount) {
         throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[getEntityType(this.associatedEntity)] + " but got " + renderThings.length);
      }
      
      return renderThings;
   }

   public removeOverlayGroup(overlayGroup: RenderPartOverlayGroup): void {
      const idx = this.renderPartOverlayGroups.indexOf(overlayGroup);
      if (idx !== -1) {
         this.renderPartOverlayGroups.splice(idx, 1);
      }
      
      // @Hack
      const renderLayer = getEntityRenderLayer(this.associatedEntity);
      removeRenderable(getEntityLayer(this.associatedEntity), overlayGroup, renderLayer);
   }

   public recalculateTint(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;

      // @Speed
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (componentArray.typeObject.type === ComponentArrayType.server && componentArray.hasComponent(this.associatedEntity) && typeof (componentArray as ServerComponentArray).calculateTint !== "undefined") {
            const tint = (componentArray as ServerComponentArray).calculateTint!(this.associatedEntity);

            this.tintR += tint.tintR;
            this.tintG += tint.tintG;
            this.tintB += tint.tintB;
         }
      }
   }

   // @Cleanup: This just seems like an unnecessary wrapper for registerDirtyEntity
   public dirty(): void {
      if (!this.isDirty) {
         if (!entityExists(this.associatedEntity)) {
            throw new Error("Tried to dirty an entity which does not exist!");
         }
         
         registerDirtyEntity(this.associatedEntity);
         this.isDirty = true;
      }
   }
}

abstract class Entity {
   public readonly id: number;

   constructor(id: EntityID) {
      this.id = id;

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }

   public onLoad?(): void;

   public callOnLoadFunctions(): void {
      if (typeof this.onLoad !== "undefined") {
         this.onLoad();
      }
      
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onLoad !== "undefined" && componentArray.hasComponent(this.id)) {
            const component = componentArray.getComponent(this.id);
            componentArray.onLoad(component, this.id);
         }
      }
   }

   public remove(): void {
      if (typeof this.onRemove !== "undefined") {
         this.onRemove();
      }

      // Remove any attached lights
      removeLightsAttachedToEntity(this.id);

      const renderInfo = getEntityRenderInfo(this.id);
      for (let i = 0; i < renderInfo.allRenderThings.length; i++) {
         const renderPart = renderInfo.allRenderThings[i];
         if (thingIsRenderPart(renderPart)) {
            removeLightsAttachedToRenderPart(renderPart.id);
         }
      }
   }

   protected onRemove?(): void;

   public overrideTileMoveSpeedMultiplier?(): number | null;

   public die(): void {
      if (typeof this.onDie !== "undefined") {
         this.onDie();
      }

      // @Speed
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onDie !== "undefined" && componentArray.hasComponent(this.id)) {
            componentArray.onDie(this.id);
         }
      }
   }

   protected onDie?(): void;

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         const transformComponent = TransformComponentArray.getComponent(this.id);
         for (let i = 0; i < 2; i++) {
            createSlimePoolParticle(transformComponent.position.x, transformComponent.position.y, 32);
         }
      }

      // @Incomplete
      if (hitData.flags & HitFlags.HIT_BY_SPIKES) {
         playSound("spike-stab.mp3", 0.3, 1, Point.unpackage(hitData.hitPosition));
      }
      
      if (typeof this.onHit !== "undefined") {
         this.onHit(hitData);
      }

      const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;

      // @Speed
      const componentArrays = getComponentArrays();
      for (let i = 0; i < componentArrays.length; i++) {
         const componentArray = componentArrays[i];
         if (typeof componentArray.onHit !== "undefined" && componentArray.hasComponent(this.id)) {
            componentArray.onHit(this.id, isDamagingHit);
         }
      }
   }

   public registerStoppedHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      for (let i = 0; i < 6; i++) {
         const position = transformComponent.position.offset(randFloat(0, 6), 2 * Math.PI * Math.random());
         createSparkParticle(position.x, position.y);
      }
   }

   public createHealingParticles(amountHealed: number): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);

      // Create healing particles depending on the amount the entity was healed
      let remainingHealing = amountHealed;
      for (let size = 2; size >= 0;) {
         if (remainingHealing >= HEALING_PARTICLE_AMOUNTS[size]) {
            const position = getRandomPointInEntity(transformComponent);
            createHealingParticle(position, size);
            remainingHealing -= HEALING_PARTICLE_AMOUNTS[size];
         } else {
            size--;
         }
      }
   }
}

export default Entity;