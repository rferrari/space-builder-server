import * as fs from 'fs';
import * as path from 'path';

const Reset = "\x1b[0m",
    Blue = "\x1b[34m",
    Green = "\x1b[32m",
    Red = "\x1b[31m",
    Yellow = "\x1b[33m",
    Magenta = "\x1b[35m",
    Italic = "\x1b[3m",
    Underscore = "\x1b[4m",
    Cyan = "\x1b[36m",
    Gray = "\x1b[90m";

interface LogOptions {
    folder: string;
    printconsole?: boolean;
    logtofile?: boolean;
    level?: string;
}

class FileLogger {
    private folder: string;
    private printconsole: boolean;
    private level: string;

    constructor(options: LogOptions) {
        this.folder = path.join(__dirname, '../../', options.folder);
        this.level = options.level || "warn";
        this.printconsole = (options.printconsole === true)

        this.createDirectoryIfNotExists(this.folder);
    }

    private createDirectoryIfNotExists(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    private getLogFile(logKey: string): string {
        const now = new Date();
        const logFile = `${now.getFullYear()}-${this.padZero(now.getMonth() + 1)}-${this.padZero(now.getDate())}-${this.padZero(now.getHours())}-${logKey}.log`;
        return path.join(this.folder, logFile);
    }

    private padZero(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }

    private getLogText(data: any): string {
        if (typeof data === 'string') {
          return data;
        } else if (typeof data === 'object') {
          return JSON.stringify(data, null, 4);
        } else {
          throw new Error('Unsupported log data type');
        }
      }

    private logtofile(message: any, logKey: string = ""): void {
        const logFile = this.getLogFile(logKey);
        if (this.logtofile)
            fs.appendFileSync(logFile, message + '\n');
    }

    private logtoconsole(message: any, color: any): void {
        if (this.printconsole) console.log(color + message + Reset)
    }

    public info(message: any, logKey: string = ""): void {
        const logmessage = this.getLogText(message);
        this.logtofile(logmessage);
        this.logtoconsole(logmessage, Green);
    }

    public error(message: any, logKey: string = ""): void {
        const logmessage = this.getLogText(message);
        this.logtofile(logmessage);
        this.logtoconsole(logmessage, Red);
    }

    public warn(message: any, logKey: string = ""): void {
        const logmessage = this.getLogText(message);
        this.logtofile(logmessage);
        this.logtoconsole(logmessage, Yellow);
    }

    public log(message: any, logKey: string = ""): void {
        const logmessage = this.getLogText(message);
        this.logtofile(logmessage, logKey);
        this.logtoconsole(logmessage, "");
    }


}

export default FileLogger;
