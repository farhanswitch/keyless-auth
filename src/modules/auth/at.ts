//@ts-nocheck
//Local Modules
import UtilityAxios from '../../utility/axios';
import UtilityJWT from '../../utility/jwt';
import type {
  LoginKeycloakReturnType,
  LoginData,
  RegenerateToken,
  CurrentUserType,
} from './interfaces';
import KeycloakService from '../abstracts/keycloak.service.class';
import authRepository from './repositories';
import KeycloakException from '../../errors/KeycloakException';
import {
  unwrapExpect,
  possiblyUndefined,
  APIErrorType,
} from '../../utility/data-type';
import { CreateUserType } from '../user/interfaces';
import userService from '../user/services';

// import { CreateUserType } from "../user/interfaces";

// import NotFoundException from "../../errors/NotFound";

class AuthService extends KeycloakService {
  public async userSession(token: string | null) {
    try {
      if (token) {
        await this.getCurrentUser(token);
        let passwordNote: string =
          'Your password has expired and must be changed';
        const decodedToken: { [x: string]: any } = UtilityJWT.decode(token);
        const userID: number = unwrapExpect(
          possiblyUndefined(
            decodedToken?.['eform-user-id']
              ? +decodedToken?.['eform-user-id']
              : undefined,
          ),
          'This user has no eform user id',
        );
        const username: string | undefined =
          decodedToken?.['preferred_username'];
        // console.log(userID, username);
        if (typeof userID === 'number') {
          const { authenticatorKey, timestampPasswordUpdated } =
            await authRepository.getAdminDataForSession(userID);
          const passwordLastUpdate = new Date(
            timestampPasswordUpdated,
          ).getTime();
          // console.log({timestampPasswordUpdated})
          const dayDiff: number =
            14 - (Date.now() - passwordLastUpdate) / (24 * 60 * 60 * 1000);
          if (Math.floor(dayDiff) <= 14 && Math.floor(dayDiff) >= 0) {
            passwordNote = `Your password will be expired in ${
              dayDiff === 0 ? 'less than 24 hours ' : Math.floor(dayDiff)
            } days.`;
          }
          // console.log(authenticatorKey,passwordLastUpdate, dayDiff, passwordNote)
          return {
            isLoggedIn: !!token,
            username,
            tfa: {
              isVerified: !!token,
              isActivated: !!authenticatorKey,
            },
            passwordNote,
          };
        }
      }
      return {
        isLoggedIn: false,
      };
    } catch (error: unknown) {
      if ((error as APIErrorType)?.response?.data)
        throw new KeycloakException(
          (error as Required<APIErrorType>).response.status,
          { data: (error as Required<APIErrorType>).response.data },
        );
      throw error;
    }
  }
  public async getCurrentUser(token: string): Promise<CurrentUserType> {
    try {
      return (await UtilityAxios.getFromKeycloak(
        `/admin/${this.realmName}/console/whoami`,
        this.generateHeaderWithBearer(token),
      )) as CurrentUserType;
    } catch (error: unknown) {
      if ((error as APIErrorType)?.response?.data)
        throw (error as Required<APIErrorType>).response.data;
      throw error;
    }
  }
  public async loginService(data: LoginData): Promise<LoginKeycloakReturnType> {
    try {
      return (await UtilityAxios.postToKeycloak(
        `/realms/${this.realmName}/protocol/openid-connect/token`,
        data,
        this.generateHeaderContentType('application/x-www-form-urlencoded'),
      )) as LoginKeycloakReturnType;
    } catch (err: unknown) {
      if ((err as APIErrorType)?.response?.data)
        throw new KeycloakException(
          (err as Required<APIErrorType>).response.status,
          { data: (err as Required<APIErrorType>).response.data },
        );
      throw err;
    }
  }
  public async registerService(data: CreateUserType) {
    try {
      const { access_token } = await this.loginService({
        client_id: this.clientID,
        client_secret: this.clientSecret,
        username: process.env.REGISTRAR_USER as string,
        password: process.env.REGISTRAR_PASS as string,
        grant_type: 'password',
      });
      await userService.createUser(data, access_token);
    } catch (error) {
      if ((error as APIErrorType)?.response?.data)
        throw new KeycloakException(
          (error as Required<APIErrorType>).response.status,
          { data: (error as Required<APIErrorType>).response.data },
        );
      throw error;
    }
  }
  public async refreshService(
    data: RegenerateToken,
  ): Promise<LoginKeycloakReturnType> {
    try {
      return (await UtilityAxios.postToKeycloak(
        `/realms/${this.realmName}/protocol/openid-connect/token`,
        data,
        this.generateHeaderContentType('application/x-www-form-urlencoded'),
      )) as LoginKeycloakReturnType;
    } catch (err: unknown) {
      if ((err as APIErrorType)?.response?.data)
        throw new KeycloakException(
          (err as Required<APIErrorType>).response.status,
          { data: (err as Required<APIErrorType>).response.data },
        );
      throw err;
    }
  }
  public async validateAccess(
    url: string,
    token: string,
  ): Promise<{ result: true } | { error: string; error_description: string }> {
    // throw new NotFoundException({ message: `URL ${url} is not valid` });
    return (await UtilityAxios.postToKeycloak(
      `/realms/${this.realmName}/protocol/openid-connect/token`,
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
        permission: url,
        audience: `${this.clientID}`,
        response_mode: 'decision',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer ' + token,
        },
      },
    )) as { result: true } | { error: string; error_description: string };
  }
  async removeSession(token: string): Promise<void> {
    try {
      await UtilityAxios.postToKeycloak(
        `/realms/${this.realmName}/protocol/openid-connect/logout`,
        {
          client_id: this.clientID,
          refresh_token: token,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Bearer ' + token,
          },
        },
      );
    } catch (error: unknown) {
      if ((error as APIErrorType)?.response?.data)
        throw new KeycloakException(
          (error as Required<APIErrorType>).response.status,
          { data: (error as Required<APIErrorType>).response.data },
        );
      throw error;
    }
  }
  public async revokeToken(token: string): Promise<void> {
    try {
      await UtilityAxios.postToKeycloak(
        `/realms/${this.realmName}/protocol/openid-connect/revoke`,
        {
          client_id: this.clientID,
          client_secret: this.clientSecret,
          token: token,
        },
        this.generateHeaderContentType('application/x-www-form-urlencoded'),
      );
    } catch (error: unknown) {
      if ((error as APIErrorType)?.response?.data)
        throw new KeycloakException(
          (error as Required<APIErrorType>).response.status,
          { data: (error as Required<APIErrorType>).response.data },
        );
      throw error;
    }
  }
}

export default new AuthService();
