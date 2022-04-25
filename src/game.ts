// =============================-===--======- -    -
// Babylon.js 5.x Typescript Template
//
// Main Game Class
//
// But... of course there are infinite ways of
// doing the same thing.
// ===========================-===--======- -    -

import * as BABYLON from 'babylonjs';
import { float, int } from 'babylonjs';
import { Fractal } from './fractal/fractal';

// ======================================
// performance tweakers
// ======================================
//
// hardware scale will affect the
// final rendering resolution;
// 1 = default scale (normal speed)
// above 1 = lower resolution (faster)
// below 1 = higher resolution (slower)
//
// hdr and shadows are very expensive on mobiles;
// depending on project you might want to have
// them enabled and render at a lower resolution
// to compensate.
//
let USE_DEBUG_LAYER: boolean = false;              // enable debug inspector?
let USE_CUSTOM_LOADINGSCREEN: boolean = false;    // enable custom loading screen?
let HW_SCALE_NORMAL: float = 1;                  // scale in non-vr mode
let HW_SCALE_VR: float = 1;                      // scale in vr mode
let USE_ANTIALIAS: boolean = true;               // enable antialias?
let USE_HDR: boolean = false;                     // enable hdr?
let USE_GLOW: boolean = true;                    // enable glow?
let USE_SHADOWS: boolean = true;                 // enable shadows?
// ======================================


//=============================================
// Replace the default Babylonjs loading screen
// with our own loading screen.

// We can only show or hide the loading ui
interface ILoadingScreen {
    displayLoadingUI: () => void;
    hideLoadingUI: () => void;
    loadingUIBackgroundColor: string;
}

// Just show or hide the div with "Loading..." message
class CustomLoadingScreen implements ILoadingScreen {
    public loadingUIBackgroundColor: string
    constructor(public loadingUIText: string) { }
    public displayLoadingUI() {
        document.getElementById("frontdiv").style.visibility = 'visible';
    }

    public hideLoadingUI() {
        document.getElementById("frontdiv").style.visibility = 'hidden';
    }
}
//=============================================


// Main game class
export class Game {

    private _loadingScreen: CustomLoadingScreen = null;
    private _fps: HTMLElement;
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _music: BABYLON.Sound;
    private _cameras: BABYLON.Camera[];
    private _curcamera: int = 0;
    private _light1: BABYLON.Light;
    private _light2: BABYLON.ShadowLight;
    private _shadowgen: BABYLON.ShadowGenerator;
    private _xrhelper: BABYLON.WebXRDefaultExperience;
    private _grounds: BABYLON.AbstractMesh[] = new Array<BABYLON.AbstractMesh>();
    private _suzanne: BABYLON.AbstractMesh;
    private _fractal: Fractal;


    // Initialization, gets canvas and creates engine
    constructor(canvasElement: string) {
        // lower rendering quality on mobile
        if (this.isMobileDevice()) {
            USE_HDR = false;
            USE_ANTIALIAS = false;
            USE_GLOW = true;
            USE_SHADOWS = false;
            HW_SCALE_NORMAL = 2;
            HW_SCALE_VR = 2;
        }

        this._canvas = <HTMLCanvasElement>document.getElementById(canvasElement);
        this._engine = new BABYLON.Engine(this._canvas, USE_ANTIALIAS);
        this._engine.setHardwareScalingLevel(HW_SCALE_NORMAL);
    }


    // Detects if running on mobile device
    isMobileDevice(): boolean {
        let mobile = (navigator.userAgent||navigator.vendor).match(/(quest|android|iphone|blackberry|ipod|kindle)/i) != null;
        return mobile;
    };


    // Create a few cameras
    createCameras(): void {
        // initialize cameras array
        this._cameras = new Array<BABYLON.Camera>();

        // camera1 = orbit camera
        let cam1 = new BABYLON.ArcRotateCamera("camera1", 1.57, 1.45, 9, new BABYLON.Vector3(0, 0.5, 0), this._scene)
        cam1.attachControl(this._canvas, true);
        cam1.lowerRadiusLimit = 3;
        cam1.upperRadiusLimit = 16;
        cam1.lowerBetaLimit = 0.5;
        cam1.upperBetaLimit = 1.68;
        cam1.wheelPrecision = 30;
        cam1.panningSensibility = 0;
        cam1.minZ = 0.01;
        cam1.maxZ = 128;
        this._cameras.push(cam1);

        // camera2 = free camera
        let cam2 = new BABYLON.UniversalCamera("camera2", new BABYLON.Vector3(0, 0.15, 3), this._scene);
        cam2.setTarget(new BABYLON.Vector3(0, 0.15, 0));
        cam2.touchAngularSensibility = 10000;
        cam2.speed = 0.25;
        cam2.keysUp.push(87);    		// W
        cam2.keysDown.push(83)   		// D
        cam2.keysLeft.push(65);  		// A
        cam2.keysRight.push(68); 		// S
        cam2.keysUpward.push(69);		// E
        cam2.keysDownward.push(81);     // Q
        cam2.minZ = 0.01;
        cam2.maxZ = 128;
        this._cameras.push(cam2);
    }


