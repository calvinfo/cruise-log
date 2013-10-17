var debug = require('debug')('cruise:log')
  , Emitter = require('events').EventEmitter
  , range = require('range');


module.exports = Log;


function Log () {
  this._entries = [];
  this._commitIndex = 0;
  this._lastApplied = 0;
  this._startIndex = 0;
}


Log.prototype = Object.create(Emitter.prototype);


Log.prototype.entries = function (entries) {
  if (!entries) return this._entries;
  this._entries = entries;
  return this;
};


Log.prototype.startIndex = function (index) {
  if (index === undefined) return this._startIndex;
  this._startIndex = index;
  return this;
};


/**
 * Index of the highest log entry known to be commited
 */

Log.prototype.commitIndex = function (index) {
  if (index === undefined) return this._commitIndex;
  this._commitIndex = index;
  return this;
};


/**
 * Index of the highest log entry applied to the state machine
 */

Log.prototype.lastApplied = function (index) {
  if (index === undefined) return this._lastApplied;
  this._lastApplied = index;
  return this;
};


/**
 * Return the current index that we're on.
 */

Log.prototype.currentIndex = function () {
  var last = this.last();
  if (!last) return this.startIndex();
  else return last.index;
};


/**
 * Return the last entry in our list
 */

Log.prototype.last = function () {
  var entries = this.entries();
  return entries[entries.length - 1];
};


/**
 * Return the first entry in our list
 */

Log.prototype.first = function () {
  var entries = this.entries();
  return entries[0];
};


/**
 * Gets an entry at a particular index
 */

Log.prototype.get = function (index) {
  var startIndex = this.startIndex();
  if (index < startIndex || index > startIndex + this.size()) return;
  return this.entries()[index - this.startIndex() - 1];
};


/**
 * Return the current size of the log
 */

Log.prototype.size = function () {
  return this.entries().length;
};


/**
 * Check whether the log already contains an entry with this index and term
 */

Log.prototype.contains = function (index, term) {
  var entry = this.get(index);
  if (!entry) return false;
  return entry.term === term;
};


/**
 * Return a list of entries after the index
 */

Log.prototype.after = function (index) {
  var last = this.last();
  if (!last) return [];
  if (last.index < index) return [];
  return range(index, last.index).map(this.get, this);
};


/**
 * Return a list of entries before the index
 */

Log.prototype.before = function (index) {
  var start = this.startIndex();
  if (start > index) return [];
  return range(start, index).map(this.get, this);
};


/**
 * Commit all the entries up until index
 */

Log.prototype.commit = function (index) {
  var commit = this.before(index)
    , remaining = this.after(index);

  this.entries(remaining);
  this.startIndex(index);
  this.commitIndex(index);
  this.emit('data', commit);
  return this;
};


/**
 * Attempts to write the entry to the log. Returns true in the case of
 * appending or false if it was rejected.
 */

Log.prototype.append = function (entry) {
  var last = this.last()
    , entries = this.entries();

  if (!last) {
    entries.push(entry);
    return true;
  }

  if (entry.term < last.term) return false;
  if (entry.term === last.term && entry.index < last.index) return false;

  entries.push(entry);
  return true;
};


