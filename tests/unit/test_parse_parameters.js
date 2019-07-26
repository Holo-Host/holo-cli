
const assert					= require('assert');
const expect					= require('chai').expect;

const { parse_parameters }			= require('../../main.js');

describe("Holo CLI", () => {

    it("should parse string", async () => {
	const args				= parse_parameters( [
	    'something="wormhole=time travel"',
	]);

	expect( Object.keys( args ) ).to.have.lengthOf( 1 );
	expect( args.something ).to.equal( "wormhole=time travel" );
    });

    it("should parse integer", async () => {
	const args				= parse_parameters( [
	    'something=1',
	]);

	expect( Object.keys( args ) ).to.have.lengthOf( 1 );
	expect( args.something ).to.equal( 1 );
    });
    
    it("should parse object", async () => {
	const args				= parse_parameters( [
	    'something.id=1',
	    'something.name="Arnold"',
	]);

	expect( args.something ).to.be.an('object');
	expect( args.something.id ).to.equal( 1 );
	expect( args.something.name ).to.equal( "Arnold" );
    });
    
    it("should not overwrite a created object", async () => {
	expect( () => parse_parameters( [
	    'something.id=1',
	    'something.name="Arnold"',
	    'something=false',
	])).to.throw(/Cannot overwrite/);
    });
    
});
