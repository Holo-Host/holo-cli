const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const { Client }			= require('rpc-websockets');
const args2json				= require('args2json');

const clients				= require('./clients.js');
const config				= require('./config.js');
config.register_logger( log );



async function call_conductor( client, args ) {
    try {
	let data;

	log.info("Calling conductor with client %s: %d args", client.address, args.length );
	log.silly("Calling conductor with client %s: %s", client.address, args );
	if ( args.length === 1 ) {
	    const [cmd]			= args;
	    data			= await client.call( cmd );
	}
	else if ( args.length === 2 ) {
	    const [cmd]			= args;
	    const params		= Array.isArray( args[1] ) ? args2json( args[1] ) : args[1] || {};
	    
	    data			= await client.call( cmd, params );
	}
	else if ( args.length === 3 || args.length === 4 ) {
	    const [inst,zome,func]	= args;
	    const params		= Array.isArray( args[3] ) ? args2json( args[3] ) : args[3] || {};
	    
	    const payload		= {
		"instance_id":	inst,
		"zome":		zome,
		"function":	func,
		"args":		params,
	    };
	    
	    log.debug("Sending rpc method 'call' with %s", payload );
	    data			= await client.call('call', payload );
	}
	else {
	    log.error("Unknown command: %s", args );
	}

	try {
	    data			= JSON.parse( data );
	} catch (err) {
	    log.debug("Response is not JSON: response type %s", typeof data );
	}

	return data;
    } catch (err) {
	if ( err instanceof Error )
	    err				= String(err);
	
	log.error("Conductor call returned error: %s", err );
	return err;
    }
}

module.exports = {
    call_conductor,
    clients,
};
