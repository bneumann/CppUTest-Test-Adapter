import { TestInfo } from "./TestInfo";

export interface TestSuiteInfo {
    type: string;
    id: string;
    label: string;
    children: (TestInfo | TestSuiteInfo)[];
    executable: string | undefined;
}
