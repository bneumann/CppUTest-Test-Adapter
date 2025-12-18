# CppUTest Test Adapter for Visual Studio Code

[![Tests](https://github.com/bneumann/CppUTest-Test-Adapter/actions/workflows/unit_tests.yml/badge.svg?branch=master)](https://github.com/bneumann/CppUTest-Test-Adapter/actions/workflows/unit_tests.yml)
[![Ko-fi](https://github.com/bneumann/CppUTest-Test-Adapter/raw/master/img/kofi.png)](https://ko-fi.com/B0B836FAL)

A Visual Studio Code extension that integrates the [CppUTest](https://cpputest.github.io/) C/C++ unit testing framework into VS Code's Test Explorer. Run, debug, and manage your CppUTest tests seamlessly within your development environment.

---

## Features
- **Run and debug** CppUTest tests directly from VS Code.
- **Supports multiple test executables** and wildcards for flexible test discovery.
- **Pre-launch tasks** to build tests before execution.
- **Logging support** for debugging and troubleshooting.

---

## Setup

### 1. Configure Test Executables
Add the following to your VS Code `settings.json` to specify your test executables:

```json
{
  "cpputestTestAdapter.testExecutable": "${workspaceFolder}/test/testrunner;${workspaceFolder}/test/subFolder/ut_*",
  "cpputestTestAdapter.testExecutablePath": "\${workspaceFolder}/test"
}
```

- ```testExecutable```: Path(s) to your test executables. Supports wildcards (*) and semicolon-separated lists.
- ```testExecutablePath```: Working directory for running tests. If not set, each executable runs from its own directory.

Both settings support the ```${workspaceFolder}``` variable. 

## Pre-Launch Task (Optional)

To rebuild your tests before running, define a task in tasks.json and reference it:
```json
{
  "cpputestTestAdapter.preLaunchTask": "build-tests"
}
```
## Logging
Enable logging for debugging:

```json
{
  "cpputestTestAdapter.logpanel": true,
  "cpputestTestAdapter.logfile": "C:/temp/cpputest-adapter.log"
}
```
- logpanel: Shows logs in VS Code's Output panel ("CppUTest Test Adapter Log").
- logfile: Saves logs to a file. Use absolute paths and ensure the directory exists.

## Debugging
To debug your tests, configure your launch.json like you would with any debugger (in this case gdb):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CppUTest",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/test/testrunner",
      "args": [],
      "stopAtEntry": false,
      "cwd": "${workspaceFolder}",
      "environment": [],
      "externalConsole": false,
      "MIMode": "gdb",
      "miDebuggerPath": "/path/to/gdb"
    }
  ]
}
```
- The adapter automatically attaches to the test process.

## Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.
