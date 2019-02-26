import { LoadingManager, AudioLoader, TextureLoader } from '../lib/three.module.js';
import { Sprite, SpriteMaterial, DoubleSide, AudioListener, PositionalAudio } from '../lib/three.module.js';
import { LineSegments, LineBasicMaterial, BufferGeometry, Vector3 } from '../lib/three.module.js';
import { GLTFLoader } from '../lib/GLTFLoader.module.js';
import { NavMeshLoader } from '../lib/yuka.module.js';

/**
* Class for representing the global asset manager. It is responsible
* for loading and parsing all assets from the backend and provide
* the result in a series of maps.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class AssetManager {

	/**
	* Constructs a new asset manager with the given values.
	*/
	constructor() {

		this.loadingManager = new LoadingManager();

		this.audioLoader = new AudioLoader( this.loadingManager );
		this.textureLoader = new TextureLoader( this.loadingManager );
		this.gltfLoader = new GLTFLoader( this.loadingManager );
		this.navMeshLoader = new NavMeshLoader();

		this.listener = new AudioListener();

		this.animations = new Map();
		this.audios = new Map();
		this.models = new Map();

		this.navMesh = null;

	}

	/**
	* Initializes the asset manager. All assets are prepared so they
	* can be used by the game.
	*
	* @return {Promise} Resolves when all assets are ready.
	*/
	init() {

		this._loadAudios();
		this._loadModels();
		this._loadNavMesh();

		const loadingManager = this.loadingManager;

		return new Promise( ( resolve ) => {

			loadingManager.onLoad = () => {

				resolve();

			};

		} );

	}

	/**
	* Clones the given audio source. This method should be ideally part
	* of three.js.
	*
	* @param {PositionalAudio} source - A positional audio.
	* @return {PositionalAudio} A clone of the given audio.
	*/
	cloneAudio( source ) {

		const audio = new source.constructor( source.listener );
		audio.buffer = source.buffer;
		audio.setRolloffFactor( source.getRolloffFactor() );
		audio.setVolume( source.getVolume() );

		return audio;

	}

	/**
	* Loads all audios from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadAudios() {

		const audioLoader = this.audioLoader;
		const audios = this.audios;
		const listener = this.listener;

		const blasterShot = new PositionalAudio( listener );
		blasterShot.matrixAutoUpdate = false;

		const reload = new PositionalAudio( listener );
		reload.matrixAutoUpdate = false;

		audioLoader.load( './audios/blaster_shot.ogg', buffer => blasterShot.setBuffer( buffer ) );
		audioLoader.load( './audios/reload.ogg', buffer => reload.setBuffer( buffer ) );

		audios.set( 'blaster_shot', blasterShot );
		audios.set( 'reload', reload );

		return this;

	}

	/**
	* Loads all models from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadModels() {

		const gltfLoader = this.gltfLoader;
		const textureLoader = this.textureLoader;
		const models = this.models;
		const animations = this.animations;

		// soldier

		gltfLoader.load( './models/soldier.glb', ( gltf ) => {

			const renderComponent = gltf.scene;
			renderComponent.animations = gltf.animations;

			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse( ( object ) => {

				if ( object.isMesh ) {

					object.material.side = DoubleSide;
					object.matrixAutoUpdate = false;
					object.updateMatrix();


				}

			} );

			models.set( 'soldier', renderComponent );

			for ( let animation of gltf.animations ) {

				animations.set( animation.name, animation );

			}

		} );

		// level

		gltfLoader.load( './models/level.glb', ( gltf ) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse( ( object ) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			} );

			models.set( 'level', renderComponent );

		} );

		// blaster

		gltfLoader.load( './models/blaster.glb', ( gltf ) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse( ( object ) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			} );

			models.set( 'blaster', renderComponent );

		} );

		// shotgun

		gltfLoader.load( './models/shotgun.glb', ( gltf ) => {

			const renderComponent = gltf.scene;
			renderComponent.matrixAutoUpdate = false;
			renderComponent.updateMatrix();

			renderComponent.traverse( ( object ) => {

				object.matrixAutoUpdate = false;
				object.updateMatrix();

			} );

			models.set( 'shotgun', renderComponent );

		} );

		// muzzle sprite

		const muzzleTexture = textureLoader.load( './textures/muzzle.png' );

		const muzzleMaterial = new SpriteMaterial( { map: muzzleTexture } );
		const muzzle = new Sprite( muzzleMaterial );
		muzzle.matrixAutoUpdate = false;
		muzzle.visible = false;

		models.set( 'muzzle', muzzle );

		// bullet line

		const bulletLineGeometry = new BufferGeometry();
		const bulletLineMaterial = new LineBasicMaterial( { color: 0xfbf8e6 } );

		bulletLineGeometry.setFromPoints( [ new Vector3(), new Vector3( 0, 0, - 1 ) ] );

		const bulletLine = new LineSegments( bulletLineGeometry, bulletLineMaterial );
		bulletLine.matrixAutoUpdate = false;

		models.set( 'bulletLine', bulletLine );

		return this;

	}

	/**
	* Loads the navigation mesh from the backend.
	*
	* @return {AssetManager} A reference to this asset manager.
	*/
	_loadNavMesh() {

		const navMeshLoader = this.navMeshLoader;
		const loadingManager = this.loadingManager;

		loadingManager.itemStart( 'navmesh' );

		navMeshLoader.load( './navmeshes/navmesh.glb' ).then( ( navMesh ) => {

			this.navMesh = navMesh;

			loadingManager.itemEnd( 'navmesh' );

		} );

		return this;

	}

}

export { AssetManager };
