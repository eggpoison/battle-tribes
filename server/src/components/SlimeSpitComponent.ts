import { ServerComponentType, SlimeSpitComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { ComponentConfig } from "../components";
import { RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

export interface SlimeSpitComponentParams {
   size: number;
}

const SIZES = [20, 30];

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(params: SlimeSpitComponentParams) {
      this.size = params.size;
   }
}

export const SlimeSpitComponentArray = new ComponentArray<SlimeSpitComponent>(ServerComponentType.slimeSpit, true, {
   onInitialise: onInitialise,
   serialise: serialise
});

function onInitialise(config: ComponentConfig<ServerComponentType.transform | ServerComponentType.slimeSpit>): void {
   const size = config[ServerComponentType.slimeSpit].size;

   const hitboxSize = SIZES[size];
   const hitbox = config[ServerComponentType.transform].hitboxes[0] as RectangularHitbox;
   hitbox.width = hitboxSize;
   hitbox.height = hitboxSize;
}

function serialise(entityID: number): SlimeSpitComponentData {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.slimeSpit,
      size: slimeSpitComponent.size
   };
}