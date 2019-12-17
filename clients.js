const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const { Client }			= require('rpc-websockets');
const args2json				= require('args2json');
const print				= require('@whi/printf').colorAlways();

const active				= {};
const default_clients			= {
    "master":	42211,
    "internal":	42222,
    "admin":	42233,
    "public":	42244,
};

function open_connection ( name, port=80 ) {
    const client			= new Client( `ws://localhost:${port}` );

    client.name				= name;
    
    Object.defineProperty( client, 'readyState', {
	get() {
	    return this.socket.readyState;
	},
    });

    active[name]			= client;
    
    return new Promise((f,r) => {
	client.on('open', function () {
	    f( client );
	});
	client.on('error', function ( err ) {
	    if ( err.code === 'ECONNREFUSED' )
		print("Could not connect to WebSocket %s for client '%s'.  Is conductor running?", port, name );
	    r( err );
	});
    });
}

async function open_connections( clients = default_clients ) {
    
    if ( Object.keys( active ).length === 0 ) {
	log.normal('Connecting WebSocket clients: master, public, internal' );

	await Promise.all(
	    Object.entries( clients ).map(( [name,port] ) => {
		return open_connection( name, port );
	    })
	);
    } else {
	log.warn("Clients already opened: %s", Object.keys( active ) );
    }
    
    log.info('Client ready state: master=%s; public=%s; internal=%s',
	     ...Object.values( active ).map(ws => ws.readyState) );

    return active;
}

function close_connections() {
    log.info("Closing %d websocket clients", Object.keys( active ).length );
    for ( let client of Object.values( active ) ) {
	log.debug('Closing websocket: %s', client.address );
	client.close();
    }
}

module.exports = {
    active,
    default_clients,
    open_connections,
    close_connections,
};
