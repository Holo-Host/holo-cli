
const path				= require('path');
const { AppWebsocket,
	...sdk }			= require('@holochain/conductor-api');
const print				= require('@whi/printf');

const { log }				= require('./index.js');
const { ControlledError,
	ConductorError }		= require('./constants.js');



function transform_conductor_errors ( err, transformer = (e) => e ) {
    if ( err.type === "error" ) {
	let msg;

	if ( err.data.type === "internal_error" )
	    msg	= err.data.data;
	else
	    msg	= JSON.stringify( err.data );

	throw transformer( new ConductorError(msg) );
    } else if ( err instanceof Error ) {
	throw err;
    } else {
	throw new Error( String(err) );
    }
}



class AppAPI {
    constructor ( port ) {
	this.port			= port;
    }

    async connect () {
	const api			= await AppWebsocket.connect( "http://localhost:" + this.port );
	this.api			= api;
    }

    async call_zome_function ( dna_hash, agent_pubkey, zome_name, fn_name ) {
	try {
	    let call_spec = {
		"cell_id": [ dna_hash, agent_pubkey ],
		"zome_name": zome_name,
		"fn_name": fn_name,
		"payload": null,
		"provenance": agent_pubkey, // AgentPubKey
	    };

	    return await this.api.callZome( call_spec );
	} catch (err) {
	    transform_conductor_errors( err, (e) => {
		if ( e.message.includes("zome function that doesn't exist") )
		    return new ControlledError(`Function '${fn_name}' does not exist on zome '${zome_name}'`);
		return e;
	    });
	}
    }
}


module.exports = {
    async app_connection ( port ) {
	const client = new AppAPI( port );
	await client.connect();
	return client;
    },
    AppAPI,
};
