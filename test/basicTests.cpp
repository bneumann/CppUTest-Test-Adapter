#include "CppUTest/TestHarness_c.h"
#include "CppUTest/CommandLineTestRunner.h"

TEST_GROUP(SecondClass)
{
};

IGNORE_TEST(SecondClass, ShouldBeIgnored)
{
  CHECK_TEXT(false, "This is failing");
}

int main(int ac, char** av)
{
    return CommandLineTestRunner::RunAllTests(ac, av);
}