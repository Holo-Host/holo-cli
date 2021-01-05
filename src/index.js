const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.LOG_LEVEL || 'fatal',
});

const crypto				= require('crypto');
const print				= require('@whi/printf').colorAlways();
const { Command }			= require('commander');
const { AdminWebsocket, ...sdk }	= require('@holochain/conductor-api');

const config				= require('./config.js');

const HOLO_HASH_AGENT_PREFIX		= new Uint8Array([0x84, 0x20, 0x24]);


function increaseTotal(v, total) {
    return total + 1;
}

async function execute (async_fn) {
    log.info("Create client");
    const admin			= await AdminWebsocket.connect( "http://localhost:33001" );

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

function prelude (handler) {
    return function ( ...args ) {
	log.transports[0].setLevel( this.parent.verbose );
	handler.call(this, ...args );
    };
}


async function main ( args ) {
    const commander			= new Command();

    commander
	.version( config.version )
	.option('-q, --quiet', 'Suppress all printing except for final result', false )
	.option('-v, --verbose', 'Increase logging verbosity', increaseTotal, 0);

    commander
	.command("list <type>")
	.description("List the current configuration for the given 'type' (dnas, cells, apps)")
	.action( prelude(function (type) {
	    execute(async (admin) => {
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

    commander
	.command("install <dna>")
	.description("Install app ")
	.action( prelude(function (dna) {
	    console.log( dna );
	    // let install_request = {
	    // 	"installed_app_id": "notes",
	    // 	"agent_key": agent_pubkey,
	    // 	"dnas": [{
	    // 	    "path": path.resolve( __dirname, "../dnas/notes.dna.gz" ),
	    // 	    "nick": "holofuel",
	    // 	}],
	    // };
	    //
	    // execute(async (admin) => {
	    // });
	}));

    commander.parse( args );

    log.normal("Post parse");
}

module.exports				= {
    main,
};
