module.exports = function (suite) {
  const { describe } = suite.dependencies
  const sut = describe.Suite({ reporter: 'QUIET', match: null })

  return describe('given different styles', {
    AAA: {
      'when arrange, act, and assert(s) exist': {
        act: whenGivenWhenAndThen('arrange', 'act'),
        'given should produce to when, which should produce to the assertions': itShouldPass
      },
      'when arrange, and assert(s) exist without act': {
        act: whenGivenThenAndNoWhen('arrange', 'act'),
        '`arrange` should be swapped out for `act`': itShouldPass
      }
    },
    BDD: {
      'when given, when, and then(s) exist': {
        when: whenGivenWhenAndThen('given', 'when'),
        'given should produce to when, which should produce to the assertions': itShouldPass
      },
      'when given, and then(s) exist without when': {
        when: whenGivenThenAndNoWhen('given', 'when'),
        '`given` should be swapped out for `when`': itShouldPass
      }
    },
    vows: {
      'when topics are used for `when/act`': {
        topic: () => { return 42 },
        'it should execute the topic': (t) => (err, actual) => {
          t.ifError(err)
          t.strictEqual(actual, 42)
        }
      }
    }
  })

  function itShouldPass (t, err, actual) {
    t.ifError(err)
    t.strictEqual(actual.totals.passed, 1)
  }

  function whenGivenWhenAndThen (given, when) {
    return () => {
      var test = {
        'sut-description': {
          'sut-assertion': (t) => (err, actual) => {
            t.ifError(err)
            t.strictEqual(actual, 42)
          }
        }
      }

      test['sut-description'][given] = () => {
        return new Promise((resolve) => {
          setTimeout(() => { resolve(42) }, 0)
        })
      }

      test['sut-description'][when] = (given) => {
        return new Promise((resolve) => {
          setTimeout(() => { resolve(given) }, 0)
        })
      }

      return sut('supposed', test)
    }
  }

  function whenGivenThenAndNoWhen (given, when) {
    return () => {
      var givenRan = false
      var test = {
        'sut-description': {
          'sut-assertion': (t) => (err, actual) => {
            t.ifError(err)
            t.strictEqual(actual, 42)
            t.strictEqual(givenRan, true)
          }
        }
      }

      test['sut-description'][given] = () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            givenRan = true
            resolve(42)
          }, 0)
        })
      }

      return sut('supposed', test)
    }
  }
}
