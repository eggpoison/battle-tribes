/**
 * Checks whether the player is using the terminal or not.
 */
export declare let playerIsUsingTerminal: boolean;
export declare let setTerminalVisibility: (isVisible: boolean) => void;
export declare let toggleTerminalVisiblity: () => void;
export declare let forceTerminalFocus: () => void;
interface TerminalParams {
    readonly startingIsVisible: boolean;
}
declare const Terminal: ({ startingIsVisible }: TerminalParams) => import("react/jsx-runtime").JSX.Element | null;
export default Terminal;
