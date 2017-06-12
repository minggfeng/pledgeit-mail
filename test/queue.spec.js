'use strict';
const request = require('supertest');
const express = require('express');
const expect = require('chai').expect;
const app = require('../app.js');
var middleware = require('../middleware');


// Instantiate Redis
var Redis = middleware.redis.createClient(7357, '127.0.0.1');

// Instantiate Queue
var Q = new middleware.Q(Redis);

var testEntry = JSON.stringify({ 
      to: 'test@email.com',
      type: 'test',
      amount: '9000'
    });

// Flush test db
var flush = function(){

  Q.Red.flushdb();
};

describe('The Red Queue', function() {

  describe('Instantiation', function(){
    
    it('instantiates Redis', function(done) {
      expect( Redis ).to.be.an('object');      
      done();
    });

    it('imports Queue middleware', function(done) {
      expect( middleware.Q ).to.be.a('function');
      done();
    });

    it('instantiates Queue with Redis instance', function(done) {
        
      expect( Q ).to.have.property( 'Red' ).to.be.a('object');
      expect( Q ).to.have.property( 'counter' ).to.be.a('string');
      expect( Q ).to.have.property( 'mail' ).to.be.a('string');
      expect( Q ).to.have.property( 'queue' ).to.be.a('string');
      done();
    });

  });

  describe('Helper Functions', function() {

      it('returns the size of the queue', function(done) {

        flush();

        Q.size().then(function(size){
          expect(size).to.equal(0);
          done();
        });
      });

  });

  describe('Adds to Queue', function() {

    it('assigns key name based on counter', function(done) {

      flush();

      Q.size().then(function(initSize){

        Q.add( testEntry ).then(function(response){

          expect( response ).to.have.property('key','m'+initSize);
          done();
        });
      });
    });

    it('adds key to queue list', function(done) {

      flush();

      Q.size().then(function(initSize){

        Q.add( testEntry ).then(function(response){

          Q.size(function(size){ expect( size ).to.equal( initSize + 1 ) });
          // get last item ( only item ) in query and compare === keyname
          done();
        });
      });
    });

    it('saves item to mail hash', function(done) {

      flush();

      Q.add( testEntry ).then(function(response){

        Q.get( Q.mail, response.key ).then(function(item){

          expect( response ).to.have.property('saved', 'OK');
          expect( item[0] ).to.equal( response.key );
          expect( item[1] ).to.deep.equal( JSON.parse(testEntry) );
          done();
        });
      });
    });

  });

  describe('Process Next Item in Queue', function() {

    it('removes item from queue, storage and counter when processing it', 
      function(done) {

      flush();

      Q.add( testEntry ).then(function(add_response){
        Q.get( Q.mail, add_response.key ).then(function(item){

          expect( add_response ).to.have.property('saved', 'OK');
          expect( item[0] ).to.equal( add_response.key );
          expect( item[1] ).to.deep.equal( JSON.parse(testEntry) );

          Q.size().then(function(size){ 
            expect(size).to.equal( 1 ); 
          });

          Q.do().then(function(do_response){

            expect( do_response ).to.have.property( 'sent', true );
            expect( do_response ).to.have.property( 'deleted', true );
            Q.size().then(function(size){ 
              expect(size).to.equal( 0 ); 
            });
            Q.get( Q.mail, do_response.key ).then(function(item){
              expect( item[1] ).to.equal( null );
              done();
            }); 

          });
        });
      });
    });

  });

  describe('Processes Range of Items in Queue', function() {

    it('gets and removes next passed in number of items from queue', function(done) {

      flush();

      var test_entries = [];

      // add first
      Q.add( testEntry ).then(function(add_response1){

        test_entries.push(add_response1);

        // add second
        Q.add( testEntry ).then(function(add_response2){

          test_entries.push(add_response2);

          // add third
          Q.add( testEntry ).then(function(add_response3){
          
            test_entries.push(add_response3);

            var test_entries_ok = test_entries.reduce(function(ok, entry){
              return (ok === null || !ok) ? (!!entry.saved) : (ok);
            }, null );

            // all items saved 
            expect( test_entries_ok ).to.equal( true );

            // size is 3
            Q.size().then(function(size){
              expect(size).to.equal(3);
            });

            // get range and test
            Q.doGroup(3).then(function(didGroup){

              // all items processed and deleted successfully
              expect( didGroup ).to.equal( true );

              // size is 0
              Q.size().then(function(size){
                expect(size).to.equal(0);
              });

              done();

            });
          });
        });
      });
    });

    it('gets and removes all items from queue if no amount passed in', function(done) {

      flush();

      var test_entries = [];

      // add first
      Q.add( testEntry ).then(function(add_response1){

        test_entries.push(add_response1);

        // add second
        Q.add( testEntry ).then(function(add_response2){

          test_entries.push(add_response2);

          // add third
          Q.add( testEntry ).then(function(add_response3){
          
            test_entries.push(add_response3);

            var test_entries_ok = test_entries.reduce(function(ok, entry){
              return (ok === null || !ok) ? (!!entry.saved) : (ok);
            }, null );

            // all items saved 
            expect( test_entries_ok ).to.equal( true );

            // size is 3
            Q.size().then(function(size){
              expect(size).to.equal(3);
            });

            // do all when no amount given
            Q.doGroup().then(function(didGroup){

              // all items processed and deleted successfully
              expect( didGroup ).to.equal( true );

              // size is 0
              Q.size().then(function(size){
                expect(size).to.equal(0);
              });

              done();

            });
          });
        });
      });
    });

  });

  xdescribe( 'Mail Gun', function() {

    // sends mail,
    // how could we test this?
    // return value?

  });

  xdescribe('Cron Worker', function() {

    // exists and initiates
    // fetches email every x amount of time
    // measure size
    // test with timers

  });



});


  



// -- test for redis data storage and retrieval
// -- test for FIFO queue system ( push and pop )
// -- test for receiving entry to queue and entering it
// -- test for worker to have interval
// -- test for worker ( cronJob? ) to consume redis
// -- test for snapshot of redis queue before cronJobbing
// -- test for snapshot after redis consumption
// -- test executing entry job ( compose corresponding email )
// -- test for sending corresponding email
// -- test for receiving confirmation of sent email
// -- test for catching failed email attempt to send
// -- test for adding to a different queue of reattempts
// -- test for re-attempting 20? more times until it stops
// -- test for after it stops attempting, sends info to pledgeit

  // it('denies access to any other route', function(done) {
  //   request(app)
  //     .get('/any')
  //     .expect(200)
  //     .expect(function(res) {
  //       expect(res.text).to.equal('Where you going bro?');
  //     })
  //     .end(done);
  // });

  // it('accepts POST request', function(done) {
  //   request(app)
  //     .post('/mail')
  //     .expect(200) // should be 201 created
  //     .expect(function(res) {
  //       // expect(res.body.data).to.equal('Feed me!');
  //       expect(res.text.).to.equal('Feed me!');
  //     })
  //     .end(done);
  // });
