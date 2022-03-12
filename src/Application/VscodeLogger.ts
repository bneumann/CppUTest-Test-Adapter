import { Logger } from '../Domain/Logger';

export class VscodeLogger {

    public static Instance = this.instance ?? (this.instance = new VscodeLogger());
    private static instance?: VscodeLogger;
    private internalLog!: Logger;

    public SetLogger(logger: Logger) {
        this.internalLog = logger;
    }

    public info(message: string): void {
        this.internalLog?.appendLine(message);
        this.internalLog?.show();
    }

    public error(message: string) {
        this.internalLog?.appendLine(`ERROR >> ${message}`);
        this.internalLog?.show();
    }
}
