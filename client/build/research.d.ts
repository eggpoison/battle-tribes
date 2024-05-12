export interface ResearchOrb {
    readonly positionX: number;
    readonly positionY: number;
    readonly rotation: number;
    readonly size: number;
}
export declare const RESEARCH_ORB_SIZES: number[];
export declare function getResearchOrb(): ResearchOrb | null;
export declare function getResearchOrbCompleteProgress(): number;
export declare function updateActiveResearchBench(): void;
export declare function updateResearchOrb(): void;
export declare function attemptToResearch(): void;
export declare function attemptToCompleteNode(): void;
