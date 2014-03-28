var spawn = require('child_process').spawn;
var _ = require('underscore');
var fs = require('fs');
var os = require('os');
var path = require('path');

var log = function(a){
  if (process.env.VERBOSE) console.log('ssh-keygen: ' + a);
}

function ssh_keygen(location, opts, callback) {
  opts || (opts = {});

  var pubLocation = location + '.pub'
    , args;

  if (!opts.comment) opts.comment = '';
  if (!opts.password) opts.password = '';

  if (opts.fingerprint) {
  	args = [
  	'-lf', location
  	];
  }
  else {
	  	args = [
	    '-t','rsa',
	    '-b', opts.bits || '2048',
	    '-C', opts.comment,
	    '-N', opts.password,
	    '-f', location
	  ];
	}

  var keygen = spawn('ssh-keygen', args);

  if (opts.fingerprint) {
    var fingerprint = '';
    keygen.stdout.on('end', function () {
      callback(null, fingerprint);
    });
  }

  keygen.stdout.on('data', function(a){
    log('stdout:'+a);
    if (opts.fingerprint) fingerprint = fingerprint + a;
  });

  var read = opts.read;
  var destroy = opts.destroy;

  keygen.on('exit',function(){
    if (opts.fingerprint) return;
    log('exited');
    if (read) {
      log('reading key '+location);
      fs.readFile(location, 'utf8', function(err, key) {     
        log('reading pub key ' + pubLocation);
        fs.readFile(pubLocation, 'utf8', function(err, pubKey) {
          callback(null, { key: key, pubKey: pubKey });
        });
      });
    } else if (callback) callback();
  });

  keygen.stderr.on('data',function(a){
    log('stderr:'+a);
    fingerprint = fingerprint + a;
  });
};

module.exports = function(opts, callback){
  var location = opts.location;
  if (!location) location = path.join(os.tmpDir(),'id_rsa');

  if (typeof opts.read === 'undefined') opts.read = true;

  ssh_keygen(location, opts, callback);
};
