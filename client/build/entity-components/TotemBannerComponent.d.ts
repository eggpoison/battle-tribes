import { ServerComponentType } from "webgl-test-shared/dist/components";
import { TotemBannerComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
declare class TotemBannerComponent extends ServerComponent<ServerComponentType.totemBanner> {
    private readonly banners;
    private readonly bannerRenderParts;
    constructor(entity: Entity, data: TotemBannerComponentData);
    updateFromData(data: TotemBannerComponentData): void;
    private updateBanners;
    private createBannerRenderPart;
}
export default TotemBannerComponent;
