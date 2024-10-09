import { Point, randFloat } from "battletribes-shared/utils";
import { EntityID, EntityTypeString } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { HitData, HitFlags } from "battletribes-shared/client-server-types";
import { ServerComponentType, ServerComponentTypeString } from "battletribes-shared/components";
import Board from "./Board";
import { createHealingParticle, createSlimePoolParticle, createSparkParticle } from "./particles";
import { playSound } from "./sound";
import { ClientComponentClass, ClientComponentType, ClientComponents, ServerComponentClass } from "./entity-components/components";
import Component from "./entity-components/Component";
import { removeLightsAttachedToEntity, removeLightsAttachedToRenderPart } from "./lights";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { getRandomPointInEntity } from "./entity-components/TransformComponent";
import { RenderPart, RenderThing, thingIsRenderPart } from "./render-parts/render-parts";
import ServerComponent from "./entity-components/ServerComponent";
import { createIdentityMatrix } from "./rendering/matrices";
import { getEntityRenderLayer } from "./render-layers";
import { registerDirtyEntity, renderParentIsHitbox } from "./rendering/render-part-matrices";
import { getEntityByID, getEntityLayer, getEntityType } from "./world";
import { getClientComponentArray } from "./entity-components/ComponentArray";

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

type ServerComponentsType = Partial<{
   [T in ServerComponentType]: ServerComponentClass<T>;
}>;
type ClientComponentsType = Partial<{
   [T in keyof typeof ClientComponents]: ClientComponentClass<T>;
}>;

abstract class Entity {
   public readonly id: number;

   public renderPosition = new Point(0, 0);

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderThings = new Array<RenderThing>();

   /** Amount the game object's render parts will shake */
   public shakeAmount = 0;

   // @Cleanup: some of this has to be superfluous.
   public readonly components = new Array<Component>();
   public readonly serverComponents = new Array<ServerComponent>();
   private readonly serverComponentsRecord: ServerComponentsType = {};
   private readonly clientComponents: ClientComponentsType = {};

   public readonly renderPartOverlayGroups = new Array<RenderPartOverlayGroup>();
   
   public readonly modelMatrix = createIdentityMatrix();

   /** Whether or not the entity has changed visually at all since its last dirty check */
   public isDirty = true;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   constructor(id: EntityID) {
      this.id = id;

      // @Temporary? @Cleanup: should be done using the dirty function probs
      registerDirtyEntity(this);

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }

   public recalculateTint(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;
      for (let j = 0; j < this.serverComponents.length; j++) {
         const component = this.serverComponents[j];
         this.tintR += component.tintR;
         this.tintG += component.tintG;
         this.tintB += component.tintB;
      }
   }

   public dirty(): void {
      if (!this.isDirty) {
         if (typeof getEntityByID(this.id) === "undefined") {
            throw new Error("Tried to dirty an entity which does not exist!");
         }
         
         registerDirtyEntity(this);
         this.isDirty = true;
      }
   }

