#include "CppUTest/TestHarness_c.h"
#include "CppUTest/CommandLineTestRunner.h"

TEST_GROUP(OtherTests)
{
};

TEST(OtherTests, AnotherStuff)
{
  CHECK_TEXT(true, "This is failing");
}

IGNORE_TEST(OtherTests, ShouldBeIgnored)
{
  CHECK_TEXT(false, "This is failing");
}

IGNORE_TEST(OtherTests, ShouldAlsoBeIgnored)
{
  CHECK_TEXT(false, "This is failing");
}

TEST(OtherTests, ShouldFail)
{
  CHECK_TEXT(false, "This is failing");
}

TEST(OtherTests, ShouldPass)
{
  CHECK_TEXT(true, "This is passing");
}

int main(int ac, char** av)
{
    return CommandLineTestRunner::RunAllTests(ac, av);
}