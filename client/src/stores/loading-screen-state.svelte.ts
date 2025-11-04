export const enum LoadingScreenState {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

export let loadingScreenState = $state<LoadingScreenState>(LoadingScreenState.establishingConnection);

export function setLoadingScreenState(newState: LoadingScreenState): void {
   loadingScreenState = newState;
}