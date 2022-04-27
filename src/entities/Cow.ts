import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent from "../entity-components/RenderComponent";
import ResourceSpawnComponent from "../entity-components/ResourceSpawnerComponent";
import TransformComponent from "../entity-components/TransformComponent";

class Cow extends Entity {
    // constructor() {
    //     const MAX_HEALTH = 15;

    //     super([
    //         new TransformComponent(),
    //         new RenderComponent(),
    //         new HitboxComponent(),
    //         new HealthComponent(MAX_HEALTH),
    //         new ResourceSpawnComponent()
    //     ]);
    // }
}

export default Cow;