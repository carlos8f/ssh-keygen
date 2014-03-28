var spawn = require('child_process').spawn;
var _ = require('underscore');
var fs = require('fs');
var os = require('os');
var path = require('path');

var log = function(a){
	if(process.env.VERBOSE) console.log('ssh-keygen: '+a);
}

function ssh_keygen(location, opts, callback){
	opts || (opts={});

	var pubLocation = location+'.pub';
	if(!opts.comment) opts.comment = '';
	if(!opts.password) opts.password = '';

	var keygen = spawn('ssh-keygen', [
		'-t','rsa',
		'-b', opts.bits || '2048',
		'-C', opts.comment,
		'-N', opts.password,
		'-f', location,
		opts.fingerprint ? '-l' : ''
	]);

	keygen.stdout.on('data', function(a){
		log('stdout:'+a);
	});

	var read = opts.read;
	var destroy = opts.destroy;

	keygen.on('exit',function(){
		log('exited');
		if(read){
			log('reading key '+location);
			fs.readFile(location, 'utf8', function(err, key){			
				if(destroy){
					log('destroying key '+location);
					fs.unlink(location, function(err){
						if(err) return callback(err);
						readPubKey();
					});
				} else readPubKey();
				function readPubKey(){
					log('reading pub key '+pubLocation);
					fs.readFile(pubLocation, 'utf8', function(err, pubKey){
						if(destroy){
							log('destroying pub key '+pubLocation);
							fs.unlink(pubLocation, function(err){
								if(err) return callback(err);
								return callback(undefined, { key: key, pubKey: pubKey });
							});
						} else callback(undefined, { key: key, pubKey: pubKey });
					});
				}
			});
		} else if(callback) callback();
	});

	keygen.stderr.on('data',function(a){
		log('stderr:'+a);
	});
};

module.exports = function(opts, callback){
	var location = opts.location;
	if(!location) location = path.join(os.tmpDir(),'id_rsa');

	if(_.isUndefined(opts.read)) opts.read = true;

	checkAvailability(location, opts.force, function(err){
		if(err){
			log('availability err '+err);
			return callback(err);
		}
		ssh_keygen(location, opts, callback);
	});
};
