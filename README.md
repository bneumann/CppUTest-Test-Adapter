# CppUTest Test Adapter for Visual Studio Code

This is the implementation for a [CppUTest](https://cpputest.github.io/) Test Adapter for VSCode.

![tests](img/tests.png)

## Setup

To let this plugin know where your tests are set the ```cpputestExplorer.testExecutable``` to the executable of your tests. They will be executed in the ```cpputestExplorer.testExecutablePath``` path. This is currently a manual step.

### Quirks & Known issues
- Only 1 executable is supported right now
- Updating the tests after rebuild sometimes takes a bit longer (never more that 5 seconds)
- CppUTest does not let me change the output path of the JUnit file which I use to generate results (line numbers, etc.). Therefore they polute the executable directory
- Somehow line number and file information are not propagated to the Test Explorer. I am on it.
- I am a developer and I write bugs. So there must be plenty in here!

## Getting ready to publish

Now you're ready to [publish](https://code.visualstudio.com/docs/extensions/publish-extension) the first version of your Test Adapter.
