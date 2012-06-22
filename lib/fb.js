/*
 * fb.js - FogBugz API wrapper semi-ported from https://github.com/ArthurD/PHP-FogBugz-API-Wrapper
 */

var url = require('url'),
http = require('http'),
util = require('util'),
events = require('events'),
request = require('request'),
querystring = require('querystring'),
xml = require('libxmljs-easy');

var FogBugz = module.exports.FogBugz = module.exports.Fogbugz = function(options) {
    if(!options || !options.url || !options.user || !options.password) {
	throw new Error('Invalid options passed to FogBugz Module. url, user, and password are required.');
	return;
    }

    var self = this;

    events.EventEmitter.call(self);

    //Login and Auth options
    self._url = options.url;
    self._user = options.user;
    self._pass = options.password;

    self._myversion = 8;

    //Get Api Url and check version
    self.getApiUrl(function(err) {
	if(err) {
	    self.emit('error', err);
	} else {
	    //Login the user and store api token
	    self.login(function(err) {
		if(err) {
		    self.emit('error', err);
		} else {
		    self.emit('ready');
		}
	    });
	}
    });
};

util.inherits(FogBugz, events.EventEmitter);

FogBugz.prototype.login = function(cb) {
    self._req(self._buildUrl(), function(err, data) {
	if(err) { cb(err); return; }

	self._token = data.token;
	cb(null);
    });
};

FogBugz.prototype.logout = function(cb) {
    self._req(self._buildUrl('logoff'), cb);
};

FogBugz.prototype.findUser = function(email, cb) {
    var args = {};

    args.sEmail = querystring.escape(email);

    self._req(self._buildUrl('viewPerson', args), cb);
};

FogBugz.prototype.resolveCase = function(caseId, body, resolvedAsId, cb) {
    var args = {};
    
    if(typeof(body) == 'function') { cb = body; body = null; }
    if(typeof(resolvedAsId) == 'function') { cb = resolvedAsId; resolvedAsId = null; }

    if(resolvedAsId) args.ixPersonEditedBy = resolvedAsId;
    if(body) args.sEvent = querystring.escape(body);

    args.ixBug = caseId;

    self._req(self._buildUrl('resolve', args), cb);
};

FogBugz.prototype.triggerCommit = function(caseId, payload, editedById, cb) {
    var args = {};

    if(typeof(editedById) == 'function') { cb = editedById; editedById = null; }
    
    if(editedById) args.ixPersonEditedBy = editedById;
    
    args.ixBug = caseId;
    args.sFile = payload.sFile;
    args.sPrev = payload.sPrev;
    args.sNew = payload.sNew;

    self._req(self._buildUrl('newCheckin', args), cb);
};

FogBugz.prototype.addCaseReply = function(caseId, body, editedById, cb) {
    var args = {};

    if(typeof(editedById) == 'function') { cb = editedById; editedById = null; }
    
    if(editedById) args.ixPersonEditedBy = editedById;

    args.ixBug = caseId;
    args.sEvent = querystring.escape(body);
    
    self._req(self._buildUrl('edit', args), cb);
};

FogBugz.prototype.getCases = function(q, cols, max, cb) {
    var args = {};

    if(typeof(max) == 'function') { cb = max; max = 5; }

    args.max = max;
    args.q = q;
    args.cols = cols;
    
    self._req(self._buildUrl('search', args), cb);
};

FogBugz.prototype.createCase = function(title, project, area, category, priorityId, body, assignedToId, cb) {
    var args = {};

    if(typeof(assignedToId) == 'function') { cb = assignedToId; assignedToId = null; }

    if(assignedToId) args.ixPersonAssignedTo = assignedToId;

    args.sTitle = title;
    args.sProject = project;
    args.sArea = area;
    args.sCategory = category;
    args.ixPriority = priorityId;
    args.sEvent = body;
    
    self._req(self._buildUrl('new', args)), cb;
};

FogBugz.prototype._req = function(u, cb) {
    request(u, function(err, res, body) {
	if(!err && res.statusCode == 200) {
	    var data = xml.parse(body).response;

	    if(data.error && cb) cb(new Error('Error (' + data.error.$code + '): ' + data.error));
	    else if(cb) cb(null, data);
	} else if(err) {
	    if(cb) cb(err);
	} else {
	    if(cb) cb(new Error('Non 200 status code returned (' + res.statusCode + ')'));
	}
    });
};

FogBugz.prototype._getApiUrl = function(cb) {
    //add trailing slash
    if(self._url.lastIndexOf('/') !== self._url.length - 1)
	self._url += '/';

    self._req(self.url + 'api.xml', function(err, data) {
	if(err) { if(cb) cb(err); return; }
	
	self._version = data.version;
	self._minversion = data.minversion;
	self._url = self._url += data.url;

	if(self._minversion <= self._myversion)
	    if(cb) cb(null);
	else
	    if(cb) cb(new Error('Incompatible version of fogbugz api!'));
    });
};

FogBugz.prototype._buildUrl = function(cmd, args) {
    cmd = cmd || 'logon';
    args = args || {};

    if(cmd == 'logon') {
	args.email = self._user;
	args.password = self._pass;
    } else {
	args.token = self._token;
    }

    args.cmd = cmd;

    return (self._url + querystring.stringify(args));
};