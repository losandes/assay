module.exports = {
  name: 'Suite',
  factory: (dependencies) => {
    'use strict'

    const {
      allSettled,
      AsyncTest,
      findFiles,
      BatchComposer,
      makeSuiteConfig,
      publish,
      subscribe,
      clearSubscriptions,
      reporterFactory,
      resolveTests,
      runServer,
      makePlans,
      Tally,
      TestEvent
    } = dependencies

    const makeBatchId = () => `B${(Math.random() * 0xFFFFFF << 0).toString(16).toUpperCase()}`

    const makeNormalBatch = (description, assertions) => {
      const batch = {}
      batch[description] = assertions

      return batch
    }

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
    const normalizeBatch = (description, assertions) => {
      const descriptionType = typeof description
      const assertionsType = typeof assertions

      if (descriptionType === 'string' && assertionsType === 'function') {
        // description, IAssert
        return Promise.resolve(makeNormalBatch(description, { '': assertions }))
      } else if (descriptionType === 'string') {
        // description, IBDD|IAAA|IVow
        return Promise.resolve(makeNormalBatch(description, assertions))
      } else if (descriptionType === 'object') {
        // description is IBDD|IAAA|IVow
        return Promise.resolve(description)
      } else if (descriptionType === 'function') {
        // description is IAssert
        return Promise.resolve({ '': description })
      } else {
        return Promise.reject(new Error('An invalid test was found: a test or batch of tests is required'))
      }
    } // /normalizebatch

    /**
     * If `match` is present in the config, this will test the assertions in
     * a batch to identity whether or not they match
     * @curried
     * @param config {object} - the Suite options
     * @param theory {object} - one result of makeBatch (`mapper`) (a batch is an array of theories)
     */
    const matcher = (config) => (theory) => {
      if (!config.match) {
        return true
      }

      for (let i = 0; i < theory.assertions.length; i += 1) {
        if (config.match.test(theory.assertions[i].behavior)) {
          return true
        }
      }
    }

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
    const mapper = (config, makeBatch, byMatcher) => (batch) => {
      const theories = makeBatch(batch)
        .filter(byMatcher)

      return {
        batchId: theories.length ? theories[0].id : makeBatchId(),
        theories
      }
    }

    const planner = (config, mapToBatch) => {
      const plan = {
        count: 0,
        completed: 0,
        batches: []
      }

      const addToPlan = (description, assertions) => {
        return normalizeBatch(description, assertions)
          .then(mapToBatch)
          .then((context) => {
            if (context.theories.length) {
              plan.batches.push(context)
              plan.count += context.theories.reduce((count, item) => count + item.assertions.length, 0)
            }

            return plan
          })
      }

      addToPlan.getPlan = () => plan

      return addToPlan
    }

    const brokenTestPublisher = (suiteId) => (error) => publish({
      type: TestEvent.types.TEST,
      status: TestEvent.status.BROKEN,
      behavior: `Failed to load test: ${error.filePath}`,
      suiteId,
      error
    })

    /**
     * Merges the values of allSettled results into a single array of values.
     * > NOTE this does not deal with undefined values
     * @param prop - the name of the property to merge (value, or reason)
     */
    const toOneArray = (prop) => (output, current) => {
      return Array.isArray(current[prop])
        ? output.concat(current[prop])
        : output.concat([current[prop]])
    }

    const fullfilledToOneArray = toOneArray('value')
    const failedToOneArray = toOneArray('reason')

    const batchRunner = (config, publishOneBrokenTest) => (batch, plan) => {
      return publish({
        type: TestEvent.types.START_BATCH,
        batchId: batch.batchId,
        suiteId: config.name,
        plan
      }).then(() => {
        // map the batch theories to tests
        return batch.theories.map((theory) => new AsyncTest(
          theory,
          config.makeTheoryConfig(theory),
          batch.batchId,
          config.name
        ))
      }).then((tests) => allSettled(tests.map((test) => test())))
        .then((results) => {
          return {
            results: results
              .filter((result) => result.status === 'fullfilled')
              .reduce(fullfilledToOneArray, []),
            broken: results
              .filter((result) => result.status !== 'fullfilled')
              .reduce(failedToOneArray, []),
            batchTotals: Tally.getTally().batches[batch.batchId]
          }
        }).then((context) => {
          const publishEndBatch = () => publish({
            type: TestEvent.types.END_BATCH,
            batchId: batch.batchId,
            suiteId: config.name,
            totals: context.batchTotals
          })

          if (Array.isArray(context.broken) && context.broken.length) {
            // these tests failed during the planning stage
            return allSettled(context.broken.map(publishOneBrokenTest))
              .then(publishEndBatch)
              .then(() => context)
          } else {
            return publishEndBatch().then(() => context)
          }
        }).then((context) => {
          return {
            batchId: batch.batchId,
            results: context.results,
            broken: context.broken,
            totals: context.batchTotals
          }
        })
    } // /batchRunner

    const tester = (config, runBatch, runnerMode) => (plan) => {
      return Promise.resolve({ plan })
        .then((context) => {
          if (!runnerMode) {
            return publish({
              type: TestEvent.types.START,
              suiteId: config.name,
              plan: { count: context.plan.count, completed: 0 }
            }).then(() => context)
          }

          return Promise.resolve(context)
        }).then((context) => Promise.all(context.plan.batches.map(
          (batch) => runBatch(batch, context.plan)
        ))).then((context) => {
          if (!runnerMode) {
            return publish({ type: TestEvent.types.END_TALLY, suiteId: config.name })
              .then(() => publish({
                type: TestEvent.types.END,
                suiteId: config.name,
                totals: Tally.getSimpleTally()
              }))
              .then(() => context)
          }

          return Promise.resolve(context)
        }).then((context) => {
          if (Array.isArray(context) && context.length === 1) {
            return context[0]
          }

          return context
        }).catch((e) => {
          publish({
            type: TestEvent.types.TEST,
            status: TestEvent.status.BROKEN,
            behavior: 'Failed to load test',
            suiteId: config.name,
            error: e
          })
          throw e
        })
    }

    const runner = (config, suite, publishOneBrokenTest, execute) => (planContext) => {
      const { plan, files, broken } = planContext

      return publish({
        type: TestEvent.types.START,
        suiteId: config.name,
        plan: { count: plan.count, completed: 0 }
      }).then(() => {
        if (broken && broken.length) {
          // these tests failed during the planning stage
          return allSettled(broken.map(publishOneBrokenTest))
        }
      }).then(() => execute(plan))
        .then((output) =>
          publish({ type: TestEvent.types.END_TALLY, suiteId: config.name })
            .then(() => output) // pass through
        )
        .then((output) =>
          publish({
            type: TestEvent.types.FINAL_TALLY,
            suiteId: config.name,
            totals: Tally.getTally()
          }).then(() => output) // pass through
        )
        .then((output) => {
          // only get the tally _after_ END_TALLY was emitted
          return { output, tally: Tally.getSimpleTally() }
        }).then((context) =>
          publish({
            type: TestEvent.types.END,
            suiteId: config.name,
            totals: context.tally
          }).then(() => context) // pass through
        ).then(({ output, tally }) => {
          return {
            files: files,
            results: output.results,
            broken,
            config: planContext.config,
            suite,
            totals: tally
          }
        })
    }

    const browserRunner = (config, test) => (options) => () => {
      return Array.isArray(options.paths)
        ? runServer(test, options)(options)
        : findFiles(options).then(runServer(test, options))
    }

    /**
     * The test library
     * @param {Object} suiteConfig : optional configuration
    */
    function Suite (suiteConfig, envvars) {
      let runnerMode = false
      suiteConfig = { ...suiteConfig }

      /**
       * @param suiteDotConfigureOptions - configuration provided in line with `supposed.Suite().configure(suiteDotConfigureOptions)`
       */
      const configure = (suiteDotConfigureOptions) => {
        suiteDotConfigureOptions = { ...suiteDotConfigureOptions }

        const _suiteConfig = Object.keys(suiteConfig)
          .concat(Object.keys(suiteDotConfigureOptions))
          .reduce((cfg, key) => {
            cfg[key] = typeof suiteDotConfigureOptions[key] !== 'undefined' ? suiteDotConfigureOptions[key] : suiteConfig[key]
            return cfg
          }, {})

        clearSubscriptions()
        subscribe(reporterFactory.get(Tally.name))
        const config = makeSuiteConfig(_suiteConfig)
        const publishOneBrokenTest = brokenTestPublisher(config.name)
        const { makeBatch } = new BatchComposer(config)
        const byMatcher = matcher(config)
        const mapToBatch = mapper(config, makeBatch, byMatcher)
        const runBatch = batchRunner(config, publishOneBrokenTest)
        const plan = planner(config, mapToBatch)
        const test = (description, assertions) => {
          if (runnerMode) {
            return plan(description, assertions)
          } else {
            return plan(description, assertions)
              .then(tester(config, runBatch, runnerMode))
          }
        }

        test.id = config.name
        test.plan = plan
        test.reporters = config.reporters
        test.config = config
        test.dependencies = _suiteConfig && _suiteConfig.inject
        test.configure = configure
        test.subscribe = (subscription) => {
          subscribe(subscription)
          return test
        }

        test.runner = (options) => {
          options = options || {}
          if (envvars && envvars.file && typeof envvars.file.test === 'function') {
            options.matchesNamingConvention = envvars.file
          }

          const findAndStart = browserRunner(config, test)
          const addPlanToContext = () => (context) => {
            context.plan = plan.getPlan()
            return context
          }

          const findAndPlan = () => {
            runnerMode = true

            return findFiles(options)
              .then(resolveTests())
              .then(makePlans(test))
              .then(addPlanToContext())
          }

          return {
            plan: findAndPlan,
            // find and run (node)
            run: () => findAndPlan()
              .then(runner(
                config,
                test,
                publishOneBrokenTest,
                tester(config, runBatch, runnerMode)
              )),
            // run (browser|node)
            runTests: (tests) => {
              if (Array.isArray(tests)) {
                options.tests = tests
              }

              runnerMode = true

              return makePlans(test)(options)
                .then(addPlanToContext())
                .then(runner(
                  config,
                  test,
                  publishOneBrokenTest,
                  tester(config, runBatch, runnerMode)
                ))
            },
            // start test server (browser)
            startServer: findAndStart(options)
          }
        }

        // @deprecated - may go away in the future
        test.printSummary = () => {
          return publish({
            type: TestEvent.types.END,
            suiteId: config.name,
            totals: Tally.getSimpleTally()
          })
        }
        // @deprecated - may go away in the future
        test.getTotals = () => {
          return Tally.getSimpleTally()
        }

        return test
      }

      return configure()
    }

    // Suite.suites = []
    return { Suite }
  } // /factory
} // /module
