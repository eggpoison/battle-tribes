import { TribeType } from "webgl-test-shared/dist/tribes";
interface MainMenuProps {
    readonly existingUsername: string | null;
    passUsername: (username: string) => void;
    passTribeType: (tribeType: TribeType) => void;
}
declare const MainMenu: ({ existingUsername, passUsername, passTribeType }: MainMenuProps) => import("react/jsx-runtime").JSX.Element;
export default MainMenu;
