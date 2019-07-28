const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const { Client }			= require('rpc-websockets');
const args2json				= require('args2json');

const clients				= {};
const client_config			= {
    "master":	1111,
    "public":	2222,
    "internal":	3333,
};


function open_connection ( name, port=80 ) {
    const client			= new Client( `ws://localhost:${port}` );

    client.name				= name;
    
    Object.defineProperty( client, 'readyState', {
	get() {
	    return this.socket.readyState;
	},
    });

    clients[name]			= client;
    
    return new Promise((f,r) => {
	client.on('open', function () {
	    f( client );
	});
	client.on('error', function ( err ) {
	    r( err );
	});
    });
}

async function open_connections() {
    
    if ( Object.keys( clients ).length === 0 ) {
	log.normal('Connecting WebSocket clients: master, public, internal' );

	await Promise.all(
	    Object.entries( client_config ).map(( [name,port] ) => {
		return open_connection( name, port );
	    })
	);
    } else {
	log.warn("Clients already opened: %s", Object.keys( clients ) );
    }
    
    log.info('Client ready state: master=%s; public=%s; internal=%s',
	     ...Object.values( clients ).map(ws => ws.readyState) );

    return clients;
}

function close_connections() {
    log.info("Closing %d websocket clients", Object.keys( clients ).length );
    for ( let ws of Object.values( clients ) ) {
	log.debug('Closing websocket: %s', ws.address );
	ws.close();
    }
}


async function call_conductor( client, args ) {
    try {
	let data;

	log.info("Calling conductor with client %s: %d args", client.address, args.length );
	if ( args.length === 1 ) {
	    const [cmd]			= args;
	    data			= await client.call( cmd );
	}
	else if ( args.length === 2 ) {
	    const [cmd,params]		= args;
	    data			= await client.call( cmd, params );
	}
	else if ( args.length === 3 || args.length === 4 ) {
	    const [inst,zome,func]	= args;
	    const params		= args2json( args[3] );
	    
	    data			= await client.call('call', {
		"instance_id":	inst,
		"zome":		zome,
		"function":	func,
		"args":		params,
	    });
	}
	else {
	    log.error("Unknown command: %s", args );
	}
	
	return data;
    } catch (err) {
	log.error("Conductor call returned error: %s", err );
	return err;
    }
}

module.exports = {
    call_conductor,
    open_connections,
    close_connections,
    clients,
    client_config,
};
