const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const { Client }			= require('rpc-websockets');
const args2json				= require('args2json');

const active				= {};
const config				= {
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

    active[name]			= client;
    
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
    
    if ( Object.keys( active ).length === 0 ) {
	log.normal('Connecting WebSocket clients: master, public, internal' );

	await Promise.all(
	    Object.entries( config ).map(( [name,port] ) => {
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
    for ( let ws of Object.values( active ) ) {
	log.debug('Closing websocket: %s', ws.address );
	ws.close();
    }
}

module.exports = {
    active,
    config,
    open_connections,
    close_connections,
};
