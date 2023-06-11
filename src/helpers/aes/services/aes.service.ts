import { Injectable } from '@nestjs/common';
import { AES, enc } from 'crypto-js';

@Injectable()
export class AesService {
  private secretPhrase: string = process.env.SECRET_AES;

  encrypt(val: string): string {
    return AES.encrypt(val, this.secretPhrase).toString();
  }
  decrypt(val: string): string {
    return AES.decrypt(val, this.secretPhrase).toString(enc.Utf8);
  }
}
