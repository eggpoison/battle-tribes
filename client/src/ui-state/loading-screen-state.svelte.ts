export const enum LoadingScreenStage {
   establishingConnection,
   sendingPlayerData,
   initialisingGame,
   connectionError
}

let stage = $state(LoadingScreenStage.establishingConnection);

export const loadingScreenState = {
   get stage() {
      return stage;
   },
   setStage(newStage: LoadingScreenStage): void {
      stage = newStage;
   }
};