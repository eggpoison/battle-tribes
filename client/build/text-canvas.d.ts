import { BuildingSafetyData } from "webgl-test-shared/dist/ai-building-types";
export declare function setVisibleBuildingSafetys(newBuildingSafetys: ReadonlyArray<BuildingSafetyData>): void;
export declare function createTextCanvasContext(): void;
export declare function createDamageNumber(originX: number, originY: number, damage: number): void;
export declare function createResearchNumber(positionX: number, positionY: number, amount: number): void;
export declare function createHealNumber(healedEntityID: number, positionX: number, positionY: number, healAmount: number): void;
export declare function updateTextNumbers(): void;
export declare function renderText(): void;
