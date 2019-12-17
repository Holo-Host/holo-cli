const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const assert				= require('assert');
const expect				= require('chai').expect;

const { Server }			= require('rpc-websockets');
const { main, close_connections }	= require('../../bin/holo-admin');

describe("main: submodule 'admin'", () => {

    let ws_master;
    let ws_intern;
    let ws_admin;
    let ws_public;
    let next_call_cb;

    function next_call ( cb ) {
	next_call_cb		= cb;
    }
    
    before(async () => {
	log.info("Starting clients");
	ws_master			= new Server({ "port": 42211 });
	ws_intern			= new Server({ "port": 42222 });
	ws_admin			= new Server({ "port": 42233 });
	ws_public			= new Server({ "port": 42244 });

	ws_master.register('call', async function ( data ) {
	    log.debug("Master call: %s", data );
	    if ( next_call_cb ) {
		log.info("Satisfying call: %s", data );
		const resp		= await next_call_cb( data );
		next_call( null );
		return resp;
	    } else {
		log.warn("Nothing is waiting for a call");
	    }
	});

	ws_master.register('admin/dna/list', async function ( data ) {
	    log.debug("Master call: %s", data );
	    if ( next_call_cb ) {
		log.info("Satisfying call: %s", data );
		const resp		= await next_call_cb( data );
		next_call( null );
		return resp;
	    } else {
		log.warn("Nothing is waiting for a call");
	    }
	});

    });

    it("should call admin methods", async () => {
	next_call(async (req) => {
	    expect( req			).to.be.null;

	    return [
		{
		    "id": "holo-hosting-app",
		    "hash": null
		},
		{
		    "id": "happ-store",
		    "hash": null
		},
		{
		    "id": "holofuel",
		    "hash": null
		},
	    ];
	});
	
	var data			= await main([
	    'node', 'holo', 'dna',
	]);
	log.info("Data: %s", data );

	expect( data		).to.be.an('array');
    });

    after(async () => {
	log.normal("Closing sockets");
	close_connections( 0 );

	// Set timeout so that clients close before server
	setTimeout(async () => {
	    log.normal("Closing test servers");

	    await ws_master.close();
	    log.normal("Closed master server");

	    await ws_intern.close();
	    log.normal("Closed intern server");

	    await ws_admin.close();
	    log.normal("Closed admin server");

	    await ws_public.close();
	    log.normal("Closed public server");
	}, 100);
    });

});
