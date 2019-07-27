const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const assert				= require('assert');
const expect				= require('chai').expect;

const { Server }			= require('rpc-websockets');
const { main, close }			= require('../../main.js');

describe("main: subcommand 'call'", () => {

    let ws_master;
    let ws_public;
    let ws_intern;
    let next_call_cb;

    function next_call ( cb ) {
	next_call_cb		= cb;
    }
    
    before(async () => {
	ws_master			= new Server({ "port": 1111 });
	ws_public			= new Server({ "port": 2222 });
	ws_intern			= new Server({ "port": 3333 });

	ws_master.register('call', async function ( data ) {
	    log.debug("Master call: %s", data );
	    if ( next_call_cb ) {
		const resp		= await next_call_cb( data );
		next_call( null );
		return resp;
	    } else {
		log.warn("Nothing is waiting for a call");
	    }
	});

	// ws_master.on('connection', ( ws ) => {
	//     console.log( ws );
	
	//     ws.on('message', function ( data ) {
	// 	console.log("Master server message:", data );
	//     });
	// });
	
    });

    it("should call zome function", async () => {
	next_call(async (req) => {
	    expect( req			).to.be.an('object');
	    expect( req.instance_id	).to.equal('instance_id');
	    expect( req.zome		).to.equal('zome_name');
	    expect( req.args		).to.be.an('object');

	    return { "success": true };
	});
	
	var data			= await main([
	    'node', 'script.js', 'call', 'instance_id', 'zome_name', 'func_name',
	]);
	log.info("Data: %s", data );

	expect( data		).to.be.an('object');
	expect( data.code	).to.be.undefined;
	expect( data.success	).to.be.true;
    });

    after(async () => {
	log.normal("Closing sockets");
	close( 0 );
	
	log.normal("Closing test servers");
	
	await ws_master.close();
	log.normal("Closed master server");
	
	await ws_public.close();
	log.normal("Closed public server");
	
	await ws_intern.close();
	log.normal("Closed intern server");
    });

});
