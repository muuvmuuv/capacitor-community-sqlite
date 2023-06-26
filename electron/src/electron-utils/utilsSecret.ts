import { GlobalSQLite } from '../GlobalSQLite';

import { UtilsFile } from './utilsFile';
import { UtilsSQLite } from './utilsSQLite';


export class UtilsSecret {
    private globalUtil: GlobalSQLite = new GlobalSQLite();
    private sqliteUtil: UtilsSQLite = new UtilsSQLite();
    private fileUtil: UtilsFile = new UtilsFile();
    private storage = require('electron-json-storage');

    public isSecretStored(): boolean {
        const secret = this.getPassphrase();

        if(secret.length <=0 ) return false;
        return true;
    }
    public setEncryptSecret(passphrase: string): void {
        try {
            let oldpassphrase = this.getPassphrase();
            console.log(`>>>> setEncryptSecret oldpassphrase: ${oldpassphrase}`)
            if(oldpassphrase.length > 0 ) {
                throw new Error(`setEncryptSecret: passphrase already stored`);
            } else {
                oldpassphrase = this.globalUtil != null ? this.globalUtil.secret : "";
                if(oldpassphrase.length <= 0 ) {
                    throw new Error(`setEncryptSecret: globalUtil is null`);
                }
                console.log(`>>>> setEncryptSecret oldpassphrase: ${oldpassphrase}, passphrase ${passphrase}`)
                // check if some databases were encrypted with the initial secret 'sqlite secret'
                this.changeDatabaseSecret(oldpassphrase, passphrase).then(() => {

                    this.storage.set('userData', {passphrase: passphrase},function (error:any) {
                        if(error) throw new Error(`setEncryptSecret: ${error.message}`);
                    });
                });
            }

        } catch (err) {
            throw new Error(`setEncryptSecret: ${err}`);
        }
      
    }
    public changeEncryptSecret(oldpassphrase: string, passphrase: string): void {
    
        try {
            // check if some databases were encrypted with the oldpassphrase
            this.changeDatabaseSecret(oldpassphrase, passphrase).then(() => {

                this.setPassphrase(passphrase);
            });
          
        } catch (err) {
            throw new Error(`changeEncryptSecret: ${err}`);
        }
    }
    public clearEncryptSecret(): void {
        try {
            let oldpassphrase = this.getPassphrase();
            if(oldpassphrase.length <= 0) {
                oldpassphrase = this.globalUtil.secret;
            }
           // check if some databases were encrypted with the oldpassphrase
            this.changeDatabaseSecret(oldpassphrase, "").then(() => {
                this.removePassphrase();
            });
        } catch (err) {
            throw new Error(`clearEncryptSecret: ${err}`);
        }
    }
    public checkEncryptSecret(passphrase: string): boolean {
        const storedPassphrase = this.getPassphrase();
        if(storedPassphrase.length <= 0) {
            throw new Error(`checkEncryptSecret: No passphrase stored`)
        }
        if(storedPassphrase === passphrase) {
            return true;
        } else {
            return false;
        }    
    }
    private async changeDatabaseSecret(oldpassphrase: string, newpassphrase: string): Promise<void> {
        try {
            console.log(`>>> changeDatabaseSecret oldpassphrase: ${oldpassphrase}`);
            console.log(`>>> changeDatabaseSecret newpassphrase: ${newpassphrase}`);
            // get the database folder
            const pathDatabase = this.fileUtil.getDatabasesPath();
            console.log(`>>> changeDatabaseSecret pathDatabase: ${pathDatabase}`);
            // get the list of databases
            const files: string[] = await this.fileUtil.getFileList(pathDatabase);
            console.log(`>>> changeDatabaseSecret files: ${files}`);
            files.forEach(dbName => {
                console.log(`>>> changeDatabaseSecret dbName: ${dbName}`);
                const filePath = this.fileUtil.getFilePath(dbName);
                console.log(`>>> changeDatabaseSecret filePath: ${filePath}`);
                const isEncrypt: boolean = this.sqliteUtil.isDBEncrypted(filePath);
                console.log(`>>> changeDatabaseSecret isEncrypt: ${isEncrypt}`);
                if(isEncrypt) {

                    this.sqliteUtil.changePassword(filePath, oldpassphrase, newpassphrase);
                }
            });
            return;
        } catch (err) {
            throw new Error(`changeDatabaseSecret: ${err}`);
        }
    }
    public getPassphrase(): string {
        const data = this.storage.getSync('userData');
        console.log(`>>>>>> data: `, data)
        const keys = Object.keys(data);
        if(data == null || keys.length <= 0) return "";
        if (Object.keys(data).includes('passphrase')) {
            return data.passphrase;
        } else {
            return "";
        }
    }
    public setPassphrase(passphrase: string): void {
        const data = this.storage.getSync('userData');
        data.passphrase = passphrase;
        console.log(`>>>>>> set data: `, data)
        this.storage.set('userData', data,function (error:any) {
            if(error) throw new Error(`setPassphrase: ${error.message}`);
        });
    }
    public removePassphrase(): void {
        const data = this.storage.getSync('userData');
        delete data.passphrase;
        console.log(`>>>>>> set data: `, data)
        this.storage.set('userData', data,function (error:any) {
            if(error) throw new Error(`removePassphrase: ${error.message}`);
        });
    }
}