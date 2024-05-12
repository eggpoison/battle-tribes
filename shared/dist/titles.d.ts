export declare enum TribesmanTitle {
    gardener = 0,
    berrymuncher = 1,
    sprinter = 2,
    architect = 3,
    packrat = 4,
    wellful = 5,
    yetisbane = 6,
    shrewd = 7,
    bloodaxe = 8,
    deathbringer = 9,
    winterswrath = 10
}
export interface TitleGenerationInfo {
    readonly title: TribesmanTitle;
    readonly displayOption: number;
}
export interface TribesmanTitleInfo {
    readonly tier: number;
    readonly name: string;
}
export declare const TRIBESMAN_TITLE_RECORD: Record<TribesmanTitle, TribesmanTitleInfo>;
