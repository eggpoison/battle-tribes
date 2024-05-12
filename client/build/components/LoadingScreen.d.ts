import { TribeType } from "webgl-test-shared/dist/tribes";
export type LoadingScreenStatus = "establishing_connection" | "sending_player_data" | "receiving_spawn_position" | "sending_visible_chunk_bounds" | "receiving_game_data" | "initialising_game" | "connection_error";
interface LoadingScreenProps {
    readonly username: string;
    readonly tribeType: TribeType;
    readonly initialStatus: LoadingScreenStatus;
}
declare const LoadingScreen: ({ username, tribeType, initialStatus }: LoadingScreenProps) => import("react/jsx-runtime").JSX.Element;
export default LoadingScreen;
