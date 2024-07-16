import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { EntityData, HitData, HitFlags } from "webgl-test-shared/dist/client-server-types";
import { ComponentData, ServerComponentType, ServerComponentTypeString } from "webgl-test-shared/dist/components";
import RenderPart, { RenderObject } from "./render-parts/RenderPart";
import Chunk from "./Chunk";
import Board from "./Board";
import { createHealingParticle, createSlimePoolParticle, createSparkParticle } from "./particles";
import { playSound } from "./sound";
import ServerComponent from "./entity-components/ServerComponent";
import { ClientComponentClass, ClientComponentType, ClientComponents, ServerComponentClass, createComponent } from "./entity-components/components";
import Component from "./entity-components/Component";
import { removeLightsAttachedToEntity, removeLightsAttachedToRenderPart } from "./lights";
import { CircularHitbox, RectangularHitbox, updateHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { createCircularHitboxFromData, createRectangularHitboxFromData } from "./client/Client";
import { RenderPartOverlayGroup } from "./rendering/webgl/overlay-rendering";
import { removeRenderable } from "./rendering/render-loop";
import { getRandomPointInEntity } from "./entity-components/TransformComponent";

// Use prime numbers / 100 to ensure a decent distribution of different types of particles
const HEALING_PARTICLE_AMOUNTS = [0.05, 0.37, 1.01];

export type ComponentDataRecord = Partial<{
   [T in ServerComponentType]: ComponentData<T>;
}>;

type ServerComponentsType = Partial<{
   [T in ServerComponentType]: ServerComponentClass<T>;
}>;
type ClientComponentsType = Partial<{
   [T in keyof typeof ClientComponents]: ClientComponentClass<T>;
}>;

abstract class Entity<T extends EntityType = EntityType> extends RenderObject {
   public readonly id: number;

   public readonly type: EntityType;

   /** Stores all render parts attached to the object, sorted ascending based on zIndex. (So that render part with smallest zIndex is rendered first) */
   public readonly allRenderParts = new Array<RenderPart>();

   // @Cleanup: initialise the value in the constructor
   /** Visual depth of the game object while being rendered */
   public renderDepth = 0;

   /** Amount the game object's render parts will shake */
   public shakeAmount = 0;

   public readonly components = new Array<Component>();
   private readonly serverComponentsRecord: ServerComponentsType = {};
   private readonly clientComponents: ClientComponentsType = {};
   // @Cleanup: make this an array of functions instead
   private readonly tickableComponents = new Array<Component>();
   private readonly updateableComponents = new Array<Component>();

   public readonly renderPartOverlayGroups = new Array<RenderPartOverlayGroup>();

   constructor(id: number, entityType: T) {
      super();
      
      // @Incomplete
      // this.renderPosition.x = position.x;
      // this.renderPosition.y = position.y;
      this.id = id;
      this.type = entityType;

      // Note: The chunks are calculated outside of the constructor immediately after the game object is created
      // so that all constructors have time to run
   }

   public createComponents(componentsData: ReadonlyArray<ComponentData>): void {
      for (let i = 0; i < componentsData.length; i++) {
         const componentData = componentsData[i];

         const component = createComponent(this, componentData);
         this.addServerComponent(componentData.componentType, component);
      }
   }

   public getRenderPart(tag: string): RenderPart {
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];

         if (renderPart.tags.includes(tag)) {
            return renderPart;
         }
      }

      throw new Error("No render part with tag '" + tag + "' could be found on entity type " + EntityTypeString[this.type]);
   }

   public getRenderParts(tag: string, expectedAmount?: number): Array<RenderPart> {
      const renderParts = new Array<RenderPart>();
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];

         if (renderPart.tags.includes(tag)) {
            renderParts.push(renderPart);
         }
      }

      if (typeof expectedAmount !== "undefined" && renderParts.length !== expectedAmount) {
         throw new Error("Expected " + expectedAmount + " render parts with tag '" + tag + "' on " + EntityTypeString[this.type] + " but got " + renderParts.length);
      }
      
      return renderParts;
   }

   public removeOverlayGroup(overlayGroup: RenderPartOverlayGroup): void {
      const idx = this.renderPartOverlayGroups.indexOf(overlayGroup);
      if (idx !== -1) {
         this.renderPartOverlayGroups.splice(idx, 1);
      }
      
      removeRenderable(overlayGroup);
   }

   public callOnLoadFunctions(): void {
      // @Speed
      const serverComponents = Object.values(this.serverComponentsRecord);
      for (let i = 0; i < serverComponents.length; i++) {
         const component = serverComponents[i];
         if (typeof component.onLoad !== "undefined") {
            component.onLoad();
         }
      }

      // @Cleanup: copy and paste
      const clientComponents = Object.values(this.clientComponents);
      for (let i = 0; i < clientComponents.length; i++) {
         const component = clientComponents[i];
         if (typeof component.onLoad !== "undefined") {
            component.onLoad();
         }
      }
   }

   protected addServerComponent<T extends ServerComponentType>(componentType: T, component: ServerComponentClass<T>): void {
      this.components.push(component);
      // @Cleanup: Remove cast
      this.serverComponentsRecord[componentType] = component as any;

      if (typeof component.tick !== "undefined") {
         this.tickableComponents.push(component);
      }
      if (typeof component.update !== "undefined") {
         this.updateableComponents.push(component);
      }
   }

   protected addClientComponent<T extends ClientComponentType>(componentType: T, component: ClientComponentClass<T>): void {
      this.components.push(component);
      // @Cleanup: Remove cast
      this.clientComponents[componentType] = component as any;
      
      if (typeof component.tick !== "undefined") {
         this.tickableComponents.push(component);
      }
      if (typeof component.update !== "undefined") {
         this.updateableComponents.push(component);
      }
   }

   public getServerComponent<T extends ServerComponentType>(componentType: T): ServerComponentClass<T> {
      const component = this.serverComponentsRecord[componentType];

      if (typeof component === "undefined") {
         throw new Error("Entity type '" + EntityTypeString[this.type] + "' does not have component of type '" + ServerComponentTypeString[componentType] + "'");
      }
      
      // @Cleanup: why is exclamation mark required?
      return component!;
   }

   public getClientComponent<T extends ClientComponentType>(componentType: T): ClientComponentClass<T> {
      return this.clientComponents[componentType]!;
   }

   public hasServerComponent(componentType: ServerComponentType): boolean {
      return this.serverComponentsRecord.hasOwnProperty(componentType);
   }
   
   public attachRenderPart(renderPart: RenderPart): void {
      // Don't add if already attached
      if (this.allRenderParts.indexOf(renderPart) !== -1) {
         return;
      }

      // Add to the root array
      let idx = this.allRenderParts.length;
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const currentRenderPart = this.allRenderParts[i];
         if (renderPart.zIndex < currentRenderPart.zIndex) {
            idx = i;
            break;
         }
      }
      this.allRenderParts.splice(idx, 0, renderPart);

      renderPart.parent.children.push(renderPart);
      
      Board.numVisibleRenderParts++;
      Board.renderPartRecord[renderPart.id] = renderPart;
   }

   public removeRenderPart(renderPart: RenderPart): void {
      // Don't remove if already removed
      const idx = this.allRenderParts.indexOf(renderPart);
      if (idx === -1) {
         console.warn("Tried to remove when already removed!");
         return;
      }
      
      removeLightsAttachedToRenderPart(renderPart.id);

      Board.numVisibleRenderParts--;
      delete Board.renderPartRecord[renderPart.id];
      
      // Remove from the root array
      this.allRenderParts.splice(this.allRenderParts.indexOf(renderPart), 1);
   }

   public remove(): void {
      if (typeof this.onRemove !== "undefined") {
         this.onRemove();
      }

      // Remove any attached lights
      removeLightsAttachedToEntity(this.id);
      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];
         removeLightsAttachedToRenderPart(renderPart.id);
      }
   }

   protected onRemove?(): void;

   public overrideTileMoveSpeedMultiplier?(): number | null;

   public tick(): void {
      this.tintR = 0;
      this.tintG = 0;
      this.tintB = 0;

      for (let i = 0; i < this.tickableComponents.length; i++) {
         const component = this.tickableComponents[i];
         component.tick!();
      }

      for (let i = 0; i < this.allRenderParts.length; i++) {
         const renderPart = this.allRenderParts[i];
         renderPart.age++;
      }
   };

   public update(): void {
      for (let i = 0; i < this.updateableComponents.length; i++) {
         const component = this.updateableComponents[i];
         component.update!();
      }
   }

   // @Cleanup: remove
   public updateRenderPosition(frameProgress: number): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      
      this.renderPosition.x = transformComponent.position.x;
      this.renderPosition.y = transformComponent.position.y;

      if (this.hasServerComponent(ServerComponentType.physics)) {
         const physicsComponent = this.getServerComponent(ServerComponentType.physics);
         
         this.renderPosition.x += physicsComponent.velocity.x * frameProgress / Settings.TPS;
         this.renderPosition.y += physicsComponent.velocity.y * frameProgress / Settings.TPS;
      }

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }
   }

   public updateFromData(data: EntityData): void {
      // Update components from data
      for (let i = 0; i < data.components.length; i++) {
         const componentData = data.components[i];
         const component = this.getServerComponent(componentData.componentType);

         // @Cleanup: nasty cast
         component.updateFromData(componentData as any);
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