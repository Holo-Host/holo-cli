const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const assert					= require('assert');
const expect					= require('chai').expect;

const { parse_parameters }			= require('../../main.js');

describe("parse_parameters", () => {

    it("should parse string", async () => {
	const args				= parse_parameters( [
	    'something="wormhole=time travel"',
	]);
	log.silly("Parameters: %s", args );

	expect( Object.keys( args ) ).to.have.lengthOf( 1 );
	expect( args.something ).to.equal( "wormhole=time travel" );
    });

    it("should parse integer", async () => {
	const args				= parse_parameters( [
	    'something=1',
	]);
	log.silly("Parameters: %s", args );

	expect( Object.keys( args ) ).to.have.lengthOf( 1 );
	expect( args.something ).to.equal( 1 );
    });
    
    it("should parse object", async () => {
	const args				= parse_parameters( [
	    'something.id=1',
	    'something.name="Arnold"',
	]);
	log.silly("Parameters: %s", args );

	expect( args.something ).to.be.an('object');
	expect( args.something.id ).to.equal( 1 );
	expect( args.something.name ).to.equal( "Arnold" );
    });
    
    it("should parse array", async () => {
	const args				= parse_parameters( [
	    'something[0].id=1',
	    'something[0].name="Arnold"',
	    'something[1].id=2',
	    'something[1].name="Dwayne"',
	]);
	log.silly("Parameters: %s", args );

	expect( args.something ).to.be.an('array');
	expect( args.something[0].id ).to.equal( 1 );
	expect( args.something[0].name ).to.equal( "Arnold" );
	expect( args.something[1].id ).to.equal( 2 );
	expect( args.something[1].name ).to.equal( "Dwayne" );
    });
    
    it("should not overwrite a created object", async () => {
	expect( () => parse_parameters( [
	    'something.id=1',
	    'something.name="Arnold"',
	    'something=false',
	])).to.throw(/Cannot overwrite/);
	
	expect( () => parse_parameters( [
	    'something.id=1',
	    'something.name="Arnold"',
	    'something.parents[0]="George"',
	    'something.parents[1]="Betty"',
	    'something[0]=true',
	])).to.throw(/Misconfiguration/);
    });
    
});
