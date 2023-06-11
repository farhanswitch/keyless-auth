import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AesService } from 'src/helpers/aes/services/aes.service';
import { KeycloakService } from 'src/abstracts/keycloak.service.abstract';
import type { LoginDto } from '../dto/login.dto';
import type { KeycloakLoginResponse } from '../interfaces/auth.interface';
import axios from 'axios';

@Injectable()
export class AuthService extends KeycloakService {
  private readonly logger = new Logger(AesService.name);
  constructor(private readonly aes: AesService) {
    super();
  }

  public async loginService(param: LoginDto): Promise<KeycloakLoginResponse> {
    param.password = this.aes.decrypt(param.password);
    try {
      console.log({ realms: this.REALM_NAME });

      return (
        await axios.post(
          `${this.KEYCLOAK_SERVICE}/realms/${this.REALM_NAME}/protocol/openid-connect/token`,
          {
            username: param.username,
            password: param.password,
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
            grant_type: 'password',
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
      )?.data;
    } catch (error) {
      this.loggingError(error, this.loginService.name);
      throw error;
    }
  }
  async getResourceTypeFromURL(param: string) {
    try {
      const token = (
        await axios.post(
          `${this.KEYCLOAK_SERVICE}/realms/${this.REALM_NAME}/protocol/openid-connect/token`,
          {
            grant_type: 'client_credentials',
            client_id: this.CLIENT_ID,
            client_secret: this.CLIENT_SECRET,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
      )?.data?.access_token;
      const resourceId = (
        await axios.get(
          `${this.KEYCLOAK_SERVICE}/realms/${this.REALM_NAME}/authz/protection/resource_set?uri=${param}&matchingUri=true`,
          {
            headers: {
              Authorization: `bearer ${token}`,
            },
          },
        )
      )?.data?.[0];
      return {
        resourceId,
      };
    } catch (error) {
      this.loggingError(error, this.getResourceTypeFromURL.name);
      throw error;
    }
  }
  public async validateAccess(token: string, path: string) {
    try {
      const resourceId = await this.getResourceTypeFromURL(path);
      await axios.post(
        `${this.KEYCLOAK_SERVICE}/realms/${this.REALM_NAME}/protocol/openid-connect/token`,
        {
          grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
          permission: resourceId,
          audience: this.CLIENT_ID,
          response_mode: 'decision',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return {
        success: true,
      };
    } catch (error) {
      console.log({ error });

      this.loggingError(error, this.validateAccess.name);
      throw error;
      return {
        statusCode: HttpStatus.FORBIDDEN,
        details: {
          message: 'Access denied!',
        },
      };
    }
  }
  public async refreshAccess(param: string): Promise<KeycloakLoginResponse> {
    try {
      return (
        await axios.post(
          `${this.KEYCLOAK_SERVICE}/realms/${this.REALM_NAME}/protocol/openid-connect/token`,
          {
            client_secret: this.CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: param,
            client_id: this.CLIENT_ID,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        )
      )?.data;
    } catch (error) {
      throw error;
    }
  }
  public encryptData(param: string) {
    return this.aes.encrypt(param);
  }
  public decryptData(param: string) {
    return this.aes.decrypt(param);
  }
  private loggingError<T>(err: T, context: string) {
    this.logger.error((err as Error)?.message ?? err, '', context);
  }
}
