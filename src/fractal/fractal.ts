// Example of a class which
// actually acts like a custom material
// with vertex and fragment shaders.
//
// The shaders source-codes will come
// from two files inside the assets folder.
//
// Ok, so this is a fractal renderer but
// it's not the main point, this was just
// an idea as an example.
//
// This is a quick port of an old code I
// had on a homebrew engine of mine (Etherea),
// and this one ended up with a limitation
// which prevents it to be moved around freely.
//
// I might revisit this in the future and fix
// the problem, but as said above, this is not
// the main point of the example.

import * as BABYLON from 'babylonjs';

export class Fractal extends BABYLON.TransformNode {
    private _shader: BABYLON.ShaderMaterial;

    constructor(name: string, bbox: BABYLON.Vector3, scene: BABYLON.Scene) {
        super(name, scene);

        this._shader = new BABYLON.ShaderMaterial("shader", scene, { vertex: "./assets/shaders/fractal", fragment: "./assets/shaders/fractal" },
        {
            attributes: ["position"],
            uniforms: ["world", "view", "projection", "bbox", "lightDir", "eyePos", "time"]
        });

        this._shader.setVector3("bbox", bbox);
        this._shader.sideOrientation = BABYLON.Mesh.FRONTSIDE;

        let box = BABYLON.CreateBox(name, {width:bbox.x, height:bbox.y, depth:bbox.z});
        box.material = this._shader;
        box.parent = this;
    }

    update(lightDir: BABYLON.Vector3, eyePos: BABYLON.Vector3): void {
        this._shader.setVector3("lightDir", lightDir);
        this._shader.setVector3("eyePos", eyePos);
    }
}