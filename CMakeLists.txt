cmake_minimum_required(VERSION 3.10)

project(testrunner)

# CppUTest
include(FetchContent)
FetchContent_Declare(
    CppUTest
    GIT_REPOSITORY https://github.com/cpputest/cpputest.git
    GIT_TAG        latest-passing-build # or use release tag, eg. v3.8
)
# Set this to ON if you want to have the CppUTests in your project as well.
set(TESTS OFF CACHE BOOL "Switch off CppUTest Test build")
FetchContent_MakeAvailable(CppUTest)

add_executable(testrunner test/basicTests.cpp)
add_dependencies(testrunner CppUTest)
target_link_libraries(testrunner PRIVATE  CppUTest)
set_target_properties(testrunner PROPERTIES
RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_SOURCE_DIR}/bin
RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_SOURCE_DIR}/bin
)

add_executable(testrunner2 test/secondTests.cpp)
add_dependencies(testrunner2 CppUTest)
target_link_libraries(testrunner2 PRIVATE  CppUTest)
set_target_properties(testrunner2 PROPERTIES
                      RUNTIME_OUTPUT_DIRECTORY_DEBUG ${CMAKE_SOURCE_DIR}/bin/tests
                      RUNTIME_OUTPUT_DIRECTORY_RELEASE ${CMAKE_SOURCE_DIR}/bin/tests
)