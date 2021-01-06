const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const crypto				= require('crypto');
const print				= require('@whi/printf').colorAlways();
const { Command }			= require('commander');
const { AdminWebsocket,
	AppWebsocket,
	...sdk }			= require('@holochain/conductor-api');

const config				= require('./config.js');

const HOLO_HASH_AGENT_PREFIX		= new Uint8Array([0x84, 0x20, 0x24]);


function increaseTotal(v, total) {
    return total + 1;
}

let port;
async function execute_admin (async_fn) {
    log.info("Create client");
    const admin			= await AdminWebsocket.connect( "http://localhost:" + port );

    try {
	await async_fn(admin);
    } catch ( err ) {
	console.error(`Failed during execute for '${async_fn.name}':`, err );
    } finally {
	// admin.client.socket.on("close", console.log);
	admin.client.socket.terminate();
	await admin.client.awaitClose();
	// console.log("Closed admin client:", admin.client.socket.readyState );
    }
}

async function execute_app (port, async_fn) {
    log.info("Create client");
    const client		= await AppWebsocket.connect( "http://localhost:" + port );

    try {
	await async_fn(client);
    } catch ( err ) {
	console.error(`Failed during execute for '${async_fn.name}':`, err );
    } finally {
	client.client.socket.terminate();
	await client.client.awaitClose();
    }
}

function prelude (handler) {
    return function ( ...args ) {
	port			= this.parent.port;
	log.transports[0].setLevel( this.parent.verbose );
	handler.call(this, ...args );
    };
}


async function main ( args ) {
    const commander			= new Command();

    commander
	.version( config.version )
	.option('-q, --quiet', 'suppress all printing except for final result', false )
	.option('-v, --verbose', 'increase logging verbosity', increaseTotal, 0)
	.option('-p, --port <port>', 'admin port', 33001 )

    commander
	.command("list <type>")
	.description("list the current configuration for the given 'type' (dnas, cells, apps)")
	.action( prelude(function (type) {
	    execute_admin(async (admin) => {
		let results;

		if ( ["dna", "dnas"].includes(type) ) {
		    results = await admin.listDnas();
		}
		else if ( ["cell", "cells"].includes(type) ) {
		    results = await admin.listCellIds();
		}
		else if ( ["app", "apps"].includes(type) ) {
		    results = await admin.listActiveApps();
		}
		else {
		    throw new Error(`Unknown type: ${type}, valid types are [dnas, cells, apps]`);
		}

		console.log( results.map(b => b.toString("base64")) );
	    });
	}));


    async function gen_pubkey ( client ) {
	const pubkey		= await client.generateAgentPubKey();
	return pubkey;
    }

    commander
	.command("gen-agent")
	.description("generate a new agent pubkey")
	.action( prelude(function () {
	    execute_admin(async (admin) => {
		const pubkey		= await admin.generateAgentPubKey();
		console.log( pubkey.toString("base64") );
	    });
	}));

    commander
	.command("install <name> <dna...>")
	.description("install app")
	.option('-a, --agent [pubkey]', 'create a new agent for installed App', false)
	.action( prelude(function ( name, dnas ) {
	    execute_admin(async (admin) => {
		let agent_pubkey;

		if ( this.agent === false ) {
		    agent_pubkey		= await gen_pubkey( admin );
		    log.normal("Using Agent (%s) for install", agent_pubkey.toString("base64") );
		}
		else {
		    agent_pubkey		= Buffer.from( this.agent, "base64" );
		    log.normal("Using Agent (%s) for install", this.agent );
		}

		console.log( dnas );
		let install_request = {
		    "installed_app_id": name,
		    "agent_key": agent_pubkey,
		    "dnas": dnas.map(dna => {
			const segs = dna.split(":");
			const file_path = segs.slice(0,-1).join("/");
			const nick = segs.slice(-1);

			return {
			    "path": path.resolve( process.cwd(), file_path ),
			    "nick": "holofuel",
			};
		    }),
		};

		console.log( install_request );
		let app = await admin.installApp( install_request );

		console.log( app.installed_app_id );
		app.cell_data.map(config => {
		    let cell = config[0];
		    let nick = config[1];
		    let hash = cell[0].toString("base64");
		    let agent = cell[1].toString("base64");

		    console.log(`  ${nick}\n    ${hash}:${agent}`);
		});
	    });
	}));

    commander
	.command("activate <name>")
	.description("activate app")
	.action( prelude(function ( name ) {
	    execute_admin(async (admin) => {
		await admin.activateApp({
		    "installed_app_id": name,
		});

		console.log("Hurray! Let's assume this worked.  What could go wrong?");
	    });
	}));

    commander
	.command("attach-interface <port>")
	.description("attach app to TCP port")
	.action( prelude(function ( port ) {
	    execute_admin(async (admin) => {
		let resp = await admin.attachAppInterface({
		    "port": parseInt( port ),
		});

		console.log(`This port (${resp.port}) is now something`);
	    });
	}));

    commander
	.command("call-zome <port> <dna> <agent>")
	.description("call a zome function")
	.action( prelude(function ( port, dna, agent ) {
	    execute_app( port, async (client) => {
		let dna_hash		= Buffer.from( dna, "base64" );
		let agent_pubkey	= Buffer.from( agent, "base64" );

		let call_spec = {
		    "cell_id": [ dna_hash, agent_pubkey ],
		    "zome_name": "hha",
		    "fn_name": "get_happs",
		    "payload": null,
		    "provenance": agent_pubkey, // AgentPubKey
		};

		let resp = await client.callZome( call_spec );
		console.log( resp );
	    });
	}));

    commander.parse( args );

    log.normal("Post parse");
}

module.exports				= {
    main,
};