   public getRenderThing(tag: string): RenderThing {
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const renderThing = this.allRenderThings[i];

         if (renderThing.tags.includes(tag)) {
            return renderThing;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[getEntityType(this.id)]);
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
         throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[getEntityType(this.id)] + " but got " + renderThings.length);
      }
      
      return renderThings;
   }

   public removeOverlayGroup(overlayGroup: RenderPartOverlayGroup): void {
      const idx = this.renderPartOverlayGroups.indexOf(overlayGroup);
      if (idx !== -1) {
         this.renderPartOverlayGroups.splice(idx, 1);
      }
      
      // @Hack
      const renderLayer = getEntityRenderLayer(this.id);
      removeRenderable(getEntityLayer(this.id), overlayGroup, renderLayer);
   }

   public onLoad?(): void;

   public callOnLoadFunctions(): void {
      if (typeof this.onLoad !== "undefined") {
         this.onLoad();
      }
      
      for (let i = 0; i < this.components.length; i++) {
         const component = this.components[i];
         if (typeof component.onLoad !== "undefined") {
            component.onLoad();
         }
      }
   }

   public addServerComponent(componentType: ServerComponentType, component: ServerComponent): void {
      this.components.push(component);
      this.serverComponents.push(component);
      // @Cleanup: Remove cast
      this.serverComponentsRecord[componentType] = component as any;
   }

   protected addClientComponent<T extends ClientComponentType>(componentType: T, component: ClientComponentClass<T>): void {
      this.components.push(component);
      // @Cleanup: Remove cast
      this.clientComponents[componentType] = component as any;

      // @Hack
      const componentArray = getClientComponentArray(componentType);
      componentArray.addComponent(this.id, component);
   }

   public getServerComponent<T extends ServerComponentType>(componentType: T): ServerComponentClass<T> {
      const component = this.serverComponentsRecord[componentType];

      if (typeof component === "undefined") {
         throw new Error("Entity type '" + EntityTypeString[getEntityType(this.id)] + "' does not have component of type '" + ServerComponentTypeString[componentType] + "'");
      }
      
      // @Cleanup: why is exclamation mark required?
      return component!;
   }

   public getClientComponent<T extends ClientComponentType>(componentType: T): ClientComponentClass<T> {
      return this.clientComponents[componentType]!;
   }

   public hasClientComponent(componentType: ClientComponentType): boolean {
      return this.clientComponents.hasOwnProperty(componentType);
   }

   public hasServerComponent(componentType: ServerComponentType): boolean {
      return this.serverComponentsRecord.hasOwnProperty(componentType);
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

   public remove(): void {
      if (typeof this.onRemove !== "undefined") {
         this.onRemove();
      }

      // Remove any attached lights
      removeLightsAttachedToEntity(this.id);
      for (let i = 0; i < this.allRenderThings.length; i++) {
         const renderPart = this.allRenderThings[i];
         if (thingIsRenderPart(renderPart)) {
            removeLightsAttachedToRenderPart(renderPart.id);
         }
      }
   }

   protected onRemove?(): void;

   public overrideTileMoveSpeedMultiplier?(): number | null;

   // @Cleanup: remove
   public updateRenderPosition(frameProgress: number): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      
      this.renderPosition.x = transformComponent.position.x;
      this.renderPosition.y = transformComponent.position.y;

      if (this.hasServerComponent(ServerComponentType.physics)) {
         const physicsComponent = this.getServerComponent(ServerComponentType.physics);
         
         this.renderPosition.x += physicsComponent.selfVelocity.x * frameProgress / Settings.TPS;
         this.renderPosition.y += physicsComponent.selfVelocity.y * frameProgress / Settings.TPS;
      }

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }
   }

   public die(): void {
      if (typeof this.onDie !== "undefined") {
         this.onDie();
      }

      // @Cleanup: component shouldn't be typed as any!!
      for (const component of Object.values(this.serverComponentsRecord)) {
         if (typeof component.onDie !== "undefined") {
            component.onDie();
         }
      }
      for (const component of Object.values(this.clientComponents)) {
         if (typeof component.onDie !== "undefined") {
            component.onDie();
         }
      }
   }

   protected onDie?(): void;

   protected onHit?(hitData: HitData): void;

   public registerHit(hitData: HitData): void {
      // If the entity is hit by a flesh sword, create slime puddles
      if (hitData.flags & HitFlags.HIT_BY_FLESH_SWORD) {
         const transformComponent = this.getServerComponent(ServerComponentType.transform);
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

      // @Cleanup
      for (const component of Object.values(this.serverComponentsRecord)) {
         if (typeof component.onHit !== "undefined") {
            component.onHit(isDamagingHit);
         }
      }
      for (const component of Object.values(this.clientComponents)) {
         if (typeof component.onHit !== "undefined") {
            component.onHit(isDamagingHit);
         }
      }
   }

   public registerStoppedHit(hitData: HitData): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      for (let i = 0; i < 6; i++) {
         const position = transformComponent.position.offset(randFloat(0, 6), 2 * Math.PI * Math.random());
         createSparkParticle(position.x, position.y);
      }
   }

   public createHealingParticles(amountHealed: number): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);

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