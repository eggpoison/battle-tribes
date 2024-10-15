import { Point, randFloat, randInt, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { EntityID } from "battletribes-shared/entities";
import Layer from "./Layer";
import { STRUCTURE_TYPES, StructureType } from "battletribes-shared/structures";
import { TransformComponentArray } from "./components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "./components";
import { ComponentArray, getComponentArrayRecord } from "./components/ComponentArray";
import { boxIsCircular } from "battletribes-shared/boxes/boxes";
import { addEntityToJoinBuffer, getEntityType } from "./world";

// @Hack: 0 is for none, 1 is for player ghost entity
let idCounter = 2;

/** Finds a unique available ID for an entity */
const getNextEntityID = (): EntityID => {
   return idCounter++;
}

// @Hack @Cleanup ?@Speed
const getComponentTypes = <ComponentTypes extends ServerComponentType>(componentConfig: EntityConfig<ComponentTypes>): ReadonlyArray<ComponentTypes> => {
   return Object.keys(componentConfig.components).map(Number) as Array<ComponentTypes>;
}

// @Cleanup: maybe rename once other generic one is reworked?
// export function createEntityFromConfig<ComponentTypes extends ServerComponentType>(componentTypes: ReadonlyArray<ComponentTypes>, componentConfig: ComponentConfig<ComponentTypes>): void {
export function createEntityFromConfig<ComponentTypes extends ServerComponentType>(entityConfig: EntityConfig<ComponentTypes>, layer: Layer, joinDelayTicks: number): EntityID {
   const id = getNextEntityID();
   // @Hack
   const componentTypes = getComponentTypes(entityConfig);
   const componentArrayRecord = getComponentArrayRecord();

   // Run initialise functions
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;

      if (typeof componentArray.onInitialise !== "undefined") {
         // @Cleanup: remove need for cast
         componentArray.onInitialise(entityConfig as EntityConfig<ServerComponentType>, id);
      }
   }
   
   for (let i = 0; i < componentTypes.length; i++) {
      const componentType = componentTypes[i];
      
      const component = entityConfig.components[componentType];

      const componentArray = componentArrayRecord[componentType] as ComponentArray<object, ComponentTypes>;
      componentArray.addComponent(id, component, joinDelayTicks);
   }

   addEntityToJoinBuffer(id, entityConfig.entityType, layer, componentTypes, joinDelayTicks);

   return id;
}

export function entityIsStructure(entity: EntityID): boolean {
   return STRUCTURE_TYPES.indexOf(getEntityType(entity) as StructureType) !== -1;
}

export function getRandomPositionInEntity(entity: EntityID): Point {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const hitbox = transformComponent.hitboxes[randInt(0, transformComponent.hitboxes.length - 1)];
   const box = hitbox.box;

   if (boxIsCircular(box)) {
      return box.position.offset(box.radius * Math.random(), 2 * Math.PI * Math.random());
   } else {
      const halfWidth = box.width / 2;
      const halfHeight = box.height / 2;
      
      const xOffset = randFloat(-halfWidth, halfWidth);
      const yOffset = randFloat(-halfHeight, halfHeight);

      const x = transformComponent.position.x + rotateXAroundOrigin(xOffset, yOffset, transformComponent.rotation + box.rotation);
      const y = transformComponent.position.y + rotateYAroundOrigin(xOffset, yOffset, transformComponent.rotation + box.rotation);
      return new Point(x, y);
   }
}