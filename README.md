# CppUTest Test Adapter for Visual Studio Code

This is the implementation for a [CppUTest](https://cpputest.github.io/) Test Adapter for VSCode. Check it out on the VSCode Market Place: [CppUTest Adapter](https://marketplace.visualstudio.com/items?itemName=bneumann.cpputest-test-adapter)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B836FAL)

![tests](img/tests.png)

## Setup

To let this plugin know where your tests are set the ```cpputestExplorer.testExecutable``` to the executable of your tests. They will be executed in the ```cpputestExplorer.testExecutablePath``` path. This is currently a manual step.

If you want to use the debugging functions you will also need to setup a launch.json file with your debugger path and arguments etc. The adapter will take care of the rest. Hopefully.

### Quirks & Known issues
- Only 1 executable is supported right now
- I am a developer and I write bugs. So there must be plenty in here!

