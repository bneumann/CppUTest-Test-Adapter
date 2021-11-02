export interface ProcessExecuter {
    Exec: Function;
    ExecFile: Function;
    KillProcess: Function;
    RegisterWatchFile(cmd: string): void;
    OnFileChange: () => void;
}
