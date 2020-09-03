#include "CppUTest/TestHarness_c.h"
#include "CppUTest/CommandLineTestRunner.h"

TEST_GROUP(Specials)
{
};

TEST_GROUP(SecondClass)
{
};

TEST_GROUP(ClassName)
{
};


TEST(Specials, AnotherStuff)
{
  CHECK_TEXT(true, "This is failing");
}

TEST(Specials, Crash)
{
  //*(int*)0=0;
}

IGNORE_TEST(SecondClass, ShouldBeIgnored)
{
  CHECK_TEXT(false, "This is failing");
}

IGNORE_TEST(SecondClass, ShouldAlsoBeIgnored)
{
  CHECK_TEXT(false, "This is failing");
}
TEST(SecondClass, ShouldBeNew)
{
  CHECK_TEXT(true, "This is passing");
}

TEST(SecondClass, ShouldFail)
{
  CHECK_TEXT(false, "This is failing");
}

TEST(SecondClass, ShouldPass)
{
  CHECK_TEXT(true, "This is passing");
}

TEST(ClassName, ShouldPass)
{
  CHECK_TEXT(true, "passing");
}

TEST(ClassName, Create)
{
  CHECK_TEXT(false, "This is failing");
}

int main(int ac, char** av)
{
    return CommandLineTestRunner::RunAllTests(ac, av);
}