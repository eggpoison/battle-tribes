import Board from "../Board";
import Component from "../Component";
import Resource from "../entities/Resource";
import Item from "../Item";
import { getRandomAngle, Point, Vector } from "../utils";
import TransformComponent from "./TransformComponent";

class ResourceSpawnComponent extends Component {
    public spawnResource(item: Item, amount: number = 1): void {
        for (let i = 0; i < amount; i++) {
            const position = this.getSpawnPosition();
            
            const resource = new Resource(item, position);
            Board.addEntity(resource);
        }
    }

    /** Gets a random position around the entity */
    private getSpawnPosition(): Point {
        const entity = this.getEntity();
        const entityPosition = entity.getComponent(TransformComponent)!.position;

        const OFFSET_RANGE = 0.5;

        const offsetVector = new Vector(OFFSET_RANGE * Board.tileSize, getRandomAngle());
        const offset = offsetVector.convertToPoint();

        const position = entityPosition.add(offset);
        return position;
    }
}

export default ResourceSpawnComponent;