    // create a default xr experience
    createDefaultXr() : void {
        this._scene.createDefaultXRExperienceAsync(
            {
                floorMeshes: this._grounds,
                outputCanvasOptions: { canvasOptions: { framebufferScaleFactor: 1/HW_SCALE_VR } }
            }).then((xrHelper) => {
                this._xrhelper = xrHelper;
                xrHelper.baseExperience.sessionManager.updateTargetFrameRate(30);

                //const layers = this._xrhelper.baseExperience.featuresManager.enableFeature(BABYLON.WebXRFeatureName.LAYERS, "latest", {
                //    preferMultiviewOnInit: true
                //}, true, false);

                this._xrhelper.baseExperience.onStateChangedObservable.add((state) => {
                    if (state === BABYLON.WebXRState.IN_XR) {
                        // not working yet, but we hope it will in the near future
                        //this._engine.setHardwareScalingLevel(HW_SCALE_VR);

                        // force xr camera to specific position and rotation
                        // when we just entered xr mode
                        this._scene.activeCamera.position.set(0, 0.1, 2);
                        (this._scene.activeCamera as BABYLON.WebXRCamera).setTarget(new BABYLON.Vector3(0, 0.1, 0));
                    }
                });
            }, (error) => {
                console.log("ERROR - No XR support.");
            });
    }


    // Creates the main Scene
    // with a basic model and a default environment;
    // it will also prepare for XR where available.
    createScene(): Promise<boolean> {
        let main = this;

        return new Promise(
            function (resolve, reject) {
                // show loading ui
                // uncomment the next two lines to replace the
                // default loading ui with the custom ui
                if (USE_CUSTOM_LOADINGSCREEN) {
                    main._loadingScreen = new CustomLoadingScreen("");
                    main._engine.loadingScreen = main._loadingScreen;
                }
                main._engine.displayLoadingUI();

                // create main scene
                main._scene = new BABYLON.Scene(main._engine);
                main._scene.autoClear = false;
                main._scene.autoClearDepthAndStencil = false;
                main._scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.1, 1.0);
                main._scene.ambientColor = new BABYLON.Color3(0.3, 0.3, 0.3);

                // create cameras
                main.createCameras();

                // create vfx pipeline
                if (USE_HDR) {
                    let pipeline = new BABYLON.DefaultRenderingPipeline("vfx", true, main._scene, main._cameras);
                    pipeline.fxaaEnabled = USE_ANTIALIAS;

                    // you can also add effects to the pipeline
                    // bloom, for example:
                    //pipeline.bloomEnabled = true;
                    //pipeline.bloomThreshold = 0.4;
                    //pipeline.bloomWeight = 0.8;
                    //pipeline.bloomKernel = 64;
                    //pipeline.bloomScale = 0.5;
                }

                // enable glow
                if (USE_GLOW) {
                    let gl = new BABYLON.GlowLayer("glow", main._scene, {
                        mainTextureFixedSize: 512,
                        blurKernelSize: 64
                    });
                    gl.intensity = 0.5;
                }

                // create some lights
                main._light1 = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), main._scene);
                main._light1.intensity = 0.9;
                main._light1.specular = BABYLON.Color3.White();

                // create shadows generator
                main._light2 = new BABYLON.DirectionalLight("light2", new BABYLON.Vector3(0, -0.95, -0.75), main._scene);
                if (USE_SHADOWS) {
                    main._shadowgen = new BABYLON.ShadowGenerator(1024, main._light2);
                    main._shadowgen.useBlurExponentialShadowMap = true;
                    main._shadowgen.blurKernel = 32;
                }

                // initialize fractal
                // note: i really wanted fractals running fast enough under Quest...
                // but it's not there yet... it runs, but slow.
                // still, looks nice when looking from the inside of the fractal.
                // maybe, if time permits, i'll revisit this and optimize for the Quest specifically.
                let bbox = new BABYLON.Vector3(3., 3., 3.);
                main._fractal = new Fractal("menger", bbox, main._scene);
                main._fractal.position.set(0, 0, 0);

