import Entity, { EntityRenderLayer, RenderLayer } from "./entities/Entity";

class Chunk {
   private entities: Record<EntityRenderLayer, Array<Entity>> = {
      [RenderLayer.LowResources]: new Array<Entity>(),
      [RenderLayer.Items]: new Array<Entity>(),
      [RenderLayer.PeacefulEntities]: new Array<Entity>(),
      [RenderLayer.HostileEntities]: new Array<Entity>(),
      [RenderLayer.Tribesmen]: new Array<Entity>(),
      [RenderLayer.HighResources]: new Array<Entity>()
   };

   public addEntity(entity: Entity): void {
      this.entities[entity.renderLayer].push(entity);
   }

   public removeEntity(entity: Entity): void {
      const idx = this.entities[entity.renderLayer].indexOf(entity);
      this.entities[entity.renderLayer].splice(idx, 1);
   }

   public getEntitiesByRenderLayer(renderLayer: EntityRenderLayer): Array<Entity> {
      return this.entities[renderLayer];
   }

   public getEntityList(): Array<Entity> {
      const entityList = new Array<Entity>();

      for (const currentEntityList of Object.values(this.entities)) {
         // Add all entities to the entity list
         for (const entity of currentEntityList) {
            entityList.push(entity);
         }
      }

      return entityList;
   }
}

export default Chunk;