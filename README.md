# CppUTest Test Adapter for Visual Studio Code

This is the implementation for a [CppUTest](https://cpputest.github.io/) Test Adapter for VSCode.

## Setup

T.B.D.

## Getting ready to publish

This is kept here as long as I am working on it.

* search for all occurrences of the word "example" in this project and replace them with the name of the testing framework that your Test Adapter supports
* update `package.json` with your preferred values (at a minimum you should change `author`, `publisher`, `homepage`, `repository` and `bugs`)
* create an icon for your Test Adapter (there's an SVG version of the Test Explorer icon at `img/test-explorer.svg`) and reference it in `package.json`
* replace this README with your documentation

Now you're ready to [publish](https://code.visualstudio.com/docs/extensions/publish-extension) the first version of your Test Adapter.

## Completing the implementation

* implement the `debug()` method
* implement the `cancel()` method (it should kill the child process that was started by `run()` or `debug()`)
* watch the configuration for any changes that may affect the loading of test definitions and reload the test definitions if necessary
* watch the workspace for any changes to the test files and reload the test definitions if necessary
* watch the configuration for any changes that may affect the results of running the tests and emit an `autorun` event if necessary
* watch the workspace for any changes to the source files and emit an `autorun` event if necessary
* ensure that only one test run is active at a time
