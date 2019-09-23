"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// Node, or global
;

(function (root) {
  // eslint-disable-line no-extra-semi
  'use strict';

  var module = {
    factories: {}
  };
  Object.defineProperty(module, 'exports', {
    get: function get() {
      return null;
    },
    set: function set(val) {
      module.factories["".concat(val.name, "Factory")] = val.factory;
    },
    // this property should show up when this object's property names are enumerated
    enumerable: true,
    // this property may not be deleted
    configurable: false
  });
  module.exports = {
    name: 'allSettled',
    factory: function factory() {
      'use strict';

      function allSettled(promises) {
        return Promise.all(promises.map(function (promise) {
          return new Promise(function (resolve) {
            try {
              promise.then(function (value) {
                resolve({
                  status: 'fullfilled',
                  value: value
                });
              }).catch(function (err) {
                resolve({
                  status: 'rejected',
                  reason: err
                });
              });
            } catch (err) {
              // most likely, we received something other than a promise in the array
              resolve({
                status: 'rejected',
                reason: err
              });
            }
          });
        }));
      }

      return {
        allSettled: allSettled
      };
    }
  };
  module.exports = {
    name: 'AsyncTest',
    factory: function factory(dependencies) {
      'use strict';

      var isPromise = dependencies.isPromise,
          publish = dependencies.publish,
          TestEvent = dependencies.TestEvent,
          clock = dependencies.clock,
          duration = dependencies.duration,
          addDurations = dependencies.addDurations;

      function noop() {}
      /**
       * If the test is skipped, sets noops for given and when,
       * otherwise sets given and when to associated test variables
       * @param {Object} context
       */


      function useNoopsIfSkipped(context) {
        if (testIsSkipped(context.test)) {
          // there aren't any tests to run
          // set the when to the noop function
          context.given = noop;
          context.when = noop;
        } else {
          context.given = context.test.given || noop;
          context.when = context.test.when;
        }

        return context;
      }

      function testIsSkipped(test) {
        return test.skipped || // the test isn't skipped, but all of it's assertions are
        test.assertions.filter(function (a) {
          return a.skipped;
        }).length === test.assertions.length;
      }
      /**
       * Runs `given` and passes any output forward
       * @param {Object} context
       */


      function runGiven(context) {
        if (typeof context.given !== 'function' && _typeof(context.given) !== 'object') {
          return Promise.resolve(context);
        }

        try {
          var startTime = clock();
          var actual = context.given();

          if (isPromise(actual)) {
            return actual.then(function (value) {
              context.resultOfGiven = value;
              return context;
            }).catch(function (e) {
              context.err = e;
              throw e;
            });
          }

          context.givenDuration = duration(startTime, clock());
          context.resultOfGiven = actual;
          return Promise.resolve(context);
        } catch (e) {
          context.err = e;
          throw e;
        }
      }
      /**
       * Runs `when` and passes any output forward
       * @param {Object} context
       */


      function runWhen(context) {
        if (typeof context.when !== 'function' && _typeof(context.when) !== 'object') {
          return Promise.resolve(context);
        }

        try {
          var startTime = clock();
          var actual = context.when(context.resultOfGiven);

          if (isPromise(actual)) {
            return actual.then(function (value) {
              context.resultOfWhen = value;
              return context;
            }).catch(function (e) {
              context.err = e;
              return context;
            });
          }

          context.whenDuration = duration(startTime, clock());
          context.resultOfWhen = actual;
          return Promise.resolve(context);
        } catch (e) {
          context.err = e;
          return context;
        }
      }
      /**
       * Executes the assertions
       * @param {Object} context
       */


      function checkAssertions(context) {
        var promises = context.test.assertions.map(function (assertion) {
          return assertOne(context, assertion, function () {
            if (assertion.test.length > 1) {
              // the assertion accepts all arguments to a single function
              return assertion.test(context.config.assertionLibrary, context.err, context.resultOfWhen);
            }

            var maybeFunc = assertion.test(context.config.assertionLibrary);

            if (typeof maybeFunc === 'function') {
              // the assertion curries: (t) => (err, actual) => { ... }
              return maybeFunc(context.err, context.resultOfWhen);
            }

            return maybeFunc;
          });
        });
        return Promise.all(promises).then(function (events) {
          if (!Array.isArray(events)) {
            return context;
          }

          events.forEach(function (event) {
            context.outcomes.push(Object.assign({
              behavior: 'anonymous'
            }, event));
          });
          return context;
        });
      } // /checkAssertions


      function maybeLog(result) {
        return result && typeof result.log !== 'undefined' ? result.log : undefined;
      }

      function maybeContext(result) {
        return result && typeof result.context !== 'undefined' ? result.context : undefined;
      }
      /**
       * Executes one assertion
       * @param {Object} context
       */


      function assertOne(context, assertion, test) {
        var batchId = context.batchId,
            givenDuration = context.givenDuration,
            whenDuration = context.whenDuration;

        var pass = function pass(startTime) {
          return function (result) {
            var endTime = clock();

            var _dur = duration(startTime, endTime);

            return publish({
              type: TestEvent.types.TEST,
              status: TestEvent.status.PASSED,
              suiteId: context.suiteId,
              batchId: batchId,
              testId: assertion.id,
              behavior: assertion.behavior,
              behaviors: assertion.behaviors,
              time: endTime,
              duration: {
                given: givenDuration,
                when: whenDuration,
                then: _dur,
                total: addDurations(givenDuration, whenDuration, _dur)
              },
              log: maybeLog(result),
              context: maybeContext(result)
            });
          };
        };

        var fail = function fail(e) {
          return publish({
            type: TestEvent.types.TEST,
            status: TestEvent.status.FAILED,
            suiteId: context.suiteId,
            batchId: batchId,
            testId: assertion.id,
            behavior: assertion.behavior,
            behaviors: assertion.behaviors,
            error: e
          });
        };

        try {
          if (assertion.skipped) {
            return publish({
              type: TestEvent.types.TEST,
              status: TestEvent.status.SKIPPED,
              suiteId: context.suiteId,
              batchId: batchId,
              testId: assertion.id,
              behavior: assertion.behavior,
              behaviors: assertion.behaviors
            });
          }

          var startTime;
          return publish({
            type: TestEvent.types.START_TEST,
            suiteId: context.suiteId,
            batchId: batchId,
            testId: assertion.id,
            behavior: assertion.behavior,
            behaviors: assertion.behaviors
          }).then(function () {
            startTime = clock();
          }).then(function () {
            return test();
          }).then(function (result) {
            return pass(startTime)(result);
          }).catch(fail);
        } catch (e) {
          return fail(e);
        }
      } // /assertOne

      /**
       * The context for one flow
       * @param {Object} context
       */


      function Context(context) {
        var self = {
          test: context.test,
          config: context.config,
          suiteId: context.suiteId,
          batchId: context.batchId,
          timer: context.timer,
          given: context.given,
          when: context.when,
          resultOfGiven: context.resultOfGiven,
          resultOfWhen: context.resultOfWhen,
          givenDuration: context.givenDuration || Object.seal({
            seconds: -1,
            milliseconds: -1,
            microseconds: -1,
            nanoseconds: -1
          }),
          whenDuration: context.whenDuration || Object.seal({
            seconds: -1,
            milliseconds: -1,
            microseconds: -1,
            nanoseconds: -1
          }),
          outcomes: context.outcomes || [],
          err: context.err
        };
        return Object.seal(self);
      } // /Context
      // {
      //   given: [Function: when],
      //   when: [Function: when],
      //   assertions: [{
      //     behavior: 'when dividing a number by zero, we get Infinity',
      //     test: [Function: we get Infinity]
      //   }]
      // }


      function AsyncTest(test, config, batchId, suiteId) {
        return function () {
          // we need a Promise wrapper, to timout the test if it never returns
          return new Promise(function (resolve, reject) {
            // run the tests concurrently
            setTimeout(function () {
              // setup the intial context
              var context = new Context({
                test: test,
                config: config,
                suiteId: suiteId,
                batchId: batchId,
                timer: setTimeout(function () {
                  publish({
                    type: TestEvent.types.TEST,
                    status: TestEvent.status.BROKEN,
                    suiteId: suiteId,
                    batchId: batchId,
                    behavior: test.behavior,
                    behaviors: test.behaviors,
                    error: new Error("Timeout: the test exceeded ".concat(context.config.timeout, " ms"))
                  }).then(resolve);
                }, config.timeout),
                err: null // null is the default

              }); // run the flow

              return Promise.resolve(context).then(useNoopsIfSkipped).then(runGiven).then(runWhen).then(checkAssertions).then(function (context) {
                clearTimeout(context.timer);
                return resolve(context.outcomes);
              }).catch(function (err) {
                clearTimeout(context.timer);
                publish({
                  type: TestEvent.types.TEST,
                  status: TestEvent.status.BROKEN,
                  suiteId: suiteId,
                  batchId: batchId,
                  behavior: test.behavior,
                  behaviors: test.behaviors,
                  error: err && err.error ? err.error : err
                }).then(resolve);
              }); // /flow
            }, 0); // /setTimeout
          }); // /outer Promise
        }; // /wrapper
      } // /AsyncTest


      return {
        AsyncTest: AsyncTest
      };
    } // /factory

  }; // /module

  module.exports = {
    name: 'hash',
    factory: function factory() {
      var createBuffer = function createBuffer(input) {
        if (typeof input !== 'string') {
          throw new Error('I only know how to hash strings');
        }

        var _arrBuffer = new ArrayBuffer(input.length * 2); // 2 bytes per char


        var _intBuffer = new Uint8Array(_arrBuffer);

        for (var i = 0; i < input.length; i += 1) {
          _intBuffer[i] = input.charCodeAt(i);
        }

        return _intBuffer;
      };

      var isBuffer = function isBuffer(input) {
        return input instanceof Uint8Array;
      };
      /**
       * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
       *
       * @author Derek Perez
       * @see https://github.com/perezd/node-murmurhash
       * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
       * @see http://github.com/garycourt/murmurhash-js
       * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
       * @see http://sites.google.com/site/murmurhash/
       *
       * @param {Buffer} key ASCII only
       * @param {number} seed Positive integer only
       * @return {number} 32-bit positive integer hash
       */


      function MurmurHashV3(key, seed) {
        if (!isBuffer(key)) key = createBuffer(key);
        var remainder, bytes, h1, h1b, c1, c2, k1, i;
        remainder = key.length & 3; // key.length % 4

        bytes = key.length - remainder;
        h1 = seed;
        c1 = 0xcc9e2d51;
        c2 = 0x1b873593;
        i = 0;

        while (i < bytes) {
          k1 = key[i] & 0xff | (key[++i] & 0xff) << 8 | (key[++i] & 0xff) << 16 | (key[++i] & 0xff) << 24;
          ++i;
          k1 = (k1 & 0xffff) * c1 + (((k1 >>> 16) * c1 & 0xffff) << 16) & 0xffffffff;
          k1 = k1 << 15 | k1 >>> 17;
          k1 = (k1 & 0xffff) * c2 + (((k1 >>> 16) * c2 & 0xffff) << 16) & 0xffffffff;
          h1 ^= k1;
          h1 = h1 << 13 | h1 >>> 19;
          h1b = (h1 & 0xffff) * 5 + (((h1 >>> 16) * 5 & 0xffff) << 16) & 0xffffffff;
          h1 = (h1b & 0xffff) + 0x6b64 + (((h1b >>> 16) + 0xe654 & 0xffff) << 16);
        }

        k1 = 0;
        /* eslint-disable no-fallthrough */

        switch (remainder) {
          case 3:
            k1 ^= (key[i + 2] & 0xff) << 16;

          case 2:
            k1 ^= (key[i + 1] & 0xff) << 8;

          case 1:
            k1 ^= key[i] & 0xff;
            k1 = (k1 & 0xffff) * c1 + (((k1 >>> 16) * c1 & 0xffff) << 16) & 0xffffffff;
            k1 = k1 << 15 | k1 >>> 17;
            k1 = (k1 & 0xffff) * c2 + (((k1 >>> 16) * c2 & 0xffff) << 16) & 0xffffffff;
            h1 ^= k1;
        }
        /* eslint-enable no-fallthrough */


        h1 ^= key.length;
        h1 ^= h1 >>> 16;
        h1 = (h1 & 0xffff) * 0x85ebca6b + (((h1 >>> 16) * 0x85ebca6b & 0xffff) << 16) & 0xffffffff;
        h1 ^= h1 >>> 13;
        h1 = (h1 & 0xffff) * 0xc2b2ae35 + (((h1 >>> 16) * 0xc2b2ae35 & 0xffff) << 16) & 0xffffffff;
        h1 ^= h1 >>> 16;
        return h1 >>> 0;
      }

      return {
        hash: MurmurHashV3
      };
    }
  };
  module.exports = {
    name: 'makeBatch',
    factory: function factory(dependencies) {
      'use strict';

      var hash = dependencies.hash;

      function BatchComposer(options) {
        var givenSynonyms = options.givenSynonyms; // ['given', 'arrange']

        var whenSynonyms = options.whenSynonyms; // ['when', 'act', 'topic']

        var config = ['timeout', 'assertionLibrary', 'reporter'];
        var actions = givenSynonyms.concat(whenSynonyms, config);
        var tapSkipPattern = /^# SKIP /i;
        var tapSkipOrTodoPattern = /(^# SKIP )|(^# TODO )/i;

        var getBySynonyms = function getBySynonyms(synonyms) {
          return function (node) {
            var key = Object.keys(node).find(function (key) {
              return synonyms.indexOf(key) > -1;
            });
            return key ? node[key] : undefined;
          };
        };

        var getGiven = getBySynonyms(givenSynonyms);
        var getWhen = getBySynonyms(whenSynonyms);

        var isAssertion = function isAssertion(node, key) {
          return typeof node === 'function' && actions.indexOf(key) === -1;
        };

        var makeBatchId = function makeBatchId(behavior) {
          return "B".concat(hash(behavior));
        };

        var makeTestId = function makeTestId(behavior) {
          return "T".concat(hash(behavior));
        };

        var makeOneAssertion = function makeOneAssertion(behavior, behaviors, node, skipped) {
          var _behaviors = behavior && behavior.trim().length ? behaviors.concat([behavior]) : behaviors;

          var _behavior = _behaviors.map(trimBehavior).join(', ');

          return {
            id: makeTestId(_behavior),
            behaviors: _behaviors,
            behavior: _behavior,
            test: node,
            skipped: skipped
          };
        };

        var getAssertions = function getAssertions(behavior, behaviors, node, skipped) {
          if (isAssertion(node, behavior)) {
            // empty behavior because the behavior should already be in `behaviors`
            return [makeOneAssertion('', behaviors, node, skipped
            /* isSkipped(behavior) was called just before this */
            )];
          }

          return Object.keys(node).filter(function (key) {
            return isAssertion(node[key], key);
          }).map(function (key) {
            return makeOneAssertion(key, behaviors, node[key], skipped || isSkipped(key));
          });
        };

        var isCommentedOut = function isCommentedOut(behavior) {
          return behavior.length >= 2 && behavior.trim().substring(0, 2) === '//';
        };

        var isTapSkipped = function isTapSkipped(behavior) {
          return tapSkipOrTodoPattern.test(behavior);
        };

        var isSkipped = function isSkipped(behavior) {
          if (behavior && (isCommentedOut(behavior) || isTapSkipped(behavior))) {
            return true;
          }

          return false;
        };

        var trimBehavior = function trimBehavior(behavior) {
          if (isCommentedOut(behavior)) {
            // remove the comments
            return behavior.substring(2).trim();
          } else if (tapSkipPattern.test(behavior)) {
            // remove the directive - it will be replaced in the TAP output
            return behavior.substring(7).trim();
          } else {
            return behavior.trim();
          }
        };

        function Layer(input) {
          var id = input.id,
              behavior = input.behavior,
              behaviors = input.behaviors,
              node = input.node,
              timeout = input.timeout,
              assertionLibrary = input.assertionLibrary;
          var parentSkipped = input.skipped;
          var parentGiven = input.given;
          var parentWhen = input.when;
          var parentWhenIsInheritedGiven = input.whenIsInheritedGiven;
          var skipped = parentSkipped || isSkipped(behavior);
          var assertions = getAssertions(behavior, behaviors, node, skipped, timeout);
          var given = getGiven(node) || parentGiven;
          var when = getWhen(node);
          var whenIsInheritedGiven = parentWhenIsInheritedGiven || false; // false is the default

          if (when) {
            // an immediate when is present, so this overrides the parent
            whenIsInheritedGiven = false;
          }

          if (!when && parentWhen && !whenIsInheritedGiven) {
            // an immediate when is NOT present, there is a parent `when`, and
            // it's not the result if `if (!when && given)` - this when
            // should be inherited

            /*
            'when nested assertions have givens (make-batch inline-comments)': {
              given: () => 42,
              when: (given) => given * 2,
              'it should equal 84': (t) => (err, actual) => {
                t.ifError(err)
                t.strictEqual(actual, 84)
              },
              'and they stem from a parent with a when': {
                given: () => 1,
                'it should equal 2': (t) => (err, actual) => {
                  t.ifError(err)
                  t.strictEqual(actual, 2)
                }
              }
            }
            */
            when = parentWhen;
          } else if (!when && given) {
            // There are neither an immediate when, nor a parent when because the parent
            // when was actually a given (the result of this block)

            /*
            'when nested assertions have givens (make-batch if (!when && given))': {
              given: () => 42,
              'it should equal 42': (t) => (err, actual) => {
                t.ifError(err)
                t.strictEqual(actual, 42)
              },
              'and they stem from a parent with a when': {
                given: () => 1,
                'it should equal 1': (t) => (err, actual) => {
                  t.ifError(err)
                  t.strictEqual(actual, 1)
                }
              }
            }
            */
            whenIsInheritedGiven = true;
            when = given;
          }

          return {
            id: id || makeTestId(behavior),
            behaviors: behaviors,
            behavior: behavior,
            given: given,
            when: when,
            assertions: assertions,
            skipped: skipped,
            timeout: timeout,
            assertionLibrary: assertionLibrary,
            whenIsInheritedGiven: whenIsInheritedGiven
          };
        }

        function FlattenedTests(input) {
          var behavior = input.behavior,
              behaviors = input.behaviors,
              node = input.node,
              given = input.given,
              when = input.when,
              whenIsInheritedGiven = input.whenIsInheritedGiven,
              skipped = input.skipped,
              timeout = input.timeout,
              assertionLibrary = input.assertionLibrary;
          var layers = [];
          var props = Object.keys(node);
          var parent = new Layer({
            id: makeBatchId(behavior),
            behaviors: Array.isArray(behaviors) ? behaviors : [behavior],
            behavior: behavior,
            node: node,
            given: given,
            when: when,
            whenIsInheritedGiven: whenIsInheritedGiven,
            skipped: skipped || node.skipped,
            timeout: timeout || node.timeout,
            assertionLibrary: assertionLibrary || node.assertionLibrary
          });

          if (Array.isArray(parent.assertions) && parent.assertions.length) {
            layers.push(parent);
          }

          props.filter(function (childKey) {
            return _typeof(node[childKey]) === 'object';
          }).map(function (childKey) {
            return FlattenedTests({
              behaviors: parent.behaviors.concat([childKey]),
              behavior: childKey,
              node: node[childKey],
              given: parent.given,
              when: parent.when,
              whenIsInheritedGiven: parent.whenIsInheritedGiven,
              // skipping favors the parent over the child
              skipped: parent.skipped || isSkipped(childKey),
              // timeout and assertion lib favor the child over the parent
              timeout: node[childKey].timeout || parent.timeout,
              assertionLibrary: node[childKey].assertionLibrary || parent.assertionLibrary
            });
          }).forEach(function (mappedLayers) {
            return mappedLayers.filter(function (mappedLayer) {
              return Array.isArray(mappedLayer.assertions) && mappedLayer.assertions.length;
            }).forEach(function (mappedLayer) {
              return layers.push(mappedLayer);
            });
          });
          return layers;
        }

        var makeBatch = function makeBatch(tests) {
          return Object.keys(tests).reduce(function (batch, key) {
            return batch.concat(new FlattenedTests({
              behavior: key,
              node: tests[key]
            }));
          }, []);
        };

        return {
          makeBatch: makeBatch
        };
      } // /BatchComposer


      return {
        BatchComposer: BatchComposer
      };
    } // /factory

  }; // /exports

  module.exports = {
    name: 'makeSuiteConfig',
    factory: function factory(dependencies) {
      'use strict';

      var defaults = dependencies.defaults,
          subscribe = dependencies.subscribe,
          subscriptionExists = dependencies.subscriptionExists,
          allSubscriptions = dependencies.allSubscriptions,
          reporterFactory = dependencies.reporterFactory;

      var makeSuiteId = function makeSuiteId() {
        return "S".concat((Math.random() * 0xFFFFFF << 0).toString(16).toUpperCase());
      };

      var makeSuiteConfig = function makeSuiteConfig(options) {
        var suiteConfig = {
          assertionLibrary: defaults.assertionLibrary,
          match: defaults.match,
          name: makeSuiteId(),
          timeout: 2000,
          reporters: [],
          givenSynonyms: ['given', 'arrange'],
          whenSynonyms: ['when', 'act', 'topic']
        };
        options = _objectSpread({}, options);

        if (options.assertionLibrary) {
          suiteConfig.assertionLibrary = options.assertionLibrary;
        }

        if (typeof options.match === 'string') {
          suiteConfig.match = new RegExp(options.match);
        } else if (options.match && typeof options.match.test === 'function') {
          suiteConfig.match = options.match;
        } else if (options.match === null) {
          // let hard coded options override (I use this in the tests)
          suiteConfig.match = options.match;
        }

        if (typeof options.name === 'string' && options.name.trim().length) {
          suiteConfig.name = options.name.trim();
        }

        if (typeof options.timeout === 'number' && options.timeout > 0) {
          suiteConfig.timeout = options.timeout;
        }

        if (typeof options.useColors === 'boolean') {
          suiteConfig.useColors = options.useColors;
        }

        if (Array.isArray(options.givenSynonyms)) {
          var synonyms = options.givenSynonyms.filter(function (synonym) {
            return typeof synonym === 'string' && synonym.trim().length;
          }).map(function (synonym) {
            return synonym.trim();
          });

          if (synonyms.length) {
            suiteConfig.givenSynonyms = synonyms;
          }
        }

        if (Array.isArray(options.whenSynonyms)) {
          var _synonyms = options.whenSynonyms.filter(function (synonym) {
            return typeof synonym === 'string' && synonym.trim().length;
          }).map(function (synonym) {
            return synonym.trim();
          });

          if (_synonyms.length) {
            suiteConfig.whenSynonyms = _synonyms;
          }
        }

        var makeReporterArray = function makeReporterArray(input) {
          return input.split(',').map(function (reporter) {
            return reporter.trim().toUpperCase();
          });
        };

        var addReporter = function addReporter(nameOrFunc) {
          if (typeof nameOrFunc === 'string') {
            var reporter = reporterFactory.get(nameOrFunc);

            if (!subscriptionExists(reporter.name)) {
              subscribe(reporter);
            }

            suiteConfig.reporters.push(reporter);
          } else {
            reporterFactory.add(nameOrFunc);
            addReporter(nameOrFunc.name);
          }
        }; // reporters: accept strings, functions, or objects


        if (typeof options.reporter === 'string') {
          makeReporterArray(options.reporter).forEach(addReporter);
        } else if (typeof options.reporter === 'function') {
          addReporter(function CustomReporter() {
            return {
              write: options.reporter
            };
          });
        } else if (options.reporter && typeof options.reporter.report === 'function') {
          // legacy
          addReporter(function CustomReporter() {
            return {
              write: options.reporter.report
            };
          });
        } else if (options.reporter && typeof options.reporter.write === 'function') {
          addReporter(function CustomReporter() {
            return {
              write: options.reporter.write
            };
          });
        } // reporters: accept strings, or arrays


        if (typeof options.reporters === 'string') {
          makeReporterArray(options.reporters).forEach(addReporter);
        } else if (Array.isArray(options.reporters)) {
          options.reporters.forEach(addReporter);
        }

        if (!suiteConfig.reporters.length) {
          defaults.reporters.forEach(addReporter);
        }

        suiteConfig.subscriptions = allSubscriptions();

        suiteConfig.makeTheoryConfig = function (theory) {
          theory = _objectSpread({}, theory);
          return {
            timeout: theory.timeout || suiteConfig.timeout,
            assertionLibrary: theory.assertionLibrary || suiteConfig.assertionLibrary
          };
        };

        return suiteConfig;
      }; // /makeSuiteConfig


      return {
        makeSuiteConfig: makeSuiteConfig
      };
    } // /factory

  }; // /module

  module.exports = {
    name: 'pubsub',
    factory: function factory(dependencies) {
      'use strict';

      var allSettled = dependencies.allSettled,
          isPromise = dependencies.isPromise,
          TestEvent = dependencies.TestEvent;

      var makeId = function makeId() {
        return "S".concat((Math.random() * 0xFFFFFF << 0).toString(16).toUpperCase());
      };

      function Pubsub() {
        var subscriptions = [];

        var publish = function publish(input) {
          var event = new TestEvent(input);
          return allSettled(subscriptions.map(function (subscription) {
            var result = subscription.write(event);
            return isPromise(result) ? result : Promise.resolve(result);
          })).then(function () {
            return event;
          });
        };

        var subscribe = function subscribe(subscription) {
          var name = subscription.name || makeId();

          if (typeof subscription === 'function') {
            subscriptions.push({
              name: name,
              write: subscription
            });
          } else if (subscriptions && typeof subscription.write === 'function') {
            subscription.name = subscription.name || name;
            subscriptions.push(subscription);
          } else {
            throw new Error('Invalid subscription: expected either a function, or { name: string, write: function }');
          }
        };

        var subscriptionExists = function subscriptionExists(name) {
          if (subscriptions.find(function (subscription) {
            return subscription.name === name;
          })) {
            return true;
          }

          return false;
        };

        var allSubscriptions = function allSubscriptions() {
          return subscriptions.map(function (subscription) {
            return subscription.name;
          });
        };

        var reset = function reset() {
          subscriptions = [];
        };

        return {
          publish: publish,
          subscribe: subscribe,
          subscriptionExists: subscriptionExists,
          allSubscriptions: allSubscriptions,
          reset: reset
        };
      }

      return {
        Pubsub: Pubsub
      };
    }
  };
  module.exports = {
    name: 'Suite',
    factory: function factory(dependencies) {
      'use strict';

      var allSettled = dependencies.allSettled,
          AsyncTest = dependencies.AsyncTest,
          findFiles = dependencies.findFiles,
          BatchComposer = dependencies.BatchComposer,
          makeSuiteConfig = dependencies.makeSuiteConfig,
          publish = dependencies.publish,
          subscribe = dependencies.subscribe,
          clearSubscriptions = dependencies.clearSubscriptions,
          reporterFactory = dependencies.reporterFactory,
          resolveTests = dependencies.resolveTests,
          runServer = dependencies.runServer,
          makePlans = dependencies.makePlans,
          Tally = dependencies.Tally,
          TestEvent = dependencies.TestEvent;

      var makeBatchId = function makeBatchId() {
        return "B".concat((Math.random() * 0xFFFFFF << 0).toString(16).toUpperCase());
      };

      var makeNormalBatch = function makeNormalBatch(description, assertions) {
        var batch = {};
        batch[description] = assertions;
        return batch;
      };
      /**
       * Suite accepts ad-hoc polymorphic input. This function figures out what
       * combination of inputs are present, and returns a consistent interface:
       * @param description {string|object|function} - Either a description, a batch, or an assertion
       * @param assertions {object|function} - Either a batch, or an assertion
       *
       *   {
       *     [description: string]: IBDD | IBehaviors | IAssert | ICurriedAssert | IPromiseOrFunction
       *   }
       */


      var normalizeBatch = function normalizeBatch(description, assertions) {
        var descriptionType = _typeof(description);

        var assertionsType = _typeof(assertions);

        if (descriptionType === 'string' && assertionsType === 'function') {
          // description, IAssert
          return Promise.resolve(makeNormalBatch(description, {
            '': assertions
          }));
        } else if (descriptionType === 'string') {
          // description, IBDD|IAAA|IVow
          return Promise.resolve(makeNormalBatch(description, assertions));
        } else if (descriptionType === 'object') {
          // description is IBDD|IAAA|IVow
          return Promise.resolve(description);
        } else if (descriptionType === 'function') {
          // description is IAssert
          return Promise.resolve({
            '': description
          });
        } else {
          return Promise.reject(new Error('An invalid test was found: a test or batch of tests is required'));
        }
      }; // /normalizebatch

      /**
       * If `match` is present in the config, this will test the assertions in
       * a batch to identity whether or not they match
       * @curried
       * @param config {object} - the Suite options
       * @param theory {object} - one result of makeBatch (`mapper`) (a batch is an array of theories)
       */


      var matcher = function matcher(config) {
        return function (theory) {
          if (!config.match) {
            return true;
          }

          for (var i = 0; i < theory.assertions.length; i += 1) {
            if (config.match.test(theory.assertions[i].behavior)) {
              return true;
            }
          }
        };
      };
      /**
       * Maps the result of normalizeBatch to a batch:
       * @curried
       * @param config {object} - the Suite options
       * @param makeBatch {function} - a configured instance of the BatchComposer
       * @param byMatcher {function} - a configured instance of `matcher`
       * @param batch {function} - the result of normalized batch
       *
       *   {
       *     batchId: string;
       *     batch: IBatch,
       *     tests: IAsyncTest[]
       *   }
       */


      var mapper = function mapper(config, makeBatch, byMatcher) {
        return function (batch) {
          var theories = makeBatch(batch).filter(byMatcher);
          return {
            batchId: theories.length ? theories[0].id : makeBatchId(),
            theories: theories
          };
        };
      };

      var planner = function planner(config, mapToBatch) {
        var plan = {
          count: 0,
          completed: 0,
          batches: []
        };

        var addToPlan = function addToPlan(description, assertions) {
          return normalizeBatch(description, assertions).then(mapToBatch).then(function (context) {
            if (context.theories.length) {
              plan.batches.push(context);
              plan.count += context.theories.reduce(function (count, item) {
                return count + item.assertions.length;
              }, 0);
            }

            return plan;
          });
        };

        addToPlan.getPlan = function () {
          return plan;
        };

        return addToPlan;
      };

      var brokenTestPublisher = function brokenTestPublisher(suiteId) {
        return function (error) {
          return publish({
            type: TestEvent.types.TEST,
            status: TestEvent.status.BROKEN,
            behavior: "Failed to load test: ".concat(error.filePath),
            suiteId: suiteId,
            error: error
          });
        };
      };
      /**
       * Merges the values of allSettled results into a single array of values.
       * > NOTE this does not deal with undefined values
       * @param prop - the name of the property to merge (value, or reason)
       */


      var toOneArray = function toOneArray(prop) {
        return function (output, current) {
          return Array.isArray(current[prop]) ? output.concat(current[prop]) : output.concat([current[prop]]);
        };
      };

      var fullfilledToOneArray = toOneArray('value');
      var failedToOneArray = toOneArray('reason');

      var batchRunner = function batchRunner(config, publishOneBrokenTest) {
        return function (batch, plan) {
          return publish({
            type: TestEvent.types.START_BATCH,
            batchId: batch.batchId,
            suiteId: config.name,
            plan: plan
          }).then(function () {
            // map the batch theories to tests
            return batch.theories.map(function (theory) {
              return new AsyncTest(theory, config.makeTheoryConfig(theory), batch.batchId, config.name);
            });
          }).then(function (tests) {
            return allSettled(tests.map(function (test) {
              return test();
            }));
          }).then(function (results) {
            return {
              results: results.filter(function (result) {
                return result.status === 'fullfilled';
              }).reduce(fullfilledToOneArray, []),
              broken: results.filter(function (result) {
                return result.status !== 'fullfilled';
              }).reduce(failedToOneArray, []),
              batchTotals: Tally.getTally().batches[batch.batchId]
            };
          }).then(function (context) {
            var publishEndBatch = function publishEndBatch() {
              return publish({
                type: TestEvent.types.END_BATCH,
                batchId: batch.batchId,
                suiteId: config.name,
                totals: context.batchTotals
              });
            };

            if (Array.isArray(context.broken) && context.broken.length) {
              // these tests failed during the planning stage
              return allSettled(context.broken.map(publishOneBrokenTest)).then(publishEndBatch).then(function () {
                return context;
              });
            } else {
              return publishEndBatch().then(function () {
                return context;
              });
            }
          }).then(function (context) {
            return {
              batchId: batch.batchId,
              results: context.results,
              broken: context.broken,
              totals: context.batchTotals
            };
          });
        };
      }; // /batchRunner


      var tester = function tester(config, runBatch, runnerMode) {
        return function (plan) {
          return Promise.resolve({
            plan: plan
          }).then(function (context) {
            if (!runnerMode) {
              return publish({
                type: TestEvent.types.START,
                suiteId: config.name,
                plan: {
                  count: context.plan.count,
                  completed: 0
                }
              }).then(function () {
                return context;
              });
            }

            return Promise.resolve(context);
          }).then(function (context) {
            return Promise.all(context.plan.batches.map(function (batch) {
              return runBatch(batch, context.plan);
            }));
          }).then(function (context) {
            if (!runnerMode) {
              return publish({
                type: TestEvent.types.END_TALLY,
                suiteId: config.name
              }).then(function () {
                return publish({
                  type: TestEvent.types.END,
                  suiteId: config.name,
                  totals: Tally.getSimpleTally()
                });
              }).then(function () {
                return context;
              });
            }

            return Promise.resolve(context);
          }).then(function (context) {
            if (Array.isArray(context) && context.length === 1) {
              return context[0];
            }

            return context;
          }).catch(function (e) {
            publish({
              type: TestEvent.types.TEST,
              status: TestEvent.status.BROKEN,
              behavior: 'Failed to load test',
              suiteId: config.name,
              error: e
            });
            throw e;
          });
        };
      };

      var runner = function runner(config, suite, publishOneBrokenTest, execute) {
        return function (planContext) {
          var plan = planContext.plan,
              files = planContext.files,
              broken = planContext.broken;
          return publish({
            type: TestEvent.types.START,
            suiteId: config.name,
            plan: {
              count: plan.count,
              completed: 0
            }
          }).then(function () {
            if (broken && broken.length) {
              // these tests failed during the planning stage
              return allSettled(broken.map(publishOneBrokenTest));
            }
          }).then(function () {
            return execute(plan);
          }).then(function (output) {
            return publish({
              type: TestEvent.types.END_TALLY,
              suiteId: config.name
            }).then(function () {
              return output;
            });
          } // pass through
          ).then(function (output) {
            return publish({
              type: TestEvent.types.FINAL_TALLY,
              suiteId: config.name,
              totals: Tally.getTally()
            }).then(function () {
              return output;
            });
          } // pass through
          ).then(function (output) {
            // only get the tally _after_ END_TALLY was emitted
            return {
              output: output,
              tally: Tally.getSimpleTally()
            };
          }).then(function (context) {
            return publish({
              type: TestEvent.types.END,
              suiteId: config.name,
              totals: context.tally
            }).then(function () {
              return context;
            });
          } // pass through
          ).then(function (_ref) {
            var output = _ref.output,
                tally = _ref.tally;
            return {
              files: files,
              results: output.results,
              broken: broken,
              config: planContext.config,
              suite: suite,
              totals: tally
            };
          });
        };
      };

      var browserRunner = function browserRunner(config, test) {
        return function (options) {
          return function () {
            return Array.isArray(options.paths) ? runServer(test, options)(options) : findFiles(options).then(runServer(test, options));
          };
        };
      };
      /**
       * The test library
       * @param {Object} suiteConfig : optional configuration
      */


      function Suite(suiteConfig, envvars) {
        var runnerMode = false;
        suiteConfig = _objectSpread({}, suiteConfig);
        /**
         * @param suiteDotConfigureOptions - configuration provided in line with `supposed.Suite().configure(suiteDotConfigureOptions)`
         */

        var configure = function configure(suiteDotConfigureOptions) {
          suiteDotConfigureOptions = _objectSpread({}, suiteDotConfigureOptions);

          var _suiteConfig = Object.keys(suiteConfig).concat(Object.keys(suiteDotConfigureOptions)).reduce(function (cfg, key) {
            cfg[key] = typeof suiteDotConfigureOptions[key] !== 'undefined' ? suiteDotConfigureOptions[key] : suiteConfig[key];
            return cfg;
          }, {});

          clearSubscriptions();
          subscribe(reporterFactory.get(Tally.name));
          var config = makeSuiteConfig(_suiteConfig);
          var publishOneBrokenTest = brokenTestPublisher(config.name);

          var _ref2 = new BatchComposer(config),
              makeBatch = _ref2.makeBatch;

          var byMatcher = matcher(config);
          var mapToBatch = mapper(config, makeBatch, byMatcher);
          var runBatch = batchRunner(config, publishOneBrokenTest);
          var plan = planner(config, mapToBatch);

          var test = function test(description, assertions) {
            if (runnerMode) {
              return plan(description, assertions);
            } else {
              return plan(description, assertions).then(tester(config, runBatch, runnerMode));
            }
          };

          test.id = config.name;
          test.plan = plan;
          test.reporters = config.reporters;
          test.config = config;
          test.dependencies = _suiteConfig && _suiteConfig.inject;
          test.configure = configure;

          test.subscribe = function (subscription) {
            subscribe(subscription);
            return test;
          };

          test.runner = function (options) {
            options = options || {};

            if (envvars && envvars.file && typeof envvars.file.test === 'function') {
              options.matchesNamingConvention = envvars.file;
            }

            var findAndStart = browserRunner(config, test);

            var addPlanToContext = function addPlanToContext() {
              return function (context) {
                context.plan = plan.getPlan();
                return context;
              };
            };

            var findAndPlan = function findAndPlan() {
              runnerMode = true;
              return findFiles(options).then(resolveTests()).then(makePlans(test)).then(addPlanToContext());
            };

            return {
              plan: findAndPlan,
              // find and run (node)
              run: function run() {
                return findAndPlan().then(runner(config, test, publishOneBrokenTest, tester(config, runBatch, runnerMode)));
              },
              // run (browser|node)
              runTests: function runTests(tests) {
                if (Array.isArray(tests)) {
                  options.tests = tests;
                }

                runnerMode = true;
                return makePlans(test)(options).then(addPlanToContext()).then(runner(config, test, publishOneBrokenTest, tester(config, runBatch, runnerMode)));
              },
              // start test server (browser)
              startServer: findAndStart(options)
            };
          }; // @deprecated - may go away in the future


          test.printSummary = function () {
            return publish({
              type: TestEvent.types.END,
              suiteId: config.name,
              totals: Tally.getSimpleTally()
            });
          }; // @deprecated - may go away in the future


          test.getTotals = function () {
            return Tally.getSimpleTally();
          };

          return test;
        };

        return configure();
      } // Suite.suites = []


      return {
        Suite: Suite
      };
    } // /factory

  }; // /module

  module.exports = {
    name: 'TestEvent',
    factory: function factory(dependencies) {
      'use strict';

      var clock = dependencies.clock;
      var TYPE_EXPRESSION = /(^START$)|(^START_BATCH$)|(^START_TEST$)|(^TEST$)|(^END_BATCH$)|(^END_TALLY$)|(^FINAL_TALLY$)|(^END$)/;
      var STATUS_EXPRESSION = /(^PASSED$)|(^SKIPPED$)|(^FAILED$)|(^BROKEN$)/;
      var testCount = 0;

      var makeJSONStringifiableError = function makeJSONStringifiableError(err) {
        var error = {
          message: err.message,
          stack: err.stack
        };
        Object.keys(err).forEach(function (key) {
          var _err = err[key];

          if (_err && _err.message) {
            error[key] = makeJSONStringifiableError(err[key]);
          } else {
            error[key] = err[key];
          }
        });
        return error;
      };

      var TestEvent = function TestEvent(event) {
        var self = {};
        event = Object.assign({}, event);

        if (event.suiteId) {
          self.suiteId = event.suiteId;
        }

        if (event.batchId) {
          self.batchId = event.batchId;
        }

        if (event.testId) {
          self.testId = event.testId;
        }

        if (event.type === TestEvent.types.TEST) {
          testCount += 1;
          self.count = testCount;
        }

        if (typeof event.time === 'number' || typeof event.time === 'bigint') {
          self.time = event.time;
        } else {
          self.time = clock();
        }

        self.type = getType(event.type);

        if (typeof event.status === 'string' && STATUS_EXPRESSION.test(event.status)) {
          self.status = event.status;
        } else if (event.status) {
          self.status = 'UNKNOWN';
        }

        if (event.behavior) {
          self.behavior = event.behavior;
        }

        if (Array.isArray(event.behaviors)) {
          self.behaviors = event.behaviors;
        }

        if (event.plan) {
          self.plan = event.plan;
        }

        if (event.error) {
          self.error = makeJSONStringifiableError(event.error);
        }

        if (typeof event.log !== 'undefined') {
          self.log = event.log;
        }

        if (event.context) {
          self.context = event.context;
        }

        if (event.duration) {
          self.duration = event.duration;
        }

        if (event.tally) {
          self.tally = event.tally;
        }

        if (event.totals) {
          self.totals = event.totals;
        }

        return Object.freeze(self);
      };

      TestEvent.types = {
        START: 'START',
        START_BATCH: 'START_BATCH',
        START_TEST: 'START_TEST',
        TEST: 'TEST',
        END_BATCH: 'END_BATCH',
        END_TALLY: 'END_TALLY',
        FINAL_TALLY: 'FINAL_TALLY',
        END: 'END'
      };
      TestEvent.status = {
        PASSED: 'PASSED',
        SKIPPED: 'SKIPPED',
        FAILED: 'FAILED',
        BROKEN: 'BROKEN'
      };

      function getType(type) {
        if (TYPE_EXPRESSION.test(type)) {
          return type;
        }

        return 'UNKNOWN';
      }

      return {
        TestEvent: TestEvent
      };
    } // /factory

  }; // /module

  module.exports = {
    name: 'time',
    factory: function factory() {
      'use strict';

      var UNITS = {
        SECONDS: 's',
        MILLISECONDS: 'ms',
        MICROSECONDS: 'us',
        NANOSECONDS: 'ns'
      };
      var UNITS_ARRAY = Object.keys(UNITS).map(function (key) {
        return UNITS[key];
      });

      var isValidUnit = function isValidUnit(unit) {
        return UNITS_ARRAY.includes(unit);
      };

      var makeClock = function makeClock(MULTIPLIERS, makeTime) {
        var clock = function clock(option) {
          switch (option) {
            case 's':
              return makeTime(MULTIPLIERS.SECONDS);

            case 'ms':
              return makeTime(MULTIPLIERS.MILLISECONDS);

            case 'us':
              return makeTime(MULTIPLIERS.MICROSECONDS);

            case 'ns':
              return makeTime(MULTIPLIERS.NANOSECONDS);

            default:
              return {
                seconds: makeTime(MULTIPLIERS.SECONDS),
                milliseconds: makeTime(MULTIPLIERS.MILLISECONDS),
                microseconds: makeTime(MULTIPLIERS.MICROSECONDS),
                nanoseconds: makeTime(MULTIPLIERS.NANOSECONDS)
              };
          }
        };

        clock.seconds = function () {
          return clock(UNITS.SECONDS);
        };

        clock.milliseconds = function () {
          return clock(UNITS.MILLISECONDS);
        };

        clock.microseconds = function () {
          return clock(UNITS.MICROSECONDS);
        };

        clock.nanoseconds = function () {
          return clock(UNITS.NANOSECONDS);
        };

        return clock;
      };

      var CONVERSIONS = {
        s: {
          SECONDS: 1,
          MILLISECONDS: 1000,
          MICROSECONDS: 1000000,
          NANOSECONDS: 1000000000
        },
        ms: {
          SECONDS: 0.001,
          MILLISECONDS: 1,
          MICROSECONDS: 1000,
          NANOSECONDS: 1000000
        },
        us: {
          SECONDS: 0.000001,
          MILLISECONDS: 0.001,
          MICROSECONDS: 1,
          NANOSECONDS: 1000
        },
        ns: {
          SECONDS: 1e9,
          MILLISECONDS: 0.000001,
          MICROSECONDS: 0.001,
          NANOSECONDS: 1
        }
      };

      var duration = function duration(start, end, timeUnits) {
        var conversions = CONVERSIONS[timeUnits];
        return {
          seconds: (end - start) * conversions.SECONDS,
          milliseconds: (end - start) * conversions.MILLISECONDS,
          microseconds: (end - start) * conversions.MICROSECONDS,
          nanoseconds: (end - start) * conversions.NANOSECONDS
        };
      };

      var addDurations = function addDurations() {
        var duration = {
          seconds: 0,
          milliseconds: 0,
          microseconds: 0,
          nanoseconds: 0
        };

        for (var _len = arguments.length, durations = new Array(_len), _key = 0; _key < _len; _key++) {
          durations[_key] = arguments[_key];
        }

        durations.forEach(function (_dur) {
          if (typeof _dur.microseconds === 'number' && _dur.microseconds > 0) {
            duration.seconds += _dur.seconds;
            duration.milliseconds += _dur.milliseconds;
            duration.microseconds += _dur.microseconds;
            duration.nanoseconds += _dur.nanoseconds;
          }
        });
        return duration;
      };

      var NODE_MULTIPLIERS = {
        SECONDS: [1, 1e-9],
        MILLISECONDS: [1e3, 1e-6],
        MICROSECONDS: [1e6, 1e-3],
        NANOSECONDS: [1e9, 1]
      };
      var BROWSER_MULTIPLIERS = {
        SECONDS: 0.001,
        MILLISECONDS: 1,
        MICROSECONDS: 1000,
        NANOSECONDS: 1000000
      };

      var nodeClock = function nodeClock(multipliers, hrtime) {
        var time = Array.isArray(hrtime) ? process.hrtime(hrtime) : process.hrtime();
        return time[0] * multipliers[0] + time[1] * multipliers[1];
      };

      var browserClock = function browserClock(multiplier, hrtime) {
        return window.performance.now() * multiplier;
      };

      var clock = typeof process !== 'undefined' && typeof process.hrtime === 'function' ? makeClock(NODE_MULTIPLIERS, nodeClock) : makeClock(BROWSER_MULTIPLIERS, browserClock);
      return {
        clock: clock,
        isValidUnit: isValidUnit,
        duration: duration,
        addDurations: addDurations
      };
    }
  };
  module.exports = {
    name: 'makePlans',
    factory: function factory(dependencies) {
      'use strict';

      var allSettled = dependencies.allSettled;

      var hasThen = function hasThen(obj) {
        return obj && typeof obj.then === 'function';
      };

      var toPromise = function toPromise(config, suite) {
        return function (input) {
          var err, test, path;

          try {
            if (typeof input === 'function') {
              test = input;
            } else if (input) {
              err = input.err;
              test = input.test;
              path = input.path;
            } else {
              throw new Error("Invalid makePlans entry: expected input ".concat(_typeof(input), " to be a {function}, or { err?: Error; test: Function|Promise; path?: string; }"));
            }

            if (err) {
              err.filePath = path;
              return Promise.reject(err);
            }

            if (hasThen(test)) {
              // module.exports = test('something', (t) => {...})
              return test;
            } else if (suite && config.injectSuite !== false && typeof test === 'function') {
              // module.exports = function (test) {}
              // export = function (test) {}
              var maybePromise = test(suite, suite.dependencies);
              return hasThen(maybePromise) ? maybePromise : Promise.resolve(maybePromise);
            } else if (suite && config.injectSuite !== false && _typeof(test) === 'object' && typeof test.default === 'function') {
              // export default function (test) {}
              var _maybePromise = test.default(suite, suite.dependencies);

              return hasThen(_maybePromise) ? _maybePromise : Promise.resolve(_maybePromise);
            }

            return Promise.resolve();
          } catch (e) {
            e.filePath = path;
            return Promise.reject(e);
          }
        };
      };

      var mapToResults = function mapToResults(config) {
        var paths = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        return function (results) {
          return {
            files: paths,
            config: config,
            broken: results.filter(function (result) {
              return result.status !== 'fullfilled';
            }).map(function (result) {
              return result.reason;
            })
          };
        };
      };

      var makePlans = function makePlans(suite) {
        return function (context) {
          var config = context.config,
              tests = context.tests,
              paths = context.paths;

          if (!tests) {
            throw new Error('run-tests expects tests to be provided');
          }

          return Promise.resolve(tests.map(toPromise(config || context, suite))).then(allSettled).then(mapToResults(config, paths));
        };
      };

      return {
        makePlans: makePlans
      };
    } // /factory

  }; // /module

  module.exports = {
    name: 'consoleStyles',
    factory: function factory() {
      'use strict';

      var consoleStyles = [{
        name: 'reset',
        value: [0, 0]
      }, {
        name: 'bold',
        value: [1, 22]
      }, {
        name: 'italic',
        value: [3, 23]
      }, {
        name: 'underline',
        value: [4, 24]
      }, {
        name: 'dim',
        value: [2, 22]
      }, {
        name: 'hidden',
        value: [8, 28]
      }, {
        name: 'strikethrough',
        value: [9, 29]
      }, {
        name: 'inverse',
        value: [7, 27]
      }, {
        name: 'black',
        value: [30, 39]
      }, {
        name: 'blue',
        value: [34, 39]
      }, {
        name: 'cyan',
        value: [96, 39]
      }, {
        name: 'green',
        value: [32, 39]
      }, {
        name: 'green-hi',
        value: [92, 32]
      }, {
        name: 'grey',
        value: [90, 39]
      }, {
        name: 'magenta',
        value: [35, 39]
      }, {
        name: 'red',
        value: [31, 39]
      }, {
        name: 'white',
        value: [37, 39]
      }, {
        name: 'yellow',
        value: [33, 39]
      }, {
        name: 'bgBlack',
        value: [40, 49]
      }, {
        name: 'bgRed',
        value: [41, 49]
      }, {
        name: 'bgGreen',
        value: [42, 49]
      }, {
        name: 'bgYellow',
        value: [43, 49]
      }, {
        name: 'bgBlue',
        value: [44, 49]
      }, {
        name: 'bgMagenta',
        value: [45, 49]
      }, {
        name: 'bgCyan',
        value: [46, 49]
      }, {
        name: 'bgWhite',
        value: [47, 49]
      }].reduce(function (styles, style) {
        styles[style.name] = function (input) {
          return input;
        };

        return styles;
      }, {});

      consoleStyles.newLine = function () {
        return '\n';
      };

      consoleStyles.space = function () {
        return ' ';
      };

      return {
        consoleStyles: consoleStyles
      };
    }
  };
  module.exports = {
    name: 'BlockFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          DefaultFormatter = dependencies.DefaultFormatter;

      function BlockFormatter() {
        return DefaultFormatter({
          SYMBOLS: {
            PASSED: "".concat(consoleStyles.bgGreen(consoleStyles.black(' PASS ')), " "),
            FAILED: "".concat(consoleStyles.bgRed(consoleStyles.black(' FAIL ')), " "),
            BROKEN: "".concat(consoleStyles.bgMagenta(consoleStyles.black(' !!!! ')), " "),
            SKIPPED: "".concat(consoleStyles.bgYellow(consoleStyles.black(' SKIP ')), " "),
            INFO: "".concat(consoleStyles.bgCyan(consoleStyles.black(' INFO ')), " ")
          }
        });
      }

      return {
        BlockFormatter: BlockFormatter
      };
    }
  };
  module.exports = {
    name: 'BriefFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          DefaultFormatter = dependencies.DefaultFormatter,
          TestEvent = dependencies.TestEvent;

      function BriefFormatter() {
        var defaultFormat = DefaultFormatter({
          SYMBOLS: {
            PASSED: consoleStyles.green('✓ '),
            // heavy-check: '✔',
            FAILED: consoleStyles.red('✗ '),
            // heavy-x '✘',
            BROKEN: consoleStyles.red('!= '),
            // heavy-x '✘',
            SKIPPED: consoleStyles.yellow('⸕ '),
            INFO: consoleStyles.cyan('# ')
          }
        }).format;

        var isFail = function isFail(event) {
          return event.type === TestEvent.types.TEST && (event.status === TestEvent.status.FAILED || event.status === TestEvent.status.BROKEN);
        };

        var format = function format(event) {
          if ([TestEvent.types.START, TestEvent.types.END].indexOf(event.type) > -1) {
            return defaultFormat(event);
          } else if (isFail(event)) {
            return defaultFormat(event);
          } else if (event.isDeterministicOutput) {
            var output = event.testEvents.filter(isFail).map(defaultFormat).join('\n');
            output += defaultFormat(event.endEvent);
            return output;
          }
        };

        return {
          format: format
        };
      }

      return {
        BriefFormatter: BriefFormatter
      };
    }
  };
  module.exports = {
    name: 'DefaultFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          TestEvent = dependencies.TestEvent,
          SYMBOLS = dependencies.SYMBOLS;
      var newLine = consoleStyles.newLine();

      var formatInfo = function formatInfo(log) {
        if (typeof log === 'undefined') {
          return '';
        }

        return newLine + JSON.stringify(log, null, 2).split(newLine).map(function (line) {
          return "    ".concat(line);
        }).join(newLine);
      };

      var formatComparable = function formatComparable(input) {
        var output = JSON.stringify(input, null, 2);

        if (input && !output) {
          output = input.toString();
        }

        if (output.indexOf(newLine) > -1) {
          return output.split(newLine).map(function (line) {
            return "    ".concat(line);
          }).join(newLine).substring(4) + newLine;
        }

        return output;
      };

      var formatExpectedAndActual = function formatExpectedAndActual(error) {
        return "    expected: ".concat(consoleStyles.green(formatComparable(error.expected))) + "    actual: ".concat(consoleStyles.red(formatComparable(error.actual)));
      };

      var formatStack = function formatStack(error) {
        if (!error.stack) {
          return '';
        }

        var stack = error.stack.split(newLine).map(function (line) {
          return "    ".concat(line.trim());
        }).join(newLine);
        return error.expected && error.actual ? "".concat(newLine).concat(newLine).concat(stack).concat(newLine) : "".concat(newLine).concat(stack).concat(newLine);
      };

      var formatDuration = function formatDuration(duration) {
        if (!duration) {
          return '';
        }

        if (duration.seconds > 1) {
          return "".concat(Math.round(duration.seconds), "s");
        } else if (duration.milliseconds > 1) {
          return "".concat(Math.round(duration.milliseconds), "ms");
        } else if (duration.microseconds > 1) {
          return "".concat(Math.round(duration.microseconds), "\xB5s");
        } else if (duration.nanoseconds > 1) {
          return "".concat(Math.round(duration.nanoseconds), "ns");
        }
      };

      function DefaultFormatter() {
        var _format = function _format(event) {
          if (event.type === TestEvent.types.START) {
            return "".concat(newLine).concat(SYMBOLS.INFO, "Running tests...");
          }

          if (event.type === TestEvent.types.END) {
            var totals = event.totals;
            return "".concat(newLine).concat(SYMBOLS.INFO, "total: ").concat(consoleStyles.cyan(totals.total)) + "  passed: ".concat(consoleStyles.green(totals.passed)) + "  failed: ".concat(consoleStyles.red(totals.failed + totals.broken)) + "  skipped: ".concat(consoleStyles.yellow(totals.skipped)) + "  duration: ".concat(formatDuration(totals.duration)).concat(newLine);
          } else if (event.type === TestEvent.types.TEST) {
            if (!event.error) {
              return "".concat(SYMBOLS[event.status]).concat(event.behavior).concat(formatInfo(event.log));
            } else if (event.error.expected && event.error.actual) {
              return "".concat(SYMBOLS[event.status]).concat(event.behavior).concat(newLine).concat(newLine) + formatExpectedAndActual(event.error) + formatStack(event.error);
            } else {
              return "".concat(SYMBOLS[event.status]).concat(event.behavior) + formatStack(event.error);
            }
          }
        };

        var format = function format(event) {
          if (event.isDeterministicOutput) {
            return event.testEvents.map(_format).concat([_format(event.endEvent)]).join('\n');
          } else {
            return _format(event);
          }
        }; // /format


        return {
          format: format,
          formatDuration: formatDuration,
          formatInfo: formatInfo,
          formatExpectedAndActual: formatExpectedAndActual,
          formatStack: formatStack
        };
      } // /Formatter


      return {
        DefaultFormatter: DefaultFormatter
      };
    }
  };
  module.exports = {
    name: 'ListFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          DefaultFormatter = dependencies.DefaultFormatter;

      function ListFormatter() {
        return DefaultFormatter({
          SYMBOLS: {
            PASSED: consoleStyles.green('✓ '),
            // heavy-check: '✔',
            FAILED: consoleStyles.red('✗ '),
            // heavy-x '✘',
            BROKEN: consoleStyles.red('!= '),
            // heavy-x '✘',
            SKIPPED: consoleStyles.yellow('⸕ '),
            INFO: consoleStyles.cyan('# ')
          }
        });
      }

      return {
        ListFormatter: ListFormatter
      };
    }
  };
  module.exports = {
    name: 'JsonFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var TestEvent = dependencies.TestEvent;

      function JsonFormatter() {
        var format = function format(event) {
          if (event.type === TestEvent.types.START) {
            return "[".concat(JSON.stringify({
              event: event
            }, null, 2), ",");
          } else if (event.type === TestEvent.types.END) {
            return "".concat(JSON.stringify({
              event: event
            }, null, 2), "]");
          } else if ([TestEvent.types.START_TEST, TestEvent.types.END_TALLY].indexOf(event.type) === -1 && !event.isDeterministicOutput) {
            return "".concat(JSON.stringify({
              event: event
            }, null, 2), ",");
          } else if (event.isDeterministicOutput) {
            var output = event.testEvents.map(function (_event) {
              return "".concat(JSON.stringify({
                event: _event
              }, null, 2));
            }).join(',\n');
            output += ",\n".concat(JSON.stringify({
              event: event.endEvent
            }, null, 2), "]");
            return output;
          }
        };

        return {
          format: format
        };
      }

      return {
        JsonFormatter: JsonFormatter
      };
    }
  };
  module.exports = {
    name: 'MarkdownFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          TestEvent = dependencies.TestEvent,
          SpecFormatter = dependencies.SpecFormatter,
          DefaultFormatter = dependencies.DefaultFormatter;
      var newLine = consoleStyles.newLine();
      var space = consoleStyles.space();

      var _ref3 = new SpecFormatter(),
          addToSpec = _ref3.addToSpec;

      var _ref4 = new DefaultFormatter(),
          formatDuration = _ref4.formatDuration;

      var toBullets = function toBullets(md, SPACE, layer) {
        if (typeof layer === 'undefined') layer = 0;
        var output = '';
        Object.keys(md).forEach(function (key) {
          var line = key.replace(/\n/g, newLine + SPACE.substring(0, (layer + 1) * 2));
          output += SPACE.substring(0, layer * 2) + "* ".concat(line).concat(newLine);

          if (md[key].type && md[key].type === TestEvent.types.TEST) {// done
          } else {
            output += toBullets(md[key], SPACE, layer + 1);
          }
        });
        return output;
      };

      var makeTotalsH2 = function makeTotalsH2(totals) {
        return "## Totals".concat(newLine) + "".concat(newLine, "- **total**: ").concat(totals.total) + "".concat(newLine, "- **passed**: ").concat(totals.passed) + "".concat(newLine, "- **failed**: ").concat(totals.failed) + "".concat(newLine, "- **skipped**: ").concat(totals.skipped) + "".concat(newLine, "- **duration**: ").concat(formatDuration(totals.duration));
      };

      var makeErrorsH2 = function makeErrorsH2(specs) {
        var found = specs.filter(function (event) {
          return event.status === TestEvent.status.FAILED || event.status === TestEvent.status.BROKEN;
        });

        if (!found.length) {
          return;
        }

        var output = "## Errors".concat(newLine);
        found.forEach(function (event) {
          if (event.error && event.error.stack) {
            output += "".concat(newLine).concat(event.behavior).concat(newLine) + '```' + "".concat(newLine).concat(event.error.stack).concat(newLine) + '```' + newLine;
          } else {
            output += "".concat(newLine).concat(event.behavior).concat(newLine);
          }
        });
        return output;
      };

      function MarkdownFormatter() {
        var title = 'Tests';

        var format = function format(event) {
          if (event.type === TestEvent.types.START) {
            title = event.suiteId;
          } else if (event.isDeterministicOutput) {
            var SPACE = _toConsumableArray(new Array(event.testEvents.length * 2)).join(space);

            var spec = {};
            event.testEvents.forEach(function (_event) {
              return addToSpec(_event.behaviors, spec, _event);
            });
            var errors = makeErrorsH2(event.testEvents);

            if (errors) {
              return "# ".concat(title).concat(newLine).concat(newLine).concat(toBullets(spec, SPACE)).concat(newLine).concat(errors).concat(newLine).concat(makeTotalsH2(event.endEvent.totals));
            } else {
              return "# ".concat(title).concat(newLine).concat(newLine).concat(toBullets(spec, SPACE)).concat(newLine).concat(makeTotalsH2(event.endEvent.totals));
            }
          }
        }; // /format


        return {
          format: format
        };
      } // /Formatter


      return {
        MarkdownFormatter: MarkdownFormatter
      };
    }
  };
  module.exports = {
    name: 'PerformanceFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          TestEvent = dependencies.TestEvent;

      function PerformanceFormatter() {
        var formatDuration = function formatDuration(duration) {
          if (!duration) {
            return 0;
          }

          if (typeof duration === 'number' && duration.seconds > 1) {
            return "".concat(Math.round(duration.seconds), "s");
          } else if (duration.milliseconds > 1) {
            return "".concat(Math.round(duration.milliseconds), "ms");
          } else if (duration.microseconds > 1) {
            return "".concat(Math.round(duration.microseconds), "\xB5s");
          } else if (duration.nanoseconds > 1) {
            return "".concat(Math.round(duration.nanoseconds), "ns");
          } else {
            return 0;
          }
        };

        var format = function format(event) {
          if (event.type === TestEvent.types.TEST && event.duration) {
            var durations = ["given: ".concat(formatDuration(event.duration.given)), "when: ".concat(formatDuration(event.duration.when)), "then: ".concat(formatDuration(event.duration.then))];
            return "".concat(consoleStyles.cyan('# '), "  duration: ").concat(formatDuration(event.duration.total), " (").concat(durations.join(', '), ")");
          }
        };

        return {
          format: format
        };
      }

      return {
        PerformanceFormatter: PerformanceFormatter
      };
    }
  };
  module.exports = {
    name: 'SpecFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          TestEvent = dependencies.TestEvent,
          DefaultFormatter = dependencies.DefaultFormatter;
      var newLine = consoleStyles.newLine();
      var space = consoleStyles.space();
      var SYMBOLS = {
        PASSED: consoleStyles.green('✓ '),
        // heavy-check: '✔',
        FAILED: consoleStyles.red('✗ '),
        // heavy-x '✘',
        BROKEN: consoleStyles.red('!= '),
        // heavy-x '✘',
        SKIPPED: consoleStyles.yellow('⸕ '),
        INFO: consoleStyles.cyan('# ')
      };

      var _DefaultFormatter = DefaultFormatter({
        SYMBOLS: SYMBOLS
      }),
          format = _DefaultFormatter.format,
          formatInfo = _DefaultFormatter.formatInfo,
          formatExpectedAndActual = _DefaultFormatter.formatExpectedAndActual,
          formatStack = _DefaultFormatter.formatStack;

      var addToSpec = function addToSpec(parts, spec, event) {
        if (!parts.length) {
          return;
        }

        var part = parts.shift();

        if (parts.length) {
          spec[part] = spec[part] || {};
          addToSpec(parts, spec[part], event);
        } else {
          spec[part] = event;
        }
      };

      var toPrint = function toPrint(spec, SPACE, layer) {
        if (typeof layer === 'undefined') layer = 0;
        var output = ''; // use getOwnPropertyNames instead of keys because the order is guarnateed back to es2015
        // (Object.keys order is guaranteed in es6 and newer)

        Object.getOwnPropertyNames(spec).forEach(function (key) {
          if (spec[key].type && spec[key].type === TestEvent.types.TEST) {
            var event = spec[key];
            var line;

            if (!event.error) {
              line = "".concat(SYMBOLS[event.status]).concat(key).concat(formatInfo(event.log));
            } else if (event.error.expected && event.error.actual) {
              line = "".concat(SYMBOLS[event.status]).concat(key).concat(newLine).concat(newLine) + formatExpectedAndActual(event.error) + formatStack(event.error);
            } else {
              line = "".concat(SYMBOLS[event.status]).concat(key) + formatStack(event.error);
            }

            output += SPACE.substring(0, layer * 2) + "".concat(line).concat(newLine);
          } else {
            var _line = key.replace(/\n/g, newLine + SPACE.substring(0, (layer + 1) * 2));

            output += SPACE.substring(0, layer * 2) + "".concat(_line).concat(newLine);
            output += toPrint(spec[key], SPACE, layer + 1);
          }
        });
        return output;
      };

      function SpecFormatter() {
        var _format = function _format(event) {
          if (event.type === TestEvent.types.START) {
            return format(event);
          } else if (event.isDeterministicOutput) {
            var SPACE = _toConsumableArray(new Array(event.testEvents.length * 2)).join(space);

            var spec = {};
            event.testEvents.forEach(function (_event) {
              return addToSpec(_event.behaviors, spec, _event);
            });
            return "".concat(toPrint(spec, SPACE)).concat(newLine).concat(format(event.endEvent));
          }
        }; // /format


        return {
          format: _format,
          addToSpec: addToSpec
        };
      }

      return {
        SpecFormatter: SpecFormatter
      };
    }
  };
  module.exports = {
    name: 'SummaryFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          DefaultFormatter = dependencies.DefaultFormatter,
          TestEvent = dependencies.TestEvent;

      function SummaryFormatter() {
        var defaultFormat = DefaultFormatter({
          // Other than INFO, these aren't actually used, since this doesn't produce TEST output
          SYMBOLS: {
            PASSED: consoleStyles.green('✓ '),
            FAILED: consoleStyles.red('✗ '),
            BROKEN: consoleStyles.red('!= '),
            SKIPPED: consoleStyles.yellow('⸕ '),
            INFO: consoleStyles.cyan('# ') // the `#` is important for TAP compliance

          }
        }).format;

        var format = function format(event) {
          if (event.isDeterministicOutput) {
            return defaultFormat(event.endEvent);
          }

          if (event.type === TestEvent.types.END) {
            return defaultFormat(event);
          }
        };

        return {
          format: format
        };
      }

      return {
        SummaryFormatter: SummaryFormatter
      };
    }
  };
  module.exports = {
    name: 'TapFormatter',
    factory: function factory(dependencies) {
      'use strict';

      var consoleStyles = dependencies.consoleStyles,
          TestEvent = dependencies.TestEvent;
      var newLine = consoleStyles.newLine();
      var whitespace = '        ';

      var reIndent = function reIndent(input, spaces, trim) {
        var indent = whitespace.substring(0, spaces);
        return input.split(newLine).map(function (line) {
          return "".concat(indent).concat(trim ? line.trim() : line);
        }).join(newLine).substring(spaces);
      };

      var formatMessage = function formatMessage(input) {
        var message = input.split(newLine).map(function (line) {
          return line.replace(/\s\s+/g, ' ').replace(/"/g, '\\"');
        }).join(' ');
        return "\"".concat(message, "\"");
      };

      var formatInfo = function formatInfo(behavior, log, severity) {
        if (typeof log === 'undefined') {
          return '';
        }

        var message = typeof log.message === 'string' ? log.message : "comment for: ".concat(behavior);
        return newLine + "  ---".concat(newLine) + "  message: \"".concat(message, "\"").concat(newLine) + "  severity: ".concat(severity).concat(newLine) + "  data:".concat(newLine) + "    ".concat(reIndent(JSON.stringify(log, null, 2), 4)).concat(newLine) + '  ...';
      };

      var formatError = function formatError(error, severity) {
        if (!error) {
          return '';
        }

        var actualAndExpectedExist = error.expected && error.actual;
        var stackExists = typeof error.stack === 'string';
        var output = "".concat(newLine, "  ---").concat(newLine) + "  message: ".concat(formatMessage(error.message)).concat(newLine) + "  severity: ".concat(severity).concat(newLine);

        if (actualAndExpectedExist && stackExists) {
          output += "  data:".concat(newLine);
          output += "    got: ".concat(error.actual).concat(newLine);
          output += "    expect: ".concat(error.expected).concat(newLine);
          output += "    stack: ".concat(reIndent(error.stack, 6, true)).concat(newLine);
        } else if (actualAndExpectedExist) {
          output += "  data:".concat(newLine);
          output += "    got: ".concat(error.actual).concat(newLine);
          output += "    expect: ".concat(error.expected).concat(newLine);
        } else if (stackExists) {
          output += "  data:".concat(newLine);
          output += "    stack: ".concat(reIndent(error.stack, 6, true)).concat(newLine);
        }

        output += '  ...';
        return output;
      };

      function TapFormatter() {
        var formatTest = function formatTest(event) {
          switch (event.status) {
            case TestEvent.status.PASSED:
              return "ok ".concat(event.count, " - ").concat(event.behavior).concat(formatInfo(event.behavior, event.log, 'comment'));

            case TestEvent.status.SKIPPED:
              return event.behavior.indexOf('# TODO') > -1 ? "ok ".concat(event.count, " # TODO ").concat(event.behavior.replace('# TODO ', '')) : "ok ".concat(event.count, " # SKIP ").concat(event.behavior);

            case TestEvent.status.FAILED:
              return "not ok ".concat(event.count, " - ").concat(event.behavior).concat(formatError(event.error, 'fail'));

            case TestEvent.status.BROKEN:
              return "not ok ".concat(event.count, " - ").concat(event.behavior).concat(formatError(event.error, 'broken'));
          }
        };

        var format = function format(event) {
          if (event.type === TestEvent.types.START) {
            return "TAP version 13\n1..".concat(event.plan.count);
          } else if (event.type === TestEvent.types.TEST) {
            return formatTest(event);
          } else if (event.isDeterministicOutput) {
            var output = event.testEvents.map(function (_event, idx) {
              return formatTest(_objectSpread({}, _event, {}, {
                count: idx + 1
              }));
            }).join('\n');
            return output;
          }
        }; // /format


        return {
          format: format
        };
      } // /Formatter


      return {
        TapFormatter: TapFormatter
      };
    }
  };
  module.exports = {
    name: 'ArrayReporter',
    factory: function factory() {
      'use strict';

      function ArrayReporter() {
        var events = [];

        var write = function write(event) {
          return events.push(event);
        };

        return {
          write: write,
          events: events
        };
      }

      return {
        ArrayReporter: ArrayReporter
      };
    }
  };
  module.exports = {
    name: 'ConsoleReporter',
    factory: function factory(dependencies) {
      'use strict';

      var TestEvent = dependencies.TestEvent,
          formatter = dependencies.formatter,
          envvars = dependencies.envvars,
          REPORT_ORDERS = dependencies.REPORT_ORDERS;
      var format = formatter.format;

      var makeOrderId = function makeOrderId(event) {
        return "".concat(event.batchId, "-").concat(event.testId);
      };

      var byTestOrder = function byTestOrder(order) {
        return function (a, b) {
          var aIdx;
          var bIdx;
          var foundCount = 0;

          for (var i = 0; i < order.length; i += 1) {
            if (order[i] === makeOrderId(a)) {
              aIdx = i;
              foundCount += 1;
            } else if (order[i] === makeOrderId(b)) {
              bIdx = i;
              foundCount += 1;
            }

            if (foundCount === 2) {
              break;
            }
          }

          if (aIdx < bIdx) {
            return -1;
          }

          if (aIdx > bIdx) {
            return 1;
          } // a must be equal to b


          return 0;
        };
      };

      function ConsoleReporter(options) {
        options = _objectSpread({}, {
          reportOrder: REPORT_ORDERS.NON_DETERMINISTIC
        }, {}, envvars, {}, options);
        var testOrder = [];
        var testEvents = [];

        var writeOne = function writeOne(event) {
          var line = format(event);

          if (line) {
            console.log(line);
          }
        };

        var write = function write(event) {
          if (event.type === TestEvent.types.START) {
            writeOne(event);
          } else if (event.type === TestEvent.types.END) {
            if (options.reportOrder === REPORT_ORDERS.NON_DETERMINISTIC) {
              writeOne(event);
            } else {
              testOrder.push(makeOrderId(event));
              writeOne({
                isDeterministicOutput: true,
                testEvents: testEvents.sort(byTestOrder(testOrder)),
                endEvent: event
              });
            }
          } else if (event.type === TestEvent.types.START_TEST) {
            if (options.reportOrder === REPORT_ORDERS.NON_DETERMINISTIC) {
              writeOne(event);
            } else {
              testOrder.push(makeOrderId(event));
              writeOne(event);
            }
          } else if (event.type === TestEvent.types.TEST) {
            if (options.reportOrder === REPORT_ORDERS.NON_DETERMINISTIC) {
              writeOne(event);
            } else {
              testEvents.push(event);
            }
          }
        }; // /write


        return {
          write: write
        };
      }

      return {
        ConsoleReporter: ConsoleReporter
      };
    }
  };
  module.exports = {
    name: 'DomReporter',
    factory: function factory(dependencies) {
      'use strict';

      var TestEvent = dependencies.TestEvent,
          formatter = dependencies.formatter,
          envvars = dependencies.envvars,
          REPORT_ORDERS = dependencies.REPORT_ORDERS;
      var format = formatter.format;
      var reportDivId = 'supposed_report';
      var reportPreId = 'supposed_report_results';
      var reportDiv;
      var reportPre;

      var makeOrderId = function makeOrderId(event) {
        return "".concat(event.batchId, "-").concat(event.testId);
      };

      var byTestOrder = function byTestOrder(order) {
        return function (a, b) {
          var aIdx;
          var bIdx;
          var foundCount = 0;

          for (var i = 0; i < order.length; i += 1) {
            if (order[i] === makeOrderId(a)) {
              aIdx = i;
              foundCount += 1;
            } else if (order[i] === makeOrderId(b)) {
              bIdx = i;
              foundCount += 1;
            }

            if (foundCount === 2) {
              break;
            }
          }

          if (aIdx < bIdx) {
            return -1;
          }

          if (aIdx > bIdx) {
            return 1;
          } // a must be equal to b


          return 0;
        };
      };

      var initDom = function initDom() {
        var _reportDiv = document.getElementById(reportDivId);

        if (_reportDiv) {
          reportDiv = _reportDiv;
          reportPre = document.getElementById(reportPreId);
          return;
        }

        reportDiv = document.createElement('div');
        reportDiv.setAttribute('id', reportDivId);
        document.body.appendChild(reportDiv);
        reportPre = document.createElement('pre');
        reportPre.setAttribute('id', reportPreId);
        reportDiv.appendChild(reportPre);
      };

      var scrollToBottom = function scrollToBottom() {
        if (typeof window !== 'undefined' && typeof window.scrollTo === 'function' && typeof document !== 'undefined' && document.body) {
          window.scrollTo(0, document.body.scrollHeight);
        }
      };

      function DomReporter(options) {
        options = _objectSpread({}, {
          reportOrder: REPORT_ORDERS.NON_DETERMINISTIC
        }, {}, envvars, {}, options);
        var testOrder = [];
        var testEvents = [];
        initDom();

        var writeOne = function writeOne(event) {
          var line = format(event);

          if (!line) {
            return;
          }

          console.log(line);
          reportPre.append("".concat(line, "\n"));
          scrollToBottom();
        };

        var write = function write(event) {
          if (event.type === TestEvent.types.START) {
            writeOne(event);
          } else if (event.type === TestEvent.types.END) {
            if (options.reportOrder === REPORT_ORDERS.NON_DETERMINISTIC) {
              writeOne(event);
            } else {
              testOrder.push(makeOrderId(event));
              writeOne({
                isDeterministicOutput: true,
                testEvents: testEvents.sort(byTestOrder(testOrder)),
                endEvent: event
              });
            }
          } else if (event.type === TestEvent.types.START_TEST) {
            if (options.reportOrder === REPORT_ORDERS.NON_DETERMINISTIC) {
              writeOne(event);
            } else {
              testOrder.push(makeOrderId(event));
              writeOne(event);
            }
          } else if (event.type === TestEvent.types.TEST) {
            if (options.reportOrder === REPORT_ORDERS.NON_DETERMINISTIC) {
              writeOne(event);
            } else {
              testEvents.push(event);
            }
          }
        }; // /write


        return {
          write: write
        };
      }

      return {
        DomReporter: DomReporter
      };
    }
  };
  module.exports = {
    name: 'NoopReporter',
    factory: function factory() {
      'use strict';

      function NoopReporter() {
        return {
          write: function write() {}
        };
      }

      return {
        NoopReporter: NoopReporter
      };
    }
  };
  module.exports = {
    name: 'reporterFactory',
    factory: function factory() {
      'use strict';

      function ReporterFactory() {
        var self = {};
        var map = {};

        var uppered = function uppered(name) {
          return typeof name === 'string' ? name.trim().toUpperCase() : undefined;
        };

        self.get = function (name) {
          var _name = uppered(name);

          if (!map[_name]) {
            throw new Error("A reporter by name, \"".concat(name, "\", is not registered"));
          }

          var reporter = map[_name];
          reporter.name = reporter.name || _name;
          return reporter;
        };

        self.add = function (reporter) {
          if (typeof reporter !== 'function') {
            throw new Error("Invalid Reporter: expected reporter {".concat(_typeof(reporter), "} to be a {function}"));
          }

          var errors = [];

          if (typeof reporter.name !== 'string' || reporter.name.trim().length < 1) {
            errors.push("Invalid Reporter: expected reporter.name {".concat(_typeof(reporter.name), "} to be a non-empty {string}"));
          }

          var _reporter = reporter();

          var write = _reporter && _reporter.write;

          if (typeof write !== 'function') {
            errors.push("Invalid Reporter: expected reporter().write {".concat(_typeof(write), "} to be a {function}"));
          }

          if (errors.length) {
            throw new Error(errors.join(', '));
          }

          var name = uppered(reporter.name);
          map[name] = _reporter;

          if (name.indexOf('REPORTER') > -1) {
            var shortName = name.substring(0, name.indexOf('REPORTER'));
            map[shortName] = _reporter;
          }

          return self;
        };

        return self;
      }

      return {
        ReporterFactory: ReporterFactory
      };
    }
  };
  module.exports = {
    name: 'Tally',
    factory: function factory(dependencies) {
      'use strict';

      var publish = dependencies.publish,
          TestEvent = dependencies.TestEvent,
          clock = dependencies.clock,
          duration = dependencies.duration;

      function TallyFactory() {
        var now = function now() {
          return clock();
        };

        var makeTally = function makeTally() {
          return {
            total: 0,
            passed: 0,
            skipped: 0,
            failed: 0,
            broken: 0,
            startTime: -1,
            endTime: -1,
            duration: undefined
          };
        }; // there's only 1 tally per require


        var totals = {
          total: 0,
          passed: 0,
          skipped: 0,
          failed: 0,
          broken: 0,
          startTime: -1,
          endTime: -1,
          duration: undefined,
          results: [],
          batches: {}
        };

        var makeBatchTally = function makeBatchTally(event) {
          if (totals.batches[event.batchId]) {
            return publish({
              type: TestEvent.types.TEST,
              status: TestEvent.status.BROKEN,
              batchId: event.batchId,
              error: new Error('Duplicate Batch Ids were created, or multiple START_BATCH events were emitted for the same batch')
            }).then(function () {
              return undefined;
            });
          }

          var tally = makeTally();
          tally.startTime = now();
          return Promise.resolve(tally);
        };

        var bump = function bump(event) {
          try {
            var name = event.status.toLowerCase();
            totals[name] += 1;
            totals.total += 1;

            if (totals.batches[event.batchId]) {
              totals.batches[event.batchId][name] += 1;
              totals.batches[event.batchId].total += 1;
            }

            totals.results.push(event);
          } catch (e) {
            console.log(event);
            console.log(e);
          }
        };

        function Tally() {
          var write = function write(event) {
            switch (event.type) {
              case TestEvent.types.START:
                totals.startTime = now();
                return Promise.resolve();

              case TestEvent.types.START_BATCH:
                return makeBatchTally(event).then(function (tally) {
                  if (tally) {
                    totals.batches[event.batchId] = tally;
                  }
                });

              case TestEvent.types.TEST:
                bump(event);
                return Promise.resolve();

              case TestEvent.types.END_BATCH:
                totals.batches[event.batchId].endTime = now();
                totals.batches[event.batchId].duration = duration(totals.batches[event.batchId].startTime, totals.batches[event.batchId].endTime);
                return Promise.resolve();

              case TestEvent.types.END_TALLY:
                totals.endTime = now();
                totals.duration = duration(totals.startTime, totals.endTime);
                return Promise.resolve();
            } // /switch

          }; // /write


          return {
            name: 'Tally',
            write: write
          };
        } // /Tally


        Tally.getTally = function () {
          return _objectSpread({}, totals);
        };

        Tally.getSimpleTally = function () {
          var tally = Tally.getTally();
          return {
            total: tally.total,
            passed: tally.passed,
            skipped: tally.skipped,
            failed: tally.failed,
            broken: tally.broken,
            startTime: tally.startTime,
            endTime: tally.endTime,
            duration: tally.duration
          };
        };

        return {
          Tally: Tally
        };
      } // /TallyFactory


      return {
        TallyFactory: TallyFactory
      };
    }
  }; // resolve the dependency graph

  function isPromise(input) {
    return input && typeof input.then === 'function';
  }

  var REPORT_ORDERS = {
    NON_DETERMINISTIC: 'non-deterministic',
    DETERMINISTIC: 'deterministic'
  };
  var time = module.factories.timeFactory();
  var suites = {};
  var supposed = null; // resolve the dependency graph

  function Supposed(options) {
    var _module$factories$all = module.factories.allSettledFactory({}),
        allSettled = _module$factories$all.allSettled;

    var _module$factories$mak = module.factories.makePlansFactory({
      allSettled: allSettled
    }),
        makePlans = _module$factories$mak.makePlans;

    var envvars = {
      assertionLibrary: {},
      reporters: ['LIST'],
      useColors: true,
      timeUnits: 'us',
      reportOrder: REPORT_ORDERS.NON_DETERMINISTIC
    };

    var clock = function clock() {
      return time.clock(envvars.timeUnits);
    };

    var duration = function duration(start, end) {
      return time.duration(start, end, envvars.timeUnits);
    };

    var _module$factories$Tes = module.factories.TestEventFactory({
      clock: clock
    }),
        TestEvent = _module$factories$Tes.TestEvent;

    var _module$factories$pub = module.factories.pubsubFactory({
      allSettled: allSettled,
      isPromise: isPromise,
      TestEvent: TestEvent
    }),
        Pubsub = _module$factories$pub.Pubsub;

    var _ref5 = new Pubsub(),
        publish = _ref5.publish,
        subscribe = _ref5.subscribe,
        subscriptionExists = _ref5.subscriptionExists,
        allSubscriptions = _ref5.allSubscriptions,
        reset = _ref5.reset;

    var consoleStyles = module.factories.consoleStylesFactory({
      envvars: envvars
    }).consoleStyles;

    var _module$factories$Tal = module.factories.TallyFactory({
      publish: publish,
      TestEvent: TestEvent,
      clock: clock,
      duration: duration
    }),
        TallyFactory = _module$factories$Tal.TallyFactory;

    var _TallyFactory = TallyFactory({}),
        Tally = _TallyFactory.Tally;

    var _module$factories$rep = module.factories.reporterFactoryFactory({}),
        ReporterFactory = _module$factories$rep.ReporterFactory;

    var reporterFactory = new ReporterFactory();
    var ArrayReporter = module.factories.ArrayReporterFactory({}).ArrayReporter;
    reporterFactory.add(ArrayReporter);
    reporterFactory.add(function QuietReporter() {
      // legacy
      return {
        write: new ArrayReporter().write
      };
    });
    reporterFactory.add(module.factories.NoopReporterFactory({}).NoopReporter);
    reporterFactory.add(Tally);

    function DefaultFormatter(options) {
      return module.factories.DefaultFormatterFactory({
        consoleStyles: consoleStyles,
        TestEvent: TestEvent,
        SYMBOLS: options && options.SYMBOLS || {
          PASSED: ' PASS ',
          FAILED: ' FAIL ',
          BROKEN: ' !!!! ',
          SKIPPED: ' SKIP ',
          INFO: ' INFO '
        }
      }).DefaultFormatter();
    }

    function ConsoleReporter(options) {
      return module.factories.DomReporterFactory({
        TestEvent: TestEvent,
        formatter: options.formatter,
        envvars: envvars,
        REPORT_ORDERS: REPORT_ORDERS
      }).DomReporter(options);
    }

    var listFormatter = module.factories.ListFormatterFactory({
      consoleStyles: consoleStyles,
      DefaultFormatter: DefaultFormatter
    }).ListFormatter();
    var SpecFormatter = module.factories.SpecFormatterFactory({
      consoleStyles: consoleStyles,
      DefaultFormatter: DefaultFormatter,
      TestEvent: TestEvent
    }).SpecFormatter;
    reporterFactory.add(function ListReporter() {
      return {
        write: ConsoleReporter({
          formatter: listFormatter
        }).write
      };
    }).add(function BlockReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.BlockFormatterFactory({
            consoleStyles: consoleStyles,
            DefaultFormatter: DefaultFormatter
          }).BlockFormatter()
        }).write
      };
    }).add(function BriefReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.BriefFormatterFactory({
            consoleStyles: consoleStyles,
            DefaultFormatter: DefaultFormatter,
            TestEvent: TestEvent
          }).BriefFormatter()
        }).write
      };
    }).add(function JsonReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.JsonFormatterFactory({
            TestEvent: TestEvent
          }).JsonFormatter()
        }).write
      };
    }).add(function MarkdownReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.MarkdownFormatterFactory({
            consoleStyles: consoleStyles,
            TestEvent: TestEvent,
            SpecFormatter: SpecFormatter,
            DefaultFormatter: DefaultFormatter
          }).MarkdownFormatter(),
          reportOrder: REPORT_ORDERS.DETERMINISTIC // non-deterministic not supported

        }).write
      };
    }).add(function MdReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.MarkdownFormatterFactory({
            consoleStyles: consoleStyles,
            TestEvent: TestEvent,
            SpecFormatter: SpecFormatter,
            DefaultFormatter: DefaultFormatter
          }).MarkdownFormatter(),
          reportOrder: REPORT_ORDERS.DETERMINISTIC // non-deterministic not supported

        }).write
      };
    }).add(function PerformanceReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.PerformanceFormatterFactory({
            consoleStyles: consoleStyles,
            TestEvent: TestEvent
          }).PerformanceFormatter()
        }).write
      };
    }).add(function JustTheDescriptionsReporter() {
      return {
        write: ConsoleReporter({
          formatter: {
            format: function format(event) {
              if (event.type === TestEvent.types.TEST) {
                return listFormatter.format(event).split('\n')[0];
              } else {
                return listFormatter.format(event);
              }
            }
          }
        }).write
      };
    }).add(function SpecReporter() {
      return {
        write: ConsoleReporter({
          formatter: SpecFormatter(),
          reportOrder: REPORT_ORDERS.DETERMINISTIC // non-deterministic not supported

        }).write
      };
    }).add(function SummaryReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.SummaryFormatterFactory({
            consoleStyles: consoleStyles,
            DefaultFormatter: DefaultFormatter,
            TestEvent: TestEvent
          }).SummaryFormatter()
        }).write
      };
    }).add(function TapReporter() {
      return {
        write: ConsoleReporter({
          formatter: module.factories.TapFormatterFactory({
            consoleStyles: consoleStyles,
            TestEvent: TestEvent
          }).TapFormatter()
        }).write
      };
    });

    var _module$factories$Asy = module.factories.AsyncTestFactory({
      isPromise: isPromise,
      publish: publish,
      TestEvent: TestEvent,
      clock: clock,
      duration: duration,
      addDurations: time.addDurations
    }),
        AsyncTest = _module$factories$Asy.AsyncTest;

    var _module$factories$has = module.factories.hashFactory(),
        hash = _module$factories$has.hash;

    var _module$factories$mak2 = module.factories.makeBatchFactory({
      hash: hash
    }),
        BatchComposer = _module$factories$mak2.BatchComposer;

    var _module$factories$mak3 = module.factories.makeSuiteConfigFactory({
      defaults: envvars,
      subscriptionExists: subscriptionExists,
      subscribe: subscribe,
      allSubscriptions: allSubscriptions,
      reporterFactory: reporterFactory
    }),
        makeSuiteConfig = _module$factories$mak3.makeSuiteConfig;

    var _module$factories$Sui = module.factories.SuiteFactory({
      allSettled: allSettled,
      AsyncTest: AsyncTest,
      BatchComposer: BatchComposer,
      makeSuiteConfig: makeSuiteConfig,
      publish: publish,
      subscribe: subscribe,
      clearSubscriptions: reset,
      reporterFactory: reporterFactory,
      makePlans: makePlans,
      Tally: Tally,
      TestEvent: TestEvent
    }),
        Suite = _module$factories$Sui.Suite;

    var suite = new Suite(options);
    suite.Suite = Supposed;

    if (!suites[suite.config.name]) {
      suites[suite.config.name] = suite;
    }

    return suite;
  }

  supposed = Supposed({
    name: 'supposed'
  });
  suites.supposed = supposed;
  supposed.suites = suites;
  supposed.time = time;
  window.supposed = supposed;
})(window);