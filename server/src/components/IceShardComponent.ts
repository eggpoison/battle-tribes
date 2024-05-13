import { IceShardComponentData } from "webgl-test-shared/dist/components";

export interface IceShardComponent {
   readonly lifetime: number;
}

export function serialiseIceShardComponent(): IceShardComponentData {
   return {};
}