export declare function keyIsPressed(key: string): boolean;
/** Sets all keys to be unpressed */
export declare function clearPressedKeys(): void;
export declare function addKeyListener(key: string, callback: (e: KeyboardEvent) => void, id?: string): void;
