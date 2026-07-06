import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetLoader {

    constructor() {
        this.loader = new GLTFLoader();
        this.cache = new Map();
    }

    async loadGLB(path) {

        if (this.cache.has(path)) {
            return this.cache.get(path);
        }

        return new Promise((resolve, reject) => {

            this.loader.load(
                path,
                (gltf) => {
                    this.cache.set(path, gltf);
                    resolve(gltf);
                },
                undefined,
                reject
            );

        });

    }

}