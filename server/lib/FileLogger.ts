import * as fs from 'fs';
import * as path from 'path';

const Green = "\x1b[32m",
Reset = "\x1b[0m";

interface LogOptions {
    folder: string;
    printconsole?: boolean;
    // logType: string;
}

class FileLogger {
    private folder: string;
    private printconsole: boolean;
    // private logType: string;

    constructor(options: LogOptions) {
        this.folder = path.join(__dirname, '../../', options.folder);
        // this.logType = options.logType;
        this.createDirectoryIfNotExists(this.folder);
        
        this.printconsole = (options.printconsole === true)
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

    public log(message: any, logKey: string): void {
        const logFile = this.getLogFile(logKey);
        const logmessage = this.getLogText(message);
        fs.appendFileSync(logFile, logmessage + '\n');
        if(this.printconsole)
            console.log(Green + logmessage + Reset)
    }
}

export default FileLogger;