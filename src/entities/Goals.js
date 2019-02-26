import { Goal, CompositeGoal } from '../lib/yuka.module.js';
import { BufferGeometry } from '../lib/three.module.js';
import { CONFIG } from '../core/Config.js';

/**
* Top-Level goal that is used to manage the map exploration
* of the enemy.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class ExploreGoal extends CompositeGoal {

	constructor( owner ) {

		super( owner );

	}

	activate() {

		const owner = this.owner;

		this.addSubgoal( new FindNextDestinationGoal( owner ) );
		this.addSubgoal( new SeekToDestinationGoal( owner ) );

	}

	execute() {

		this.activateIfInactive();

		this.status = this.executeSubgoals();

	}

}

/**
* Sub-goal for finding the next random destintation
* on the map that the enemy is going to seek.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class FindNextDestinationGoal extends Goal {

	constructor( owner ) {

		super( owner );

	}

	activate() {

		const owner = this.owner;
		const pathPlanner = owner.world.pathPlanner;

		// select closest collectible

		owner.from.copy( owner.position );
		owner.to.copy( owner.navMesh.getRandomRegion().centroid );

		owner.path = null;

		pathPlanner.findPath( owner, owner.from, owner.to, onPathFound );

	}

	execute() {

		const owner = this.owner;

		if ( owner.path ) this.status = Goal.STATUS.COMPLETED;

	}

}

/**
* Sub-goal for seeking the defined destination point.
*
* @author {@link https://github.com/Mugen87|Mugen87}
* @author {@link https://github.com/robp94|robp94}
*/
class SeekToDestinationGoal extends Goal {

	constructor( owner ) {

		super( owner );

	}

	activate() {

		const owner = this.owner;

		//

		if ( owner.path !== null ) {

			if ( owner.world.debug ) {

				// update path helper

				const pathHelper = owner.pathHelper;

				pathHelper.geometry.dispose();
				pathHelper.geometry = new BufferGeometry().setFromPoints( owner.path );
				pathHelper.visible = owner.world.uiParameter.showPaths;

			}


			// update path and steering

			const followPathBehavior = owner.steering.behaviors[ 0 ];
			followPathBehavior.active = true;
			followPathBehavior.path.clear();

			for ( const point of owner.path ) {

				followPathBehavior.path.add( point );

			}

		} else {

			this.status = Goal.STATUS.FAILED;

		}

	}

	execute() {

		const owner = this.owner;

		const squaredDistance = owner.position.squaredDistanceTo( owner.to );

		const tolerance = CONFIG.BOT.NAVIGATION.ARRIVE_TOLERANCE * CONFIG.BOT.NAVIGATION.ARRIVE_TOLERANCE;

		if ( squaredDistance <= tolerance ) {

			this.status = Goal.STATUS.COMPLETED;

		}

	}

	terminate() {

		const owner = this.owner;

		const followPathBehavior = owner.steering.behaviors[ 0 ];
		followPathBehavior.active = false;
		this.owner.velocity.set( 0, 0, 0 );

	}

}

//

function onPathFound( owner, path ) {

	owner.path = path;

}

export { ExploreGoal };