                // We will wait until the base scene is fully loaded
                // to allow the user to close the loading ui.
                BABYLON.SceneLoader.ImportMesh("", "assets/scenes/", "base_scene.glb", main._scene, async function (meshes, particles, skeletons) {

                    meshes[0].position.y = -1.65;

                    // loop through all meshes, and all
                    for (var i = 0; i < meshes.length; i++) {
                        // any mesh starting with "G_"
                        // will be added as a ground in the XR experience
                        if (meshes[i].name.substring(0, 2) === "G_") {
                            console.log("Found a ground");
                            main._grounds.push(meshes[i]);
                        }
                        // now, this is very specific to the template:
                        // if we find the mesh called "Suzanne",
                        // we make it cast shadows
                        else if (USE_SHADOWS && meshes[i].name.substring(0,2) === "S_") {
                            console.log("Found a shadow caster");
                            main._shadowgen.addShadowCaster(meshes[i], true);
                        }
                        
                        // on another if thread, we also look for a specific mesh from our scene,
                        // because we want to make it move slowly while the "game" is played
                        if (meshes[i].name == "S_Suzanne")
                        {
                            main._suzanne = meshes[i];

                            // move our suzanne
                            main._suzanne.position.set(0, 3.15, 1.2);

                            console.log("Found suzanne");
                        }

                        // enable shadow receiving if we want shadows
                        meshes[i].receiveShadows = USE_SHADOWS;
                        if (meshes[i].subMeshes) {
                            for (var j = 0; j < meshes[i].subMeshes.length; j++) {
                                meshes[i].subMeshes[j].getMesh().receiveShadows = USE_SHADOWS;
                            }
                        }
                    }

                    // create a default environment around our simple scene
                    // note: if you have a complete scene which covers the entire screen,
                    // you probably won't need the default environment and can safely remove the
                    // next line.
                    let env = main._scene.createDefaultEnvironment({});
                    main._grounds.push(env.ground);

                    // ready to play
                    if (USE_DEBUG_LAYER) main._scene.debugLayer.show();
                    console.log("All resources loaded!");

                    // enable user click to close loading screen
                    document.getElementById("frontdiv2").innerHTML = "<h2>CLICK TO START</h2>"
                    document.getElementById("frontdiv").style.cursor = "pointer";

                    // when starting the game itself,
                    // we finally create a default xr experience
                    if (USE_CUSTOM_LOADINGSCREEN)
                    {
                        // when using a custom loading, we will wait for the user to click,
                        // so we can also automatically start the background music...
                        document.getElementById("frontdiv").addEventListener("click", async function () {
                            main.createDefaultXr();
                            resolve(true);
                        });
                    }
                    else
                    {
                        // just open the default xr env
                        main.createDefaultXr();
                        resolve(true);
                    }
                });
            });
    }


    // Game main loop
    run(): void {
        // hide the loading ui
        this._engine.hideLoadingUI();

        // start background music loop
        this._music = new BABYLON.Sound("ambience", "assets/audio/loop.mp3", this._scene, null, { loop: true, autoplay: true, volume: 1 });

        // get the fps div to show fps count
        this._fps = document.getElementById("fps");

        // process cameras toggle
        // ### just keyboard for now
        this._scene.onKeyboardObservable.add((kbInfo) => {
            switch (kbInfo.type) {
                case BABYLON.KeyboardEventTypes.KEYDOWN:
                    switch (kbInfo.event.keyCode) {
                        case 67:
                            {
                                this._cameras[this._curcamera].detachControl();
                                this._curcamera = (this._curcamera + 1) % this._cameras.length;
                                this._cameras[this._curcamera].attachControl(true);
                                let cam_name = "camera" + (this._curcamera + 1);
                                this._scene.setActiveCameraByName(cam_name);
                                console.log("Current camera: [" + this._curcamera + "] " + cam_name);
                                break
                            }
                    }
                    break;
                case BABYLON.KeyboardEventTypes.KEYUP:
                    break;
            }
        });

        // before rendering a new frame
        this._scene.registerBeforeRender(() => {
            this._fps.innerHTML = this._engine.getFps().toFixed() + " fps";

            // when we're on the free camera,
            // limit where the user can move to.
            if (this._curcamera == 1)
            {
                    // limit vertical distance
                    this._cameras[this._curcamera].position.y = Math.min(15, Math.max(-0.9, this._cameras[this._curcamera].position.y));

                    // limit horizontal distance
                    // note: we want to limit to 16 "meters";
                    // to calculate the distance from origin, we normally use sqrt(x*x + y*y + z*z),
                    // but it's well known that we can also remove the sqrt (a slow operation)
                    // by using the distance * distance trick, which is what we do here:
                    // 16 meters = 16*16 = 256 units without the sqrt.
                    let dist = this._cameras[this._curcamera].position.lengthSquared();
                    if (dist > 256) {
                        // too far, clamp it
                        let dir = this._cameras[this._curcamera].position;
                        dir = dir.normalize();
                        dir = dir.scale(16);
                        this._cameras[this._curcamera].position = dir;
                    }
            }

            // update fractal
            this._fractal.update(this._light2.direction, this._scene.activeCamera.position);
        });

        // render loop
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        // resize event handler
        window.addEventListener('resize', () => {
            this._engine.resize();
        });
    }

}
