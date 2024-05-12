/** Stores a group of buffers for use in instanced rendering */
declare class ObjectBufferContainer {
    private readonly objectsPerBuffer;
    private readonly dataLengths;
    private readonly bufferArrays;
    private readonly emptyBufferDatas;
    private readonly objectEntryIndexes;
    private readonly availableIndexes;
    constructor(objectsPerBuffer: number);
    registerNewBufferType(dataLength: number): void;
    private createNewBuffer;
    registerNewObject(objectID: number): void;
    setData(objectID: number, bufferType: number, data: Float32Array): void;
    removeObject(objectID: number): void;
    getBuffers(bufferType: number): ReadonlyArray<WebGLBuffer>;
    getNumBuffers(): number;
}
export default ObjectBufferContainer;